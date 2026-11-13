'use client';

import { useEffect, useRef } from 'react';
import { createHaptics, detectHapticEnv } from './haptics';

/** Getar slider. `enabled` null = ikuti default (menyala kecuali prefers-reduced-motion). */
export function useHaptics(enabled: boolean | null) {
  const ref = useRef<ReturnType<typeof createHaptics> | null>(null);
  useEffect(() => {
    const on = enabled ?? !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    ref.current = createHaptics({ ...detectHapticEnv(window, document), enabled: on, now: () => performance.now() });
  }, [enabled]);
  return (prevKg: number, nextKg: number) => ref.current?.onChange(prevKg, nextKg);
}
