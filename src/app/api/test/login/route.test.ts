import { afterEach, expect, test } from 'vitest';
import { POST } from './route';

const original = process.env.E2E;
afterEach(() => {
  process.env.E2E = original;
});

test('returns 404 unless E2E=1', async () => {
  delete process.env.E2E;
  const res = await POST(new Request('http://localhost/api/test/login', { method: 'POST', body: '{}' }));
  expect(res.status).toBe(404);
});
