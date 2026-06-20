import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, useTheme } from '@/design';
import { shortDate } from '@/lib/deadlines';
import { formatUSD } from '@/lib/money';

/** Progress toward the cumulative safe-harbor pace by the next quarterly deadline. */
export function QuarterlyProgress({
  current,
  target,
  pct,
  quarter,
  dueDate,
  isOverdue,
  atRisk,
}: {
  current: number;
  target: number;
  pct: number;
  quarter: number;
  dueDate: string;
  daysRemaining: number;
  isOverdue: boolean;
  atRisk: boolean;
}) {
  const theme = useTheme();
  const fill = atRisk ? theme.warning : theme.primary;

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <ThemedText variant="secondary" color="textSecondary">
          Q{quarter} safe-harbor pace
        </ThemedText>
        <ThemedText variant="secondary" color={isOverdue ? 'danger' : 'textTertiary'}>
          {isOverdue ? 'overdue' : `due ${shortDate(dueDate)}`}
        </ThemedText>
      </View>

      <View style={styles.amountRow}>
        <ThemedText variant="sectionHeader">{formatUSD(current)}</ThemedText>
        <ThemedText variant="secondary" color="textTertiary">
          {' '}
          of {formatUSD(target)} set aside
        </ThemedText>
      </View>

      <View style={[styles.track, { backgroundColor: theme.border }]}>
        <View style={{ flex: Math.max(0.0001, pct), backgroundColor: fill }} />
        <View style={{ flex: Math.max(0, 1 - pct) }} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  amountRow: { flexDirection: 'row', alignItems: 'baseline' },
  track: {
    height: 8,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    overflow: 'hidden',
    marginTop: Spacing.xxs,
  },
});
