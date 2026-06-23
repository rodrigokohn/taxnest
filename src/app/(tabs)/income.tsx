import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedEntrance } from '@/components/animated-entrance';
import { IconSymbol } from '@/components/icon-symbol';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { incomeSourceRepo } from '@/data';
import { type IncomeSource, type Payment } from '@/domain';
import { Radius, Spacing, useTheme } from '@/design';
import { formatUSD } from '@/lib/money';
import { useCountUp } from '@/lib/use-count-up';
import { haptics } from '@/services/haptics';
import { useActiveTaxYear, usePaymentsStore } from '@/store';

type Section = { title: string; data: Payment[] };

// Left inset so row separators align under the source name (dot + gap).
const ROW_TEXT_INSET = Spacing.lg + 10 + Spacing.md;

function monthTitle(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function dayLabel(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function groupByMonth(payments: Payment[]): Section[] {
  const map = new Map<string, Payment[]>();
  for (const p of payments) {
    const key = monthTitle(p.date);
    const bucket = map.get(key);
    if (bucket) bucket.push(p);
    else map.set(key, [p]);
  }
  return Array.from(map, ([title, data]) => ({ title, data }));
}

/** Income history (PRD §8.4). */
export default function IncomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const payments = usePaymentsStore((s) => s.payments);
  const totalIncome = usePaymentsStore((s) => s.totalIncome);
  const totalSetAside = usePaymentsStore((s) => s.totalSetAside);
  const [sources, setSources] = useState<Record<string, IncomeSource>>({});
  const [undoItem, setUndoItem] = useState<Payment | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const incomeValue = useCountUp(totalIncome);
  const taxYear = useActiveTaxYear();

  useEffect(() => {
    usePaymentsStore.getState().load(taxYear);
    incomeSourceRepo.list().then((list) => {
      setSources(Object.fromEntries(list.map((s) => [s.id, s])));
    });
  }, [taxYear]);

  const sections = useMemo(() => groupByMonth(payments), [payments]);

  function remove(payment: Payment) {
    haptics.light();
    usePaymentsStore.getState().remove(payment.id);
    setUndoItem(payment);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndoItem(null), 4000);
  }

  async function undo() {
    if (!undoItem) return;
    const { id: _id, created_at: _c, ...rest } = undoItem;
    await usePaymentsStore.getState().add(rest);
    setUndoItem(null);
  }

  if (payments.length === 0) {
    return (
      <Screen>
        <Header />
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.primaryTint }]}>
            <IconSymbol name="tray" color={theme.primary} size={32} />
          </View>
          <ThemedText variant="sectionHeader">No income yet</ThemedText>
          <ThemedText variant="secondary" color="textSecondary" style={styles.center}>
            Use the + tab below to log your first payment and see how much to set aside.
          </ThemedText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <SummaryHeader income={incomeValue} setAside={totalSetAside} count={payments.length} />
        }
        renderSectionHeader={({ section }) => (
          <ThemedText variant="caption" color="textTertiary" style={styles.sectionHeader}>
            {section.title.toUpperCase()}
          </ThemedText>
        )}
        ItemSeparatorComponent={() => (
          <View style={{ backgroundColor: theme.surface }}>
            <View style={[styles.separator, { backgroundColor: theme.border }]} />
          </View>
        )}
        renderItem={({ item, index, section }) => (
          <PaymentRow
            payment={item}
            source={sources[item.income_source_id]}
            onDelete={remove}
            first={index === 0}
            last={index === section.data.length - 1}
          />
        )}
      />

      {undoItem && (
        <Animated.View
          entering={FadeIn.duration(200)}
          style={[
            styles.snackbar,
            { backgroundColor: theme.textPrimary, bottom: insets.bottom + 72 },
          ]}>
          <ThemedText variant="secondary" style={{ color: theme.background }}>
            Payment deleted
          </ThemedText>
          <Pressable onPress={undo} accessibilityRole="button" hitSlop={8}>
            <ThemedText variant="secondary" style={{ color: theme.primary, fontWeight: '700' }}>
              Undo
            </ThemedText>
          </Pressable>
        </Animated.View>
      )}
    </Screen>
  );
}

