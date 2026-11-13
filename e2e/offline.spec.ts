import { expect, test } from '@playwright/test';
import { adminClient, loginAsTestUser, resetDailyData, seedFood, todayWib } from './helpers';

const run = Date.now().toString(36);

test('an entry logged offline is sent exactly once when back online (Review Focus 3)', async ({ page, context }) => {
  const userId = await loginAsTestUser(page);
  await resetDailyData(userId);
  const food = await seedFood(userId, `Offline ${run}`, { kcal: 100, protein_g: 5, carb_g: 10, fat_g: 3 }, { favorite: true });
  await page.goto('/catat');
  await page.getByRole('button', { name: `Pilih Offline ${run}` }).click();
  await page.getByLabel('Berat (g)').fill('100');
  await page.getByRole('button', { name: 'Tambahkan' }).click();

  await context.setOffline(true);
  await page.getByRole('button', { name: 'Simpan', exact: true }).click();
  await expect(page.getByText('1 entri menunggu terkirim')).toBeVisible();

  await context.setOffline(false);
  await page.evaluate(() => { window.dispatchEvent(new Event('online')); window.dispatchEvent(new Event('online')); });
  await expect(page.getByText(/menunggu terkirim/)).toHaveCount(0, { timeout: 15000 });

  const { data } = await adminClient().from('food_entries').select('id').eq('user_id', userId).eq('food_id', food).eq('date', todayWib());
  expect(data).toHaveLength(1);
  await page.goto('/');
  await expect(page.getByRole('region', { name: 'Makan hari ini' }).getByText(`Offline ${run}`, { exact: true })).toHaveCount(1);
});

test('water added offline is queued too', async ({ page, context }) => {
  const userId = await loginAsTestUser(page);
  await resetDailyData(userId);
  await page.goto('/');
  await context.setOffline(true);
  await page.getByRole('button', { name: '+250 ml' }).click();
  await expect(page.getByText('1 entri menunggu terkirim')).toBeVisible();
  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(page.getByText(/menunggu terkirim/)).toHaveCount(0, { timeout: 15000 });
  const { data } = await adminClient().from('water_entries').select('ml').eq('user_id', userId);
  expect(data).toHaveLength(1);
});
