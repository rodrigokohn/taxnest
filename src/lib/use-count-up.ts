import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Animates a number from 0 up to `target` (easeOutCubic). Powers the "set aside"
 * moment and the dashboard totals (PRD §8.0 motion). Respects Reduce Motion:
 * when enabled, it snaps straight to the value.
 */
export function useCountUp(target: number, durationMs = 600): number {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    let raf = 0;
    let cancelled = false;
    startRef.current = null;

    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (cancelled) return;
      if (reduceMotion) {
        setValue(target);
        return;
      }
      const tick = (now: number) => {
        if (startRef.current == null) startRef.current = now;
        const progress = Math.min(1, (now - startRef.current) / durationMs);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(target * eased);
        if (progress < 1) raf = requestAnimationFrame(tick);
        else setValue(target);
      };
      raf = requestAnimationFrame(tick);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [target, durationMs]);

  return value;
}
