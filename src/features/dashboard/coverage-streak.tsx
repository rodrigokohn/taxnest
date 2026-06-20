import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { IconSymbol } from '@/components/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, useTheme } from '@/design';
import { shortDate } from '@/lib/deadlines';
import { formatUSD } from '@/lib/money';

import { type WeekBar } from './use-habit-data';

const BAR_AREA = 40;

/** Calm "covered weeks" streak + a 12-week set-aside sparkline (PRD §8.0 habit). */
export function CoverageStreak({
  streak,
  weeks,
  atRisk,
  atRiskAmount,
  dueDate,
}: {
  streak: number;
  weeks: WeekBar[];
  atRisk: boolean;
  atRiskAmount: number;
  dueDate?: string;
}) {
  const theme = useTheme();

  if (streak === 0) {
    return (
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <IconSymbol name="checkmark.shield" color={theme.textTertiary} size={18} />
          <ThemedText variant="sectionHeader" color="textSecondary">
            Start your coverage streak
          </ThemedText>
        </View>
        <ThemedText variant="secondary" color="textTertiary">
          Log your first payment to start staying covered for taxes.
        </ThemedText>
      </Card>
    );
  }

  const max = Math.max(1, ...weeks.map((w) => w.amount));

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <IconSymbol
          name="checkmark.shield.fill"
          color={atRisk ? theme.warning : theme.success}
          size={18}
        />
        <ThemedText variant="sectionHeader">
          {streak} {streak === 1 ? 'week' : 'weeks'} covered
        </ThemedText>
      </View>

      <View style={styles.bars}>
        {weeks.map((w, i) => {
          const isCurrent = i === weeks.length - 1;
          const color = !w.covered
            ? theme.border
            : isCurrent && atRisk
              ? theme.warning
              : theme.success;
          const height = w.covered ? Math.max(4, (w.amount / max) * BAR_AREA) : 3;
          const faint = w.covered && w.amount === 0;
          return (
            <View key={w.weekStart} style={styles.barSlot}>
              <View
                style={[styles.bar, { height, backgroundColor: color, opacity: faint ? 0.35 : 1 }]}
              />
            </View>
          );
        })}
      </View>

      {atRisk && atRiskAmount > 0 && (
        <ThemedText variant="caption" color="warning">
          Set aside {formatUSD(atRiskAmount)} {dueDate ? `before ${shortDate(dueDate)} ` : ''}to
          keep your streak.
        </ThemedText>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.xs, height: BAR_AREA },
  barSlot: { flex: 1, alignItems: 'stretch', justifyContent: 'flex-end', height: BAR_AREA },
  bar: { width: '100%', borderRadius: Radius.sm, minHeight: 3 },
});
