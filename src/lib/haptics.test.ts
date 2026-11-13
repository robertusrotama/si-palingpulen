import { describe, expect, test } from 'vitest';
import { createHaptics, stepCrossings } from './haptics';

describe('stepCrossings', () => {
  test('counts 0.1 kg and 1 kg steps in either direction', () => {
    expect(stepCrossings(61.8, 61.9)).toEqual({ minor: 1, major: 0 });
    expect(stepCrossings(61.9, 62.0)).toEqual({ minor: 1, major: 1 });
    expect(stepCrossings(62.0, 61.9)).toEqual({ minor: 1, major: 1 });
    expect(stepCrossings(61.0, 61.5)).toEqual({ minor: 5, major: 0 });
    expect(stepCrossings(61.8, 61.8)).toEqual({ minor: 0, major: 0 });
  });
});

function env(over: Partial<Parameters<typeof createHaptics>[0]> = {}) {
  const calls: (number | 'ios')[] = [];
  let t = 1000;
  const e = {
    vibrate: (p: number) => { calls.push(p); return true; },
    iosSwitchTap: () => { calls.push('ios'); },
    enabled: true,
    now: () => t,
    ...over,
  };
  return { calls, h: createHaptics(e), tick: (ms: number) => { t += ms; } };
}

describe('createHaptics', () => {
  test('a whole kilogram gives a stronger pulse', () => {
    const { calls, h } = env();
    h.onChange(61.9, 62.0);
    expect(calls).toEqual([18]);
  });
  test('a jump over several steps gives one short pulse', () => {
    const { calls, h } = env();
    h.onChange(61.0, 61.5);
    expect(calls).toEqual([8]);
  });
  test('events closer than 35 ms are throttled', () => {
    const { calls, h, tick } = env();
    h.onChange(61.0, 61.1);
    tick(10);
    h.onChange(61.1, 61.2);
    tick(40);
    h.onChange(61.2, 61.3);
    expect(calls).toEqual([8, 8]);
  });
  test('disabled means no calls at all', () => {
    const { calls, h } = env({ enabled: false });
    h.onChange(61.9, 62.0);
    expect(calls).toEqual([]);
  });
  test('without the Vibration API the iOS switch is tapped', () => {
    const { calls, h } = env({ vibrate: undefined });
    h.onChange(61.8, 61.9);
    expect(calls).toEqual(['ios']);
  });
  test('no change, no pulse', () => {
    const { calls, h } = env();
    h.onChange(61.8, 61.8);
    expect(calls).toEqual([]);
  });
});
