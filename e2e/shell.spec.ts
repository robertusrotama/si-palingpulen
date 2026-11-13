import { expect, test } from '@playwright/test';
import { loginAsTestUser } from './helpers';

test.describe('phone', () => {
  test('bottom nav has 5 tabs in order with the current one marked', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Navigasi utama' });
    await expect(nav).toBeVisible();
    const links = nav.getByRole('link');
    await expect(links).toHaveText(['Hari Ini', 'Progres', 'Catat', 'Target', 'Profil']);
    await expect(nav.getByRole('link', { name: 'Hari Ini' })).toHaveAttribute('aria-current', 'page');
    for (const box of await links.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) {
      expect(box).toBeGreaterThanOrEqual(44);
    }
  });

  test('task screens have a back button and no nav', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/catat');
    await expect(page.getByRole('navigation', { name: 'Navigasi utama' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Kembali' })).toBeVisible();
  });

  test('keyboard focus is visible', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/');
    await page.keyboard.press('Tab');
    const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle);
    expect(outline).not.toBe('none');
  });
});

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false });
  test('side rail replaces the bottom nav', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/');
    await expect(page.getByTestId('bottom-nav')).toBeHidden();
    const rail = page.getByTestId('side-rail');
    await expect(rail).toBeVisible();
    await expect(rail.getByRole('link').first()).toHaveAccessibleName('Catat makanan');
  });
});
