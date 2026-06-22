import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AnimatedEntrance } from '@/components/animated-entrance';
import { Card } from '@/components/card';
import { IconSymbol, type IconSymbolName } from '@/components/icon-symbol';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { DEFAULT_TAX_YEAR } from '@/config/tax-year';
import { quarterlyPaymentRepo } from '@/data';
import { type Quarter, type QuarterlyPayment } from '@/domain';
import { Radius, Spacing, useTheme } from '@/design';
import { shortDate } from '@/lib/deadlines';
import { formatUSD } from '@/lib/money';
import { useCountUp } from '@/lib/use-count-up';
import { haptics } from '@/services/haptics';
import { useDashboardData } from '@/features/dashboard/use-dashboard-data';
import { useTaxConfigStore } from '@/store';

type Status = 'paid' | 'overdue' | 'due_soon' | 'upcoming';
type Tone = 'success' | 'warning' | 'danger' | 'textTertiary';

function daysUntil(deadlineIso: string, now = new Date()): number {
  return Math.ceil((new Date(`${deadlineIso}T23:59:59`).getTime() - now.getTime()) / 86_400_000);
}

function statusOf(deadlineIso: string, paid: boolean): Status {
  if (paid) return 'paid';
  const days = daysUntil(deadlineIso);
  if (days < 0) return 'overdue';
  if (days <= 14) return 'due_soon';
  return 'upcoming';
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

  const deadlines = useMemo(() => config?.quarterly_deadlines ?? [], [config]);
  const suggested = dashboard?.suggestedQuarterly ?? 0;
  const suggestedValue = useCountUp(suggested);

  const paidCount = useMemo(
    () => Object.values(paidByQuarter).filter((q) => q.is_paid).length,
    [paidByQuarter],
  );

  // The quarter to nudge: the most overdue unpaid one, else the soonest upcoming.
  const focus = useMemo(() => {
    const unpaid = deadlines
      .map((date, i) => ({ date, quarter: (i + 1) as Quarter, days: daysUntil(date) }))
      .filter((d) => !paidByQuarter[d.quarter]?.is_paid);
    const overdue = unpaid.filter((d) => d.days < 0).sort((a, b) => a.days - b.days)[0];
    const upcoming = unpaid.filter((d) => d.days >= 0).sort((a, b) => a.days - b.days)[0];
    return overdue ?? upcoming ?? null;
  }, [deadlines, paidByQuarter]);

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
        'Taxnest doesn’t process payments — it helps you plan.\n\n' +
        'This is an estimate for planning purposes only, not tax advice.',
    );
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <AnimatedEntrance index={0}>
          <View style={styles.headerRow}>
            <ThemedText variant="screenTitle">Quarterly taxes</ThemedText>
            <View style={[styles.yearChip, { backgroundColor: theme.surface }]}>
              <ThemedText variant="secondary" color="textSecondary">
                {DEFAULT_TAX_YEAR}
              </ThemedText>
            </View>
          </View>
        </AnimatedEntrance>

        <AnimatedEntrance index={1}>
          <View style={[styles.hero, { backgroundColor: theme.primaryTint }]}>
            <ThemedText variant="secondary" color="textSecondary">
              Suggested each quarter
            </ThemedText>
            <ThemedText variant="heroNumber" style={styles.heroNumber}>
              {formatUSD(suggestedValue)}
            </ThemedText>

            <FocusLine focus={focus} allPaid={paidCount === 4} />

            <View style={styles.segments}>
              {[1, 2, 3, 4].map((q) => (
                <View
                  key={q}
                  style={[
                    styles.segment,
                    { backgroundColor: paidByQuarter[q]?.is_paid ? theme.success : theme.border },
                  ]}
                />
              ))}
            </View>
            <ThemedText variant="caption" color="textSecondary">
              {paidCount} of 4 paid this year
              {dashboard?.usingEstimate ? ' · based on your estimate' : ''}
            </ThemedText>
          </View>
        </AnimatedEntrance>

        <AnimatedEntrance index={2} style={styles.list}>
          {deadlines.map((deadline, i) => {
            const quarter = (i + 1) as Quarter;
            const record = paidByQuarter[quarter];
            const paid = record?.is_paid ?? false;
            return (
              <QuarterCard
                key={quarter}
                quarter={quarter}
                deadline={deadline}
                status={statusOf(deadline, paid)}
                amount={paid ? record!.amount_paid : suggested}
                paidDate={paid ? record!.date_paid : undefined}
                onToggle={() => toggle(quarter, paid)}
              />
            );
          })}
        </AnimatedEntrance>

        <AnimatedEntrance index={3}>
          <Pressable onPress={howToPay} accessibilityRole="button">
            <Card style={styles.howToPay}>
              <View style={[styles.howToPayIcon, { backgroundColor: theme.primaryTint }]}>
                <IconSymbol name="building.columns.fill" color={theme.primary} size={18} />
              </View>
              <View style={styles.howToPayMain}>
                <ThemedText variant="body">How to pay the IRS</ThemedText>
                <ThemedText variant="caption" color="textTertiary">
                  Direct Pay, EFTPS & deadlines
                </ThemedText>
              </View>
              <IconSymbol name="chevron.right" color={theme.textTertiary} size={14} />
            </Card>
          </Pressable>
        </AnimatedEntrance>
      </ScrollView>
    </Screen>
  );
}

