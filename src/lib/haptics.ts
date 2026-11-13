/**
 * Getar untuk slider timbang (spec F6, opsi B):
 * - Vibration API bila ada (Android).
 * - iPhone: trik tidak resmi, men-toggle <input type="checkbox" switch> tersembunyi (iOS 18+). Bisa berhenti bekerja kapan saja.
 * - Selain itu tanpa getar.
 */
const tenths = (kg: number) => Math.round(kg * 10);

export function stepCrossings(prevKg: number, nextKg: number): { minor: number; major: number } {
  const a = tenths(prevKg);
  const b = tenths(nextKg);
  return { minor: Math.abs(b - a), major: Math.abs(Math.floor(b / 10) - Math.floor(a / 10)) };
}

export function createHaptics(env: {
  vibrate?: (pattern: number) => boolean;
  iosSwitchTap?: () => void;
  enabled: boolean;
  now: () => number;
}): { onChange(prevKg: number, nextKg: number): void } {
  let last = -Infinity;
  return {
    onChange(prevKg, nextKg) {
      if (!env.enabled) return;
      const c = stepCrossings(prevKg, nextKg);
      if (c.minor === 0) return;
      const t = env.now();
      if (t - last < 35) return;
      last = t;
      if (env.vibrate) env.vibrate(c.major > 0 ? 18 : 8);
      else env.iosSwitchTap?.();
    },
  };
}

export function detectHapticEnv(win: Window, doc: Document): { vibrate?: (pattern: number) => boolean; iosSwitchTap?: () => void } {
  const nav = win.navigator as Navigator & { vibrate?: (p: number) => boolean };
  if (typeof nav.vibrate === 'function') return { vibrate: (p) => nav.vibrate!(p) };
  if ('switch' in (win as Window & typeof globalThis).HTMLInputElement.prototype) {
    const label = doc.createElement('label');
    label.setAttribute('aria-hidden', 'true');
    label.style.cssText = 'position:fixed;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;';
    const input = doc.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    input.tabIndex = -1;
    label.appendChild(input);
    doc.body.appendChild(label);
    return { iosSwitchTap: () => label.click() };
  }
  return {};
}
