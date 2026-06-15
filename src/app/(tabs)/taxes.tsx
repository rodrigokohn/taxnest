import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { IconSymbol, type IconSymbolName } from '@/components/icon-symbol';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { DEFAULT_TAX_YEAR } from '@/config/tax-year';
import { quarterlyPaymentRepo } from '@/data';
import { type Quarter, type QuarterlyPayment } from '@/domain';
import { Spacing, useTheme } from '@/design';
import { shortDate } from '@/lib/deadlines';
import { formatUSD } from '@/lib/money';
import { haptics } from '@/services/haptics';
import { useDashboardData } from '@/features/dashboard/use-dashboard-data';
import { useTaxConfigStore } from '@/store';

type Status = 'paid' | 'overdue' | 'due_soon' | 'upcoming';

function statusOf(deadlineIso: string, paid: boolean, now = new Date()): Status {
  if (paid) return 'paid';
  const due = new Date(`${deadlineIso}T23:59:59`);
  const days = Math.ceil((due.getTime() - now.getTime()) / 86_400_000);
  if (days < 0) return 'overdue';
  if (days <= 14) return 'due_soon';
  return 'upcoming';
}

function daysUntil(deadlineIso: string, now = new Date()): number {
  return Math.ceil((new Date(`${deadlineIso}T23:59:59`).getTime() - now.getTime()) / 86_400_000);
}

/** Quarterly tracker (PRD §8.6). */
export default function TaxesScreen() {
  const theme = useTheme();
  const config = useTaxConfigStore((s) => s.config);
  const dashboard = useDashboardData();
  const [paidByQuarter, setPaidByQuarter] = useState<Record<number, QuarterlyPayment>>({});

  const refresh = useCallback(async () => {
    const list = await quarterlyPaymentRepo.listByYear(DEFAULT_TAX_YEAR);
    setPaidByQuarter(Object.fromEntries(list.map((q) => [q.quarter, q])));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const deadlines = config?.quarterly_deadlines ?? [];
  const suggested = dashboard?.suggestedQuarterly ?? 0;

  async function toggle(quarter: Quarter, currentlyPaid: boolean) {
    if (currentlyPaid) {
      await quarterlyPaymentRepo.markUnpaid(DEFAULT_TAX_YEAR, quarter);
    } else {
      await quarterlyPaymentRepo.markPaid(
        DEFAULT_TAX_YEAR,
        quarter,
        suggested,
        new Date().toISOString().slice(0, 10),
      );
      haptics.success();
    }
    refresh();
  }

  function howToPay() {
    Alert.alert(
      'How to pay the IRS',
      'Pay estimated taxes online via IRS Direct Pay (irs.gov/payments) or EFTPS. ' +
        'FreelanceTax doesn’t process payments — it helps you plan.\n\n' +
        'This is an estimate for planning purposes only, not tax advice.',
    );
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <ThemedText variant="screenTitle">Estimated quarterly taxes</ThemedText>
        <ThemedText variant="secondary" color="textSecondary">
          {DEFAULT_TAX_YEAR}
        </ThemedText>

        <View style={styles.list}>
          {deadlines.map((deadline, i) => {
            const quarter = (i + 1) as Quarter;
            const record = paidByQuarter[quarter];
            const paid = record?.is_paid ?? false;
            const status = statusOf(deadline, paid);
            return (
              <QuarterCard
                key={quarter}
                quarter={quarter}
                deadline={deadline}
                status={status}
                amount={paid ? record!.amount_paid : suggested}
                onToggle={() => toggle(quarter, paid)}
              />
            );
          })}
        </View>

        <Pressable onPress={howToPay} accessibilityRole="button" style={styles.howToPay}>
          <ThemedText variant="body" color="primary">
            How to pay the IRS
          </ThemedText>
          <IconSymbol name="arrow.right" color={theme.primary} size={14} />
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const STATUS_META: Record<
  Status,
  { label: string; icon: IconSymbolName; tone: 'success' | 'warning' | 'danger' | 'textTertiary' }
> = {
  paid: { label: 'Paid', icon: 'checkmark.circle.fill', tone: 'success' },
  overdue: { label: 'Overdue', icon: 'exclamationmark.circle.fill', tone: 'danger' },
  due_soon: { label: 'Due soon', icon: 'clock.fill', tone: 'warning' },
  upcoming: { label: 'Upcoming', icon: 'circle', tone: 'textTertiary' },
};

function QuarterCard({
  quarter,
  deadline,
  status,
  amount,
  onToggle,
}: {
  quarter: Quarter;
  deadline: string;
  status: Status;
  amount: number;
  onToggle: () => void;
}) {
  const theme = useTheme();
  const meta = STATUS_META[status];
  const days = daysUntil(deadline);
  const statusText =
    status === 'due_soon' ? `Due in ${days}d` : status === 'paid' ? 'Paid' : meta.label;

  return (
    <Card style={styles.quarterCard}>
      <IconSymbol name={meta.icon} color={theme[meta.tone]} size={24} />
      <View style={styles.quarterMain}>
        <ThemedText variant="sectionHeader">
          Q{quarter} · {shortDate(deadline)}
        </ThemedText>
        <ThemedText variant="caption" color="textTertiary">
          {statusText}
        </ThemedText>
      </View>
      <View style={styles.quarterRight}>
        <ThemedText variant="body">{formatUSD(amount)}</ThemedText>
        <Pressable onPress={onToggle} accessibilityRole="button" hitSlop={8}>
          <ThemedText variant="caption" color={status === 'paid' ? 'textTertiary' : 'primary'}>
            {status === 'paid' ? 'Undo' : 'Mark as paid'}
          </ThemedText>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.xs, paddingTop: Spacing.md, paddingBottom: Spacing.xxxl },
  list: { gap: Spacing.md, paddingTop: Spacing.lg },
  quarterCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  quarterMain: { flex: 1, gap: 2 },
  quarterRight: { alignItems: 'flex-end', gap: Spacing.xs },
  howToPay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingTop: Spacing.xl,
  },
});
