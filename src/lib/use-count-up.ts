import { useEffect, useRef, useState } from 'react';

/**
 * Animates a number from 0 up to `target` (easeOutCubic). Powers the "set aside"
 * moment and the dashboard totals (PRD §8.0 motion). TODO(a11y): collapse to an
 * instant set when Reduce Motion is enabled.
 */
export function useCountUp(target: number, durationMs = 600): number {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    startRef.current = null;
    let raf = 0;
    const tick = (now: number) => {
      if (startRef.current == null) startRef.current = now;
      const progress = Math.min(1, (now - startRef.current) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) raf = requestAnimationFrame(tick);
      else setValue(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}
