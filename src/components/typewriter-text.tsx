import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text } from 'react-native';

import { ThemedText, type ThemedTextProps } from '@/components/themed-text';

/** Split "a **b** c" into runs, marking the parts between `**` pairs as bold. */
function parseBold(text: string): { text: string; bold: boolean }[] {
  return text.split('**').map((t, i) => ({ text: t, bold: i % 2 === 1 }));
}

/**
 * Reveals `text` progressively, like a chat assistant typing (ChatGPT/Claude),
 * and renders simple `**bold**` Markdown (the model emits it). The reveal runs
 * over the clean text (without the `**` markers). Respects Reduce Motion.
 */
export function TypewriterText({
  text,
  speedMs = 16,
  onTick,
  ...props
}: ThemedTextProps & { text: string; speedMs?: number; onTick?: () => void }) {
  const runs = useMemo(() => parseBold(text), [text]);
  const cleanLength = useMemo(() => runs.reduce((n, r) => n + r.text.length, 0), [runs]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (cancelled) return;
      if (reduceMotion) {
        setCount(cleanLength);
        return;
      }
      setCount(0);
      let i = 0;
      const step = Math.max(1, Math.ceil(cleanLength / 180));
      timer = setInterval(() => {
        i = Math.min(cleanLength, i + step);
        setCount(i);
        onTick?.();
        if (i >= cleanLength && timer) clearInterval(timer);
      }, speedMs);
    });

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
    // onTick intentionally omitted: a fresh closure each render shouldn't restart typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, speedMs, cleanLength]);

  // Render each run sliced to the revealed character count. Nested <Text> inherit
  // the parent ThemedText's size/color; bold runs just add the weight.
  let start = 0;
  const children = runs.map((run, i) => {
    const visible = Math.max(0, Math.min(run.text.length, count - start));
    const slice = run.text.slice(0, visible);
    start += run.text.length;
    if (!slice) return null;
    return (
      <Text key={i} style={run.bold ? styles.bold : undefined}>
        {slice}
      </Text>
    );
  });

  return <ThemedText {...props}>{children}</ThemedText>;
}

const styles = StyleSheet.create({
  bold: { fontWeight: '700' },
});
