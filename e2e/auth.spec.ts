import { expect, test } from '@playwright/test';
import { loginAsTestUser } from './helpers';

test('without a session / redirects to /login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
});

test('login answer never reveals which email is allowed', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('siapa@contoh.test');
  await page.getByRole('button', { name: 'Kirim link masuk' }).click();
  await expect(page.getByText('Kalau email terdaftar, link masuk sudah dikirim.')).toBeVisible();
});

test('after test login / stays in the app', async ({ page }) => {
  await loginAsTestUser(page);
  await page.goto('/');
  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.getByRole('heading', { name: 'Hari Ini' })).toBeVisible();
});

test('without a profile the app sends you to onboarding', async ({ page }) => {
  await loginAsTestUser(page, { withProfile: false });
  await page.goto('/');
  await expect(page).toHaveURL(/\/onboarding$/);
});
