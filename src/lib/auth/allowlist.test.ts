import { expect, test } from 'vitest';
import { isAllowedEmail } from './allowlist';

test('matches case-insensitively after trimming', () => {
  expect(isAllowedEmail(' A@x.com ', 'a@x.com')).toBe(true);
});

test('rejects other emails and an empty allowlist', () => {
  expect(isAllowedEmail('b@x.com', 'a@x.com')).toBe(false);
  expect(isAllowedEmail('a@x.com', '')).toBe(false);
  expect(isAllowedEmail('', '')).toBe(false);
});
