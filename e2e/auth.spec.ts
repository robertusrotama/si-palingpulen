import { expect, test } from '@playwright/test';
import { adminClient, E2E_EMAIL, loginAsTestUser } from './helpers';

const SIGNUP_EMAIL = 'e2e-signup@test.local';

test('without a session / redirects to /login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
});

test('login with an unknown account shows one generic error', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('siapa@contoh.test');
  await page.getByLabel('Kata sandi').fill('salah-total-123');
  await page.getByRole('button', { name: 'Masuk' }).click();
  await expect(page.getByText('Email atau kata sandi salah.')).toBeVisible();
});

test('after test login / stays in the app', async ({ page }) => {
  await loginAsTestUser(page);
  await page.goto('/');
  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.getByRole('heading', { name: 'Hari Ini', exact: true })).toBeVisible();
});

test('without a profile the app sends you to onboarding', async ({ page }) => {
  await loginAsTestUser(page, { withProfile: false });
  await page.goto('/');
  await expect(page).toHaveURL(/\/onboarding$/);
});

test('any email signs up without an email link, then signs in with the password', async ({ page, context }) => {
  const admin = adminClient();
  const { data } = await admin.auth.admin.listUsers();
  const old = data.users.find((u) => u.email === SIGNUP_EMAIL);
  if (old) await admin.auth.admin.deleteUser(old.id);

  await page.goto('/signup');
  await page.getByLabel('Email').fill(SIGNUP_EMAIL);
  await page.getByLabel('Kata sandi', { exact: true }).fill('rahasia-123');
  await page.getByLabel('Ulangi kata sandi').fill('rahasia-123');
  await page.getByRole('button', { name: 'Daftar' }).click();
  await expect(page).toHaveURL(/\/onboarding$/);

  await page.goto('/signup');
  await page.getByLabel('Email').fill(SIGNUP_EMAIL);
  await page.getByLabel('Kata sandi', { exact: true }).fill('rahasia-123');
  await page.getByLabel('Ulangi kata sandi').fill('rahasia-123');
  await page.getByRole('button', { name: 'Daftar' }).click();
  await expect(page.getByText('Email ini sudah terdaftar. Silakan masuk.')).toBeVisible();

  await context.clearCookies();
  await page.goto('/login');
  await page.getByLabel('Email').fill(SIGNUP_EMAIL);
  await page.getByLabel('Kata sandi').fill('rahasia-salah');
  await page.getByRole('button', { name: 'Masuk' }).click();
  await expect(page.getByText('Email atau kata sandi salah.')).toBeVisible();
  await expect(page.getByLabel('Email')).toHaveValue(SIGNUP_EMAIL);
  await page.getByLabel('Kata sandi').fill('rahasia-123');
  await page.getByRole('button', { name: 'Masuk' }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
});

test('password can be set from Profil and used to sign in', async ({ page, context }) => {
  const userId = await loginAsTestUser(page);
  try {
    await page.goto('/profil');
    await page.getByLabel('Kata sandi baru', { exact: true }).fill('sandi-baru-123');
    await page.getByLabel('Ulangi kata sandi baru').fill('sandi-baru-123');
    await page.getByRole('button', { name: 'Simpan kata sandi' }).click();
    await expect(page.getByText('Kata sandi tersimpan.')).toBeVisible();

    await context.clearCookies();
    await page.goto('/login');
    await page.getByLabel('Email').fill(E2E_EMAIL);
    await page.getByLabel('Kata sandi').fill('sandi-baru-123');
    await page.getByRole('button', { name: 'Masuk' }).click();
    await expect(page.getByRole('heading', { name: 'Hari Ini', exact: true })).toBeVisible();
  } finally {
    // Kembalikan kata sandi yang dipakai route login khusus tes.
    await adminClient().auth.admin.updateUserById(userId, { password: 'e2e-only-password-123' });
  }
});
