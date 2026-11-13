import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { adminClient, loginAsTestUser, resetDailyData, todayWib } from './helpers';

let userId: string;
test.beforeEach(async ({ page }) => {
  userId = await loginAsTestUser(page);
  await resetDailyData(userId);
  await adminClient().from('body_scans').delete().eq('user_id', userId);
  await adminClient().from('profile').update({ haptics_enabled: null }).eq('user_id', userId);
});

async function seedWeight(kg: number) {
  const d = todayWib(-1);
  await adminClient().from('weight_entries').insert({ user_id: userId, client_id: randomUUID(), date: d, measured_at: `${d}T00:00:00Z`, weight_kg: kg });
}

test('slider and buttons move in 0,1 kg steps', async ({ page }) => {
  await seedWeight(61.8);
  await page.goto('/tubuh/timbang');
  const value = page.getByTestId('weight-value');
  await expect(value).toHaveText('61,8');
  const slider = page.getByRole('slider', { name: 'Berat badan dalam kilogram' });
  await slider.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(value).toHaveText('62,0');
  await expect(page.getByText('+0,2 kg dari tren 61,8')).toBeVisible();
  await page.getByRole('button', { name: 'Kurangi 0,1 kilogram' }).click();
  await expect(value).toHaveText('61,9');
});

test('a far weight warns but can still be saved', async ({ page }) => {
  await seedWeight(61.8);
  await page.goto('/tubuh/timbang');
  const slider = page.getByRole('slider', { name: 'Berat badan dalam kilogram' });
  await slider.focus();
  for (let i = 0; i < 22; i++) await page.keyboard.press('ArrowRight'); // 61,8 → 64,0
  await expect(page.getByText('Beda lebih dari 3% dari tren. Yakin angkanya benar?')).toBeVisible();
  await page.getByRole('button', { name: /^Simpan 64,0 kg$/ }).click();
  await expect(page).toHaveURL(/\/$/);
  const { data } = await adminClient().from('weight_entries').select('weight_kg').eq('user_id', userId).eq('date', todayWib());
  expect(data!.map((r) => Number(r.weight_kg))).toEqual([64]);
});

test('reduced motion turns the vibration switch off by default', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/profil');
  await expect(page.getByRole('switch', { name: 'Getar saat menggeser' })).toHaveAttribute('aria-checked', 'false');
});

test('scan form blocks impossible values and accepts decimal commas (Review Focus 2)', async ({ page }) => {
  await page.goto('/tubuh/scan');
  const labels = await page.locator('form label .label').allInnerTexts();
  expect(labels.indexOf('Tanggal')).toBeLessThan(labels.indexOf('Otot lengan kanan'));
  expect(labels.indexOf('Otot lengan kanan')).toBeLessThan(labels.indexOf('Berat (kg)'));
  for (const [l, v] of [['Berat (kg)', '61,8'], ['Fat mass (kg)', '9,2'], ['% lemak', '92'], ['% otot', '80,6'], ['% lainnya', '4,5']]) {
    await page.getByLabel(l, { exact: true }).fill(v);
  }
  await expect(page.getByText('% lemak harus 3 sampai 60.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Simpan scan' })).toBeDisabled();
  await page.getByLabel('% lemak', { exact: true }).fill('14,9');
  await expect(page.getByText('Komposisi total 100,0%')).toBeVisible();
  await page.getByRole('button', { name: 'Simpan scan' }).click();
  await expect(page).toHaveURL(/\/progres$/);
  const { data } = await adminClient().from('body_scans').select('bf_pct, weight_kg').eq('user_id', userId);
  expect(data!.map((r) => [Number(r.bf_pct), Number(r.weight_kg)])).toEqual([[14.9, 61.8]]);
});

test('the report photo is previewed locally and never uploaded', async ({ page }) => {
  const uploads: string[] = [];
  page.on('request', (r) => {
    const ct = r.headers()['content-type'] ?? '';
    if (r.method() !== 'GET' && (ct.includes('multipart') || ct.startsWith('image/') || (r.postData() ?? '').includes('PNG'))) uploads.push(r.url());
  });
  await page.goto('/tubuh/scan');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');
  await page.getByLabel('Pilih foto').setInputFiles({ name: 'scan.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByRole('img', { name: 'Foto laporan scan' })).toBeVisible();
  expect(uploads).toEqual([]);
});
