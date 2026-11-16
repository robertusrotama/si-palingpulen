export type Goal = 'bulk' | 'cut' | 'maintain';
export type StepId = 'sex' | 'birth' | 'height' | 'weight' | 'activity' | 'goal' | 'target' | 'bodyfat';

const ALL: StepId[] = ['sex', 'birth', 'height', 'weight', 'activity', 'goal', 'target', 'bodyfat'];

/** Urutan layar onboarding. Maintain tidak butuh target berat. */
export function onboardingSteps(goal: Goal): StepId[] {
  return goal === 'maintain' ? ALL.filter((s) => s !== 'target') : ALL;
}

/** Menjepit tanggal ke hari terakhir bulan itu (mis. 31 Februari → 28/29). */
export function clampDay(year: number, month1to12: number, day: number): number {
  const last = new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
  return Math.min(day, last);
}
