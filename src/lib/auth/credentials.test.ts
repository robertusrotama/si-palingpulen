import { expect, test } from 'vitest';
import { validateNewPassword, validateSignup } from './credentials';

test('accepts a valid email and matching password', () => {
  expect(validateSignup(' a@x.com ', 'rahasia123', 'rahasia123')).toBeNull();
});

test('rejects a malformed email', () => {
  expect(validateSignup('bukan-email', 'rahasia123', 'rahasia123')).toBe('Email tidak valid.');
});

test('rejects a short password', () => {
  expect(validateNewPassword('1234567', '1234567')).toBe('Kata sandi minimal 8 karakter.');
});

test('rejects a confirmation that does not match', () => {
  expect(validateNewPassword('rahasia123', 'rahasia124')).toBe('Konfirmasi kata sandi tidak sama.');
});