function FocusLine({
  focus,
  allPaid,
}: {
  focus: { quarter: Quarter; date: string; days: number } | null;
  allPaid: boolean;
}) {
  const theme = useTheme();
  if (allPaid) {
    return (
      <View style={styles.focusRow}>
        <IconSymbol name="checkmark.seal.fill" color={theme.success} size={16} />
        <ThemedText variant="secondary" color="success">
          You’re all caught up for {DEFAULT_TAX_YEAR}
        </ThemedText>
      </View>
    );
  }
  if (!focus) return null;

  const overdue = focus.days < 0;
  const soon = focus.days <= 14;
  const tone: Tone = overdue ? 'danger' : soon ? 'warning' : 'textTertiary';
  const text = overdue
    ? `Q${focus.quarter} was due ${shortDate(focus.date)}`
    : `Next: Q${focus.quarter} due ${shortDate(focus.date)} · ${focus.days}d left`;

  return (
    <View style={styles.focusRow}>
      <IconSymbol
        name={overdue ? 'exclamationmark.circle.fill' : 'clock.fill'}
        color={theme[tone]}
        size={16}
      />
      <ThemedText variant="secondary" color={tone === 'textTertiary' ? 'textSecondary' : tone}>
        {text}
      </ThemedText>
    </View>
  );
}

const STATUS_META: Record<Status, { label: string; icon: IconSymbolName; tone: Tone }> = {
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
  paidDate,
  onToggle,
}: {
  quarter: Quarter;
  deadline: string;
  status: Status;
  amount: number;
  paidDate?: string;
  onToggle: () => void;
}) {
  const theme = useTheme();
  const meta = STATUS_META[status];
  const days = daysUntil(deadline);
  const statusText =
    status === 'paid'
      ? `Paid${paidDate ? ` · ${shortDate(paidDate)}` : ''}`
      : status === 'due_soon'
        ? `Due in ${days}d`
        : status === 'overdue'
          ? `Overdue · was due ${shortDate(deadline)}`
          : `Due ${shortDate(deadline)}`;

  return (
    <Card style={styles.quarterCard}>
      <IconSymbol name={meta.icon} color={theme[meta.tone]} size={24} />
      <View style={styles.quarterMain}>
        <ThemedText variant="sectionHeader">Quarter {quarter}</ThemedText>
        <ThemedText
          variant="caption"
          color={meta.tone === 'textTertiary' ? 'textTertiary' : meta.tone}>
          {statusText}
        </ThemedText>
      </View>
      <View style={styles.quarterRight}>
        <ThemedText variant="body" style={styles.tabular}>
          {formatUSD(amount)}
        </ThemedText>
        {status === 'paid' ? (
          <Pressable onPress={onToggle} accessibilityRole="button" hitSlop={8}>
            <ThemedText variant="caption" color="textTertiary">
              Undo
            </ThemedText>
          </Pressable>
        ) : (
          <Pressable
            onPress={onToggle}
            accessibilityRole="button"
            hitSlop={8}
            style={[styles.payPill, { backgroundColor: theme.primaryTint }]}>
            <ThemedText variant="caption" color="primary" style={styles.payPillText}>
              Mark as paid
            </ThemedText>
          </Pressable>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.xxxl },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  yearChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
  },
  hero: { gap: Spacing.xs, padding: Spacing.xl, borderRadius: Radius.xl },
  heroNumber: { fontSize: 40, lineHeight: 46 },
  focusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  segments: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.md },
  segment: { flex: 1, height: 6, borderRadius: Radius.pill },

  list: { gap: Spacing.md },
  quarterCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  quarterMain: { flex: 1, gap: 2 },
  quarterRight: { alignItems: 'flex-end', gap: Spacing.xs },
  tabular: { fontVariant: ['tabular-nums'] },
  payPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
  },
  payPillText: { fontWeight: '600' },

  howToPay: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  howToPayIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  howToPayMain: { flex: 1, gap: 2 },
});
