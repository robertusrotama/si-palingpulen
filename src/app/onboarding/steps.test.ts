import { expect, test } from 'vitest';
import { clampDay, onboardingSteps } from './steps';

test('bulk and cut walk all 8 steps in order', () => {
  expect(onboardingSteps('bulk')).toEqual(['sex', 'birth', 'height', 'weight', 'activity', 'goal', 'target', 'bodyfat']);
  expect(onboardingSteps('cut')).toHaveLength(8);
});

test('maintain skips the target weight step', () => {
  expect(onboardingSteps('maintain')).not.toContain('target');
  expect(onboardingSteps('maintain')).toHaveLength(7);
});

test('clampDay keeps the day inside the month', () => {
  expect(clampDay(2001, 2, 31)).toBe(28);
  expect(clampDay(2000, 2, 31)).toBe(29);
  expect(clampDay(2000, 4, 31)).toBe(30);
  expect(clampDay(2000, 4, 15)).toBe(15);
});
