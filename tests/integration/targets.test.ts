import { beforeAll, describe, expect, test } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import { activeGoal, goalHistory, startGoal } from '@/lib/db/goals';
import { getProfile, saveProfile } from '@/lib/db/profile';
import { recalcTargets, saveTargets, targetUpdateSuggestion } from '@/lib/db/targets';
import { daySummary } from '@/lib/db/entries';
import { createTestUser, uniqueEmail } from './helpers';

let sb: SupabaseClient<Database>;
const TODAY = '2026-11-12';

beforeAll(async () => {
  sb = await createTestUser(uniqueEmail('targets'));
  await saveProfile(sb, { sex: 'male', birthDate: '2000-05-01', heightCm: 165, activityFactor: 1.55, bmrMethod: 'auto' });
  await sb.from('body_scans').insert({ scanned_at: '2026-11-07T00:30:00Z', weight_kg: 61.8, bf_pct: 14.9, fat_mass_kg: 9.2, bmr_kcal: 1465 });
});

describe('profile', () => {
  test('round-trips settings', async () => {
    await saveProfile(sb, { sex: 'male', birthDate: '2000-05-01', heightCm: 165, activityFactor: 1.55, bmrMethod: 'auto', remindersDisabled: ['lunch_missing'] });
    const p = (await getProfile(sb))!;
    expect(p.remindersDisabled).toEqual(['lunch_missing']);
    expect(p.leanErrorKg).toBe(1);
  });
});

describe('goals', () => {
  test('starting a second goal closes the first', async () => {
    await startGoal(sb, { type: 'maintain', startDate: '2026-10-01' });
    await startGoal(sb, { type: 'bulk', startDate: '2026-11-07' });
    const active = (await activeGoal(sb))!;
    expect(active.type).toBe('bulk');
    expect(active.ratePctPerWeek).toBe(0.3);
    const hist = await goalHistory(sb);
    expect(hist.filter((g) => g.endDate == null)).toHaveLength(1);
    expect(hist.find((g) => g.type === 'maintain')!.endDate).toBe('2026-11-06');
  });
});

describe('targets', () => {
  test('recalc reproduces the spec example', async () => {
    const r = await recalcTargets(sb, TODAY);
    expect(r.values.kcal).toBe(2540);
    expect(r.inputs.method).toBe('katch');
    expect(Math.round(r.inputs.bmr)).toBe(1506);
  });
  test('past days keep the old target (Review Focus 5)', async () => {
    const r = await recalcTargets(sb, TODAY);
    await saveTargets(sb, { ...r.values, effective_from: '2026-11-01', is_manual_override: false, calc_inputs: r.inputs });
    await saveTargets(sb, { ...r.values, kcal: 2800, effective_from: '2026-11-15', is_manual_override: true, calc_inputs: r.inputs });
    expect((await daySummary(sb, '2026-11-10')).target!.kcal).toBe(2540);
    expect((await daySummary(sb, '2026-11-16')).target!.kcal).toBe(2800);
  });
  test('a scan newer than the targets suggests an update', async () => {
    expect(await targetUpdateSuggestion(sb, '2026-11-16')).toBeNull(); // target 15 Nov lebih baru dari scan 7 Nov
    await sb.from('body_scans').insert({ scanned_at: '2026-11-20T00:30:00Z', weight_kg: 62.5, bf_pct: 15.0, fat_mass_kg: 9.4 });
    const s = (await targetUpdateSuggestion(sb, '2026-11-21'))!;
    expect(s.current.kcal).toBe(2800);
    expect(s.proposed.kcal).toBeGreaterThan(2500);
  });
});
