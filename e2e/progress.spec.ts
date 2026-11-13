import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { adminClient, loginAsTestUser, resetDailyData, seedFood, todayWib } from './helpers';

test.describe.configure({ mode: 'serial' });

async function seed(userId: string, daysOfData: number) {
  const admin = adminClient();
  await resetDailyData(userId);
  for (const t of ['body_scans', 'goals'] as const) await admin.from(t).delete().eq('user_id', userId);
  const start = todayWib(-(daysOfData - 1));
  await admin.from('goals').insert({ user_id: userId, type: 'bulk', start_date: todayWib(-40), rate_pct_per_week: 0.3, target_weight_kg: 65, target_bf_pct: 16 });
  await admin.from('targets').insert({ user_id: userId, effective_from: todayWib(-60), kcal: 2540, protein_g: 111, carb_g: 365, fat_g: 71, fiber_g: 36, water_ml: 2150, added_sugar_max_g: 64, sodium_max_mg: 2000, satfat_max_g: 28 });
  const food = await seedFood(userId, `Progres ${randomUUID().slice(0, 6)}`, { kcal: 100, protein_g: 4, carb_g: 15, fat_g: 3, fiber_g: 1 });
  const weights = [];
  const entries = [];
  for (let i = 0; i < daysOfData; i++) {
    const d = todayWib(-(daysOfData - 1 - i));
    weights.push({ user_id: userId, client_id: randomUUID(), date: d, measured_at: `${d}T00:00:00Z`, weight_kg: Math.round((61.8 + 0.03 * i) * 100) / 100 });
    for (const slot of ['breakfast', 'lunch']) {
      entries.push({ user_id: userId, client_id: randomUUID(), date: d, meal_slot: slot, logged_at: `${d}T05:00:00Z`, food_id: food, grams: 1250, kcal: 1250, protein_g: 55, carb_g: 150, fat_g: 40, fiber_g: 10 });
    }
  }
  await admin.from('weight_entries').insert(weights);
  await admin.from('food_entries').insert(entries);
  return start;
}

test('progress shows rate, projections, the scan period and actual TDEE', async ({ page }) => {
  const userId = await loginAsTestUser(page);
  const start = await seed(userId, 30);
  const admin = adminClient();
  await admin.from('body_scans').insert([
    { user_id: userId, scanned_at: `${start}T00:30:00Z`, weight_kg: 61.8, fat_mass_kg: 9.2, bf_pct: 14.9 },
    { user_id: userId, scanned_at: `${todayWib(-1)}T00:30:00Z`, weight_kg: 62.6, fat_mass_kg: 9.4, bf_pct: 15.0 },
  ]);
  await page.goto('/progres');
  const rate = page.getByRole('region', { name: 'Laju mingguan' });
  await expect(rate.getByText(/\+0,[12]\d kg\/minggu/)).toBeVisible();
  await expect(rate.getByText(/Dalam rentang lean bulk/)).toBeVisible();
  await expect(page.getByRole('region', { name: 'Proyeksi' }).getByText('Butuh 1 scan lagi')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Periode antar scan' }).getByText('Perubahan lean mass masih di bawah margin error alat')).toBeVisible();
  await expect(page.getByRole('region', { name: 'TDEE aktual' }).getByText(/kkal/)).toBeVisible();
});

test('with only 10 days of weigh-ins the weight projection asks for more', async ({ page }) => {
  const userId = await loginAsTestUser(page);
  await seed(userId, 10);
  await page.goto('/progres');
  await expect(page.getByRole('region', { name: 'Proyeksi' }).getByText('Butuh 5 hari timbangan lagi')).toBeVisible();
});
