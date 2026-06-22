import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { ThemedText, type ThemedTextProps } from '@/components/themed-text';

/**
 * Reveals `text` progressively, like a chat assistant typing (ChatGPT/Claude).
 * The answer arrives whole from the backend; this only animates the reveal.
 * Respects Reduce Motion: when enabled, shows the full text immediately.
 */
export function TypewriterText({
  text,
  speedMs = 16,
  onTick,
  ...props
}: ThemedTextProps & { text: string; speedMs?: number; onTick?: () => void }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (cancelled) return;
      if (reduceMotion) {
        setCount(text.length);
        return;
      }
      setCount(0);
      let i = 0;
      // Reveal a few chars per tick so long answers still finish in a couple seconds.
      const step = Math.max(1, Math.ceil(text.length / 180));
      timer = setInterval(() => {
        i = Math.min(text.length, i + step);
        setCount(i);
        onTick?.();
        if (i >= text.length && timer) clearInterval(timer);
      }, speedMs);
    });

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
    // onTick intentionally omitted: a fresh closure each render shouldn't restart typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, speedMs]);

  return <ThemedText {...props}>{text.slice(0, count)}</ThemedText>;
}