function Header() {
  const theme = useTheme();
  const taxYear = useActiveTaxYear();
  return (
    <View style={styles.headerRow}>
      <ThemedText variant="screenTitle">Income</ThemedText>
      <View style={[styles.yearChip, { backgroundColor: theme.surface }]}>
        <ThemedText variant="secondary" color="textSecondary">
          {taxYear}
        </ThemedText>
      </View>
    </View>
  );
}

function SummaryHeader({
  income,
  setAside,
  count,
}: {
  income: number;
  setAside: number;
  count: number;
}) {
  const theme = useTheme();
  return (
    <>
      <Header />
      <AnimatedEntrance index={0}>
        <View
          style={[styles.summary, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <ThemedText variant="secondary" color="textSecondary">
            Received this year
          </ThemedText>
          <ThemedText variant="heroNumber" style={styles.summaryNumber}>
            {formatUSD(income)}
          </ThemedText>

          <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />

          <View style={styles.summaryStats}>
            <View style={styles.summaryStat}>
              <View style={styles.summaryStatLabel}>
                <IconSymbol name="checkmark.circle.fill" color={theme.success} size={14} />
                <ThemedText variant="caption" color="textTertiary">
                  Set aside
                </ThemedText>
              </View>
              <ThemedText variant="sectionHeader" style={styles.tabular}>
                {formatUSD(setAside)}
              </ThemedText>
            </View>

            <View style={[styles.summaryStatBorder, { backgroundColor: theme.border }]} />

            <View style={styles.summaryStat}>
              <ThemedText variant="caption" color="textTertiary">
                Payments
              </ThemedText>
              <ThemedText variant="sectionHeader" style={styles.tabular}>
                {count}
              </ThemedText>
            </View>
          </View>
        </View>
      </AnimatedEntrance>
    </>
  );
}

function PaymentRow({
  payment,
  source,
  onDelete,
  first,
  last,
}: {
  payment: Payment;
  source?: IncomeSource;
  onDelete: (p: Payment) => void;
  first: boolean;
  last: boolean;
}) {
  const theme = useTheme();
  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      style={[
        styles.row,
        { backgroundColor: theme.surface },
        first && styles.rowFirst,
        last && styles.rowLast,
      ]}>
      <View style={[styles.dot, { backgroundColor: source?.color ?? theme.primary }]} />
      <View style={styles.rowMain}>
        <ThemedText variant="body">{source?.name ?? 'Income'}</ThemedText>
        <ThemedText variant="caption" color="textTertiary">
          Set aside {formatUSD(payment.set_aside_amount)} · {dayLabel(payment.date)}
        </ThemedText>
      </View>
      <ThemedText variant="body" style={styles.tabular}>
        {formatUSD(payment.amount)}
      </ThemedText>
      <Pressable
        onPress={() => onDelete(payment)}
        accessibilityRole="button"
        accessibilityLabel="Delete payment"
        hitSlop={8}
        style={styles.deleteBtn}>
        <IconSymbol name="trash" color={theme.textTertiary} size={17} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  yearChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  center: { textAlign: 'center', maxWidth: 280 },
  listContent: { paddingBottom: Spacing.huge },

  summary: {
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.xl,
    gap: Spacing.xxs,
  },
  summaryNumber: { fontSize: 34, lineHeight: 40 },
  summaryDivider: { height: StyleSheet.hairlineWidth, marginVertical: Spacing.lg },
  summaryStats: { flexDirection: 'row', alignItems: 'center' },
  summaryStat: { flex: 1, gap: Spacing.xxs },
  summaryStatLabel: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  summaryStatBorder: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginRight: Spacing.lg,
  },
  tabular: { fontVariant: ['tabular-nums'] },

  sectionHeader: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  rowFirst: {
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingTop: Spacing.lg,
  },
  rowLast: {
    borderBottomLeftRadius: Radius.lg,
    borderBottomRightRadius: Radius.lg,
    paddingBottom: Spacing.lg,
  },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: ROW_TEXT_INSET },
  dot: { width: 10, height: 10, borderRadius: Radius.pill },
  rowMain: { flex: 1, gap: 2 },
  deleteBtn: { padding: Spacing.xs },
  snackbar: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    shadowColor: '#0F172A',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
