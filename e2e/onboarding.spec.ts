import { expect, test } from '@playwright/test';
import { loginAsTestUser, resetAllData } from './helpers';

test.describe.configure({ mode: 'serial' });

test('a new user goes through onboarding and gets the spec targets', async ({ page }) => {
  const userId = await loginAsTestUser(page);
  await resetAllData(userId);
  await page.goto('/');
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel('Pria').check();
  await page.getByLabel('Tanggal lahir').fill('2000-05-01');
  await page.getByLabel('Tinggi (cm)').fill('165');
  await page.getByLabel('Faktor aktivitas').selectOption('1.55');
  await page.getByLabel('Berat (kg)').fill('61,8');
  await page.getByLabel('% lemak dari scan (opsional)').fill('14,9');
  await page.getByLabel('Bulking').check();
  await page.getByRole('button', { name: 'Hitung target' }).click();
  await expect(page.getByText('BMR 1.506 × 1,55 + 204')).toBeVisible();
  await expect(page.getByTestId('target-kcal')).toHaveValue('2540');
  await page.getByRole('button', { name: 'Simpan target' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('dari 2.540 kkal')).toBeVisible();
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
