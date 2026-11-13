import { expect, test } from '@playwright/test';
import { adminClient, loginAsTestUser } from './helpers';

const run = Date.now().toString(36);

async function seedFood(userId: string, name: string, per100: { kcal: number; protein_g: number; carb_g: number; fat_g: number }, portions: { label: string; grams: number }[] = []) {
  const admin = adminClient();
  const { data, error } = await admin.from('foods').insert({ user_id: userId, name, source: 'estimate', is_estimate: true, ...per100 }).select('id').single();
  if (error) throw error;
  for (const p of portions) await admin.from('food_portions').insert({ user_id: userId, food_id: data.id, ...p });
  return data.id as string;
}

test('create a food from its label', async ({ page }) => {
  await loginAsTestUser(page);
  await page.goto('/makanan/baru');
  await page.getByRole('button', { name: 'Dari label' }).click();
  await page.getByLabel('Nama makanan').fill(`Whey Test ${run}`);
  await page.getByLabel('Ukuran sajian (g)').fill('30');
  await page.getByLabel('Kalori (kkal)').fill('120');
  await page.getByLabel('Protein (g)').fill('24');
  await page.getByLabel('Karbo (g)').fill('3');
  await page.getByLabel('Lemak (g)').fill('1,5');
  await page.getByRole('button', { name: 'Simpan makanan' }).click();
  await expect(page.getByRole('heading', { name: `Whey Test ${run}` })).toBeVisible();
  await expect(page.getByText('400 kkal / 100 g')).toBeVisible();
});

test('build a recipe from ingredients', async ({ page }) => {
  const userId = await loginAsTestUser(page);
  await seedFood(userId, `Nasi e2e ${run}`, { kcal: 130, protein_g: 2.7, carb_g: 28, fat_g: 0.3 });
  await seedFood(userId, `Ayam e2e ${run}`, { kcal: 262, protein_g: 26.8, carb_g: 3.2, fat_g: 15 });
  await page.goto('/makanan/baru');
  await page.getByRole('button', { name: 'Rakit resep' }).click();
  await page.getByLabel('Nama makanan').fill(`Nasi ayam test ${run}`);
  for (const [q, g] of [[`Nasi e2e ${run}`, '150'], [`Ayam e2e ${run}`, '90']] as const) {
    await page.getByLabel('Cari bahan').fill(q);
    await page.getByRole('button', { name: `Tambah ${q}` }).click();
    await page.getByLabel(`Gram ${q}`).fill(g);
  }
  // 150 g × 1,30 + 90 g × 2,62 = 195 + 235,8 = 430,8 kkal
  await expect(page.getByTestId('recipe-total-kcal')).toHaveText('431 kkal');
  await page.getByLabel('Nama porsi untuk 1 resep').fill('1 piring');
  await page.getByRole('button', { name: 'Simpan makanan' }).click();
  await expect(page.getByRole('heading', { name: `Nasi ayam test ${run}` })).toBeVisible();
  await expect(page.getByText('1 piring · 240 g')).toBeVisible();
});

test('quick estimate is marked in the list', async ({ page }) => {
  await loginAsTestUser(page);
  await page.goto('/makanan/baru');
  await page.getByRole('button', { name: 'Estimasi cepat' }).click();
  await page.getByLabel('Nama makanan').fill(`Estimasi ${run}`);
  await page.getByLabel('Kalori (kkal)').fill('300');
  await page.getByLabel('Protein (g)').fill('10');
  await page.getByLabel('Karbo (g)').fill('40');
  await page.getByLabel('Lemak (g)').fill('10');
  await page.getByRole('button', { name: 'Simpan makanan' }).click();
  await page.goto('/makanan');
  await page.getByLabel('Cari makanan').fill(`Estimasi ${run}`);
  const row = page.getByRole('link', { name: new RegExp(`Estimasi ${run}`) });
  await expect(row).toBeVisible();
  await expect(row.getByText('Estimasi', { exact: true })).toBeVisible();
});

test('calibrate a portion', async ({ page }) => {
  const userId = await loginAsTestUser(page);
  const id = await seedFood(userId, `Nasi kalibrasi ${run}`, { kcal: 130, protein_g: 2.7, carb_g: 28, fat_g: 0.3 }, [{ label: '1 centong', grams: 100 }]);
  await page.goto(`/makanan/${id}`);
  await page.getByLabel('Gram untuk 1 centong').fill('130');
  await page.getByLabel('Sudah ditimbang: 1 centong').check();
  await page.getByRole('button', { name: 'Simpan porsi 1 centong' }).click();
  await expect(page.getByText('1 centong · 130 g · ditimbang')).toBeVisible();
});
