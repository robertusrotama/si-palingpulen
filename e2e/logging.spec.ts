import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { adminClient, loginAsTestUser, resetDailyData, seedFood, todayWib } from './helpers';

const run = Date.now().toString(36);
let userId: string;

test.beforeEach(async ({ page }) => {
  userId = await loginAsTestUser(page);
  await resetDailyData(userId);
});

async function todayKcal(page: Page) {
  await page.goto('/');
  return Number((await page.getByTestId('today-kcal').innerText()).replace(/\./g, ''));
}

async function setClock(page: Page, hhmm: string) {
  await page.clock.setFixedTime(new Date(`${todayWib()}T${hhmm}:00+07:00`));
}

test('log a favorite in at most 5 taps', async ({ page }) => {
  await seedFood(userId, `Nasi ayam test ${run}`, { kcal: 180, protein_g: 12, carb_g: 18, fat_g: 6 }, { portions: [{ label: '1 piring', grams: 240 }], favorite: true });
  const before = await todayKcal(page);
  let taps = 0;
  const tap = async (l: ReturnType<Page['getByRole']>) => { taps++; await l.click(); };
  await tap(page.getByRole('navigation', { name: 'Navigasi utama' }).getByRole('link', { name: 'Catat' }));
  await tap(page.getByRole('button', { name: `Pilih Nasi ayam test ${run}` }));
  await tap(page.getByRole('button', { name: /^1 piring, 240 g/ }));
  await tap(page.getByRole('button', { name: 'Tambahkan' }));
  await tap(page.getByRole('button', { name: 'Simpan', exact: true }));
  await expect(page).toHaveURL(/\/(\?.*)?$/);
  expect(taps).toBeLessThanOrEqual(5);
  await expect.poll(async () => Number((await page.getByTestId('today-kcal').innerText()).replace(/\./g, ''))).toBe(before + 432);
});

test('repeat yesterday lunch', async ({ page }) => {
  const a = await seedFood(userId, `Nasi kemarin ${run}`, { kcal: 130, protein_g: 3, carb_g: 28, fat_g: 0.3 });
  const b = await seedFood(userId, `Geprek kemarin ${run}`, { kcal: 329, protein_g: 12, carb_g: 24, fat_g: 20 });
  const y = todayWib(-1);
  const base = { user_id: userId, date: y, meal_slot: 'lunch', logged_at: `${y}T05:15:00Z`, protein_g: 1, carb_g: 1, fat_g: 1 };
  await adminClient().from('food_entries').insert([
    { ...base, client_id: randomUUID(), food_id: a, grams: 195, portion_label: '1½ centong', kcal: 253.5 },
    { ...base, client_id: randomUUID(), food_id: b, grams: 150, kcal: 493.5 },
  ]);
  await setClock(page, '12:30');
  await page.goto('/catat');
  const card = page.getByRole('region', { name: 'Makan siang kemarin' });
  await expect(card.getByText(`Nasi kemarin ${run}`)).toBeVisible();
  await expect(card.getByText('1½ centong')).toBeVisible();
  await expect(card.getByText(/747 kkal/)).toBeVisible();
  await card.getByRole('button', { name: 'Ulangi 2 item' }).click();
  await expect(page).toHaveURL(/\/(\?.*)?$/);
  await expect(page.getByText(`Geprek kemarin ${run}`)).toBeVisible();
});

test('delete then undo', async ({ page }) => {
  const f = await seedFood(userId, `Hapus ${run}`, { kcal: 100, protein_g: 1, carb_g: 1, fat_g: 1 });
  const d = todayWib();
  await adminClient().from('food_entries').insert({ user_id: userId, client_id: randomUUID(), date: d, meal_slot: 'breakfast', logged_at: new Date().toISOString(), food_id: f, grams: 100, kcal: 100, protein_g: 1, carb_g: 1, fat_g: 1 });
  await page.goto('/');
  await page.getByRole('button', { name: `Hapus ${run}`, exact: false }).first().click();
  const meals = page.getByRole('region', { name: 'Makan hari ini' });
  await expect(meals.getByText(`Hapus ${run}`, { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Urungkan' }).click();
  await expect(meals.getByText(`Hapus ${run}`, { exact: true })).toBeVisible();
});

test('add 250 ml of water', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '+250 ml' }).click();
  await expect(page.getByTestId('water-total')).toContainText('250');
});

test('search tolerates a typo', async ({ page }) => {
  await seedFood(userId, `Ayam geprek ${run}`, { kcal: 329, protein_g: 12, carb_g: 24, fat_g: 20 });
  await page.goto('/catat');
  await page.getByLabel('Cari makanan').fill('gepre');
  await expect(page.getByRole('button', { name: `Pilih Ayam geprek ${run}` })).toBeVisible();
});

test('meal slot follows the clock', async ({ page }) => {
  await setClock(page, '15:30');
  await page.goto('/catat');
  await expect(page.getByRole('button', { name: 'Snack', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test("'Lainnya' with a name gets its own card", async ({ page }) => {
  await seedFood(userId, `Roti malam ${run}`, { kcal: 250, protein_g: 8, carb_g: 45, fat_g: 4 }, { favorite: true });
  await page.goto('/catat');
  await page.getByRole('button', { name: 'Lainnya', exact: true }).click();
  await page.getByLabel('Nama (opsional)').fill('Larut malam');
  await page.getByRole('button', { name: `Pilih Roti malam ${run}` }).click();
  await page.getByLabel('Berat (g)').fill('100');
  await page.getByRole('button', { name: 'Tambahkan' }).click();
  await page.getByRole('button', { name: 'Simpan', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Larut malam' })).toBeVisible();
});

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false });
  test('meal list sits beside the calorie dial', async ({ page }) => {
    await page.goto('/');
    const dial = await page.getByRole('region', { name: 'Kalori' }).boundingBox();
    const meals = await page.getByRole('region', { name: 'Makan hari ini' }).boundingBox();
    expect(meals!.x).toBeGreaterThan(dial!.x + dial!.width - 1);
  });
});
