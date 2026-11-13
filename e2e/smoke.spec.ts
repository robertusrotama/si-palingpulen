import { expect, test } from '@playwright/test';

test('smoke: /login responds 200', async ({ request }) => {
  const res = await request.get('/login');
  expect(res.status()).toBe(200);
});
