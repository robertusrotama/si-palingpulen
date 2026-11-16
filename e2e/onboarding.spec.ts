import { expect, test } from '@playwright/test';
import { adminClient, loginAsTestUser, resetAllData } from './helpers';

test.describe.configure({ mode: 'serial' });

test('a new user goes through onboarding and gets the spec targets', async ({ page }) => {
  const userId = await loginAsTestUser(page);
  await resetAllData(userId);
  await page.goto('/');
  await expect(page).toHaveURL(/\/onboarding$/);
  const next = page.getByRole('button', { name: 'Lanjut' });

  await expect(next).toBeDisabled();
  await page.getByRole('radio', { name: 'Pria' }).click();
  await next.click();

  await page.getByRole('listbox', { name: 'Bulan' }).getByRole('option', { name: 'Mei' }).click();
  await expect(page.getByRole('listbox', { name: 'Bulan' }).getByRole('option', { name: 'Mei' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('listbox', { name: 'Tahun' }).getByRole('option', { name: '2000' })).toHaveAttribute('aria-selected', 'true');
  await next.click();

  await page.getByRole('slider', { name: 'Tinggi badan dalam sentimeter' }).fill('165');
  await next.click();
  await page.getByRole('slider', { name: 'Berat badan dalam kilogram' }).fill('61.8');
  await expect(page.getByTestId('ob-value')).toHaveText('61,8');
  await next.click();

  await page.getByRole('radio', { name: /Sedang/ }).click();
  await next.click();
  await page.getByRole('radio', { name: /Bulking/ }).click();
  await next.click();

  await page.getByRole('button', { name: 'Lewati' }).click();
  await page.getByRole('slider', { name: 'Persen lemak tubuh' }).fill('14.9');
  await page.getByRole('button', { name: 'Hitung target' }).click();

  await expect(page.getByText('BMR 1.506 × 1,55 + 204')).toBeVisible();
  await expect(page.getByTestId('target-kcal')).toHaveValue('2540');
  await page.getByRole('button', { name: 'Simpan target' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('dari 2.540 kkal')).toBeVisible();
});

test('maintain skips the target step and back keeps earlier answers', async ({ page }) => {
  const userId = await loginAsTestUser(page);
  await resetAllData(userId);
  await page.goto('/onboarding');
  const next = page.getByRole('button', { name: 'Lanjut' });
  const progress = page.getByRole('progressbar', { name: 'Progres onboarding' });

  await page.getByRole('radio', { name: 'Wanita' }).click();
  await next.click();
  await next.click();
  await page.getByRole('slider', { name: 'Tinggi badan dalam sentimeter' }).fill('170');
  await next.click();
  await page.getByRole('button', { name: 'Kembali' }).click();
  await expect(page.getByRole('slider', { name: 'Tinggi badan dalam sentimeter' })).toHaveValue('170');
  await next.click();
  await next.click();
  await next.click();

  await page.getByRole('radio', { name: /Maintain/ }).click();
  await expect(progress).toHaveAttribute('aria-valuemax', '7');
  await next.click();
  await expect(page.getByRole('heading', { name: '% lemak tubuh dari scan?' })).toBeVisible();
  await page.getByRole('button', { name: 'Belum punya, lewati' }).click();
  await expect(page.getByRole('heading', { name: 'Target harian kamu' })).toBeVisible();

  const { data } = await adminClient().from('goals').select('type, target_weight_kg').eq('user_id', userId).is('end_date', null).single();
  expect(data).toEqual({ type: 'maintain', target_weight_kg: null });
});

test('editing protein on the Target screen changes Hari Ini', async ({ page }) => {
  await loginAsTestUser(page);
  await page.goto('/target');
  await page.getByLabel('Protein (g)').fill('120');
  await page.getByRole('button', { name: 'Simpan target' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('region', { name: 'Protein' }).getByText(/dari 120 g/)).toBeVisible();
});

test('changing the BMR method in Profil changes the proposal on Target', async ({ page }) => {
  await loginAsTestUser(page);
  await page.goto('/profil');
  await page.getByLabel('Metode BMR').selectOption('mifflin');
  await expect(page.getByText('Tersimpan')).toBeVisible();
  await page.goto('/target');
  await expect(page.getByText(/BMR Mifflin-St Jeor/)).toBeVisible();
});

test('a reminder switch stays off after reload', async ({ page }) => {
  await loginAsTestUser(page);
  await page.goto('/profil');
  const sw = page.getByRole('switch', { name: 'Pengingat makan siang' });
  if ((await sw.getAttribute('aria-checked')) === 'true') await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByText('Tersimpan')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('switch', { name: 'Pengingat makan siang' })).toHaveAttribute('aria-checked', 'false');
});
