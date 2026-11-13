import { expect, test } from 'vitest';
import { parseDecimal } from './number';

test('accepts comma or dot as the decimal separator', () => {
  expect(parseDecimal('9,2')).toBe(9.2);
  expect(parseDecimal(' 61.8 ')).toBe(61.8);
  expect(parseDecimal('120')).toBe(120);
  expect(parseDecimal('0,95')).toBe(0.95);
});

test('rejects ambiguous or non-numeric input', () => {
  expect(parseDecimal('9,2,1')).toBeNull();
  expect(parseDecimal('1.000,5')).toBeNull();
  expect(parseDecimal('abc')).toBeNull();
  expect(parseDecimal('')).toBeNull();
  expect(parseDecimal('  ')).toBeNull();
  expect(parseDecimal('-')).toBeNull();
});

test('accepts a leading minus', () => {
  expect(parseDecimal('-0,5')).toBe(-0.5);
});
