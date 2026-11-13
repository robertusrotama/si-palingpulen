import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, test } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import { addScan, addWeight, latestScan, listScans, listWeights } from '@/lib/db/body';
import { createTestUser, uniqueEmail } from './helpers';

let sb: SupabaseClient<Database>;
const scan = {
  weightKg: 61.8, bmi: 22.7, fatMassKg: 9.2, bfPct: 14.9, musclePct: 80.6, otherPct: 4.5, visceralFat: 4, whr: 0.95,
  bmrKcal: 1465, bodyAge: 28, bcmScore: 5012, armRMuscleKg: 3.0, armRFatKg: 0.4, armLMuscleKg: 2.9, armLFatKg: 0.4,
  torsoMuscleKg: 24.1, torsoFatKg: 4.7, legRMuscleKg: 7.6, legRFatKg: 1.4, legLMuscleKg: 7.7, legLFatKg: 1.5,
};

beforeAll(async () => {
  sb = await createTestUser(uniqueEmail('body'));
});

describe('weights', () => {
  test('resend is idempotent and the list is ranged', async () => {
    const w = { clientId: randomUUID(), date: '2026-11-12', measuredAt: '2026-11-12T00:00:00Z', weightKg: 61.9, condition: 'fasted' as const };
    await addWeight(sb, w);
    await addWeight(sb, w);
    await addWeight(sb, { ...w, clientId: randomUUID(), date: '2026-11-20', weightKg: 62.1 });
    expect(await listWeights(sb, '2026-11-01', '2026-11-15')).toHaveLength(1);
  });
  test('rejects impossible weights', async () => {
    await expect(addWeight(sb, { clientId: randomUUID(), date: '2026-11-12', measuredAt: '2026-11-12T00:00:00Z', weightKg: 20, condition: 'fasted' })).rejects.toThrow();
  });
});

describe('scans', () => {
  test('stores the real scan and returns the latest first', async () => {
    await addScan(sb, { ...scan, scannedAt: '2026-11-07T00:30:00Z', condition: 'fasted', postWorkout: false });
    await addScan(sb, { ...scan, weightKg: 62.3, fatMassKg: 9.3, scannedAt: '2026-12-05T00:30:00Z', condition: 'fasted', postWorkout: false });
    expect((await latestScan(sb))!.weightKg).toBe(62.3);
    expect((await listScans(sb)).map((s) => s.scannedAt.slice(0, 10))).toEqual(['2026-11-07', '2026-12-05']);
    expect((await listScans(sb))[0].torsoMuscleKg).toBe(24.1);
  });
  test('refuses a scan that fails validation', async () => {
    await expect(addScan(sb, { ...scan, bfPct: 92, scannedAt: '2026-11-08T00:00:00Z', condition: 'fasted', postWorkout: false })).rejects.toThrow('invalid_scan');
  });
});
