import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { ThemedText, type ThemedTextProps } from '@/components/themed-text';

/**
 * Reveals `text` progressively, word by word, like a chat assistant typing
 * (ChatGPT/Claude). The answer arrives whole from the backend; this only
 * animates the reveal over a short, capped window. Respects Reduce Motion.
 */
export function TypewriterText({
  text,
  onTick,
  ...props
}: ThemedTextProps & { text: string; onTick?: () => void }) {
  const [shown, setShown] = useState(text);

  useEffect(() => {
    let cancelled = false;
    let raf: number | undefined;

    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (cancelled) return;
      if (reduceMotion) {
        setShown(text);
        return;
      }
      // Tokens keep trailing whitespace so joins are seamless.
      const tokens = text.match(/\S+\s*/g) ?? [text];
      const total = Math.min(900, Math.max(250, tokens.length * 14));
      const start = Date.now();
      let lastN = -1;
      setShown('');

      const tick = () => {
        if (cancelled) return;
        const p = Math.min(1, (Date.now() - start) / total);
        const n = Math.max(1, Math.round(p * tokens.length));
        if (n !== lastN) {
          lastN = n;
          setShown(tokens.slice(0, n).join(''));
          onTick?.();
        }
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });

    return () => {
      cancelled = true;
      if (raf != null) cancelAnimationFrame(raf);
    };
    // onTick omitted: a new closure each render shouldn't restart the reveal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return <ThemedText {...props}>{shown}</ThemedText>;
}
