import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { IconSymbol } from '@/components/icon-symbol';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { DEFAULT_TAX_YEAR } from '@/config/tax-year';
import { incomeSourceRepo } from '@/data';
import { type IncomeSource, type Payment } from '@/domain';
import { Radius, Spacing, useTheme } from '@/design';
import { formatUSD } from '@/lib/money';
import { usePaymentsStore } from '@/store';

type Section = { title: string; data: Payment[] };

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
  const payments = usePaymentsStore((s) => s.payments);
  const totalIncome = usePaymentsStore((s) => s.totalIncome);
  const [sources, setSources] = useState<Record<string, IncomeSource>>({});
  const [undoItem, setUndoItem] = useState<Payment | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    usePaymentsStore.getState().load(DEFAULT_TAX_YEAR);
    incomeSourceRepo.list().then((list) => {
      setSources(Object.fromEntries(list.map((s) => [s.id, s])));
    });
  }, []);

  const sections = useMemo(() => groupByMonth(payments), [payments]);

  function remove(payment: Payment) {
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
        <View style={styles.empty}>
          <IconSymbol name="tray" color={theme.textTertiary} size={40} />
          <ThemedText variant="sectionHeader">No income yet</ThemedText>
          <ThemedText variant="secondary" color="textSecondary" style={styles.center}>
            Tap + to add your first payment and see how much to set aside.
          </ThemedText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.totalHeader}>
        <ThemedText variant="secondary" color="textSecondary">
          Total income · {DEFAULT_TAX_YEAR}
        </ThemedText>
        <ThemedText variant="sectionHeader">{formatUSD(totalIncome)}</ThemedText>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderSectionHeader={({ section }) => (
          <ThemedText variant="caption" color="textTertiary" style={styles.sectionHeader}>
            {section.title}
          </ThemedText>
        )}
        renderItem={({ item }) => (
          <PaymentRow payment={item} source={sources[item.income_source_id]} onDelete={remove} />
        )}
      />

      {undoItem && (
        <View style={[styles.snackbar, { backgroundColor: theme.textPrimary }]}>
          <ThemedText variant="secondary" style={{ color: theme.background }}>
            Payment deleted
          </ThemedText>
          <Pressable onPress={undo} accessibilityRole="button">
            <ThemedText variant="secondary" style={{ color: theme.primary, fontWeight: '700' }}>
              Undo
            </ThemedText>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}

function PaymentRow({
  payment,
  source,
  onDelete,
}: {
  payment: Payment;
  source?: IncomeSource;
  onDelete: (p: Payment) => void;
}) {
  const theme = useTheme();
  return (
    <Animated.View style={styles.row} entering={FadeIn.duration(300)}>
      <View style={[styles.dot, { backgroundColor: source?.color ?? theme.primary }]} />
      <View style={styles.rowMain}>
        <ThemedText variant="body">{source?.name ?? 'Income'}</ThemedText>
        <ThemedText variant="caption" color="textTertiary">
          Set aside {formatUSD(payment.set_aside_amount)} · {dayLabel(payment.date)}
        </ThemedText>
      </View>
      <ThemedText variant="body">{formatUSD(payment.amount)}</ThemedText>
      <Pressable
        onPress={() => onDelete(payment)}
        accessibilityRole="button"
        accessibilityLabel="Delete payment"
        hitSlop={8}
        style={styles.deleteBtn}>
        <IconSymbol name="trash" color={theme.textTertiary} size={18} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  center: { textAlign: 'center', maxWidth: 280 },
  totalHeader: { paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  listContent: { paddingBottom: Spacing.xxxl },
  sectionHeader: { paddingTop: Spacing.lg, paddingBottom: Spacing.xs, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  dot: { width: 10, height: 10, borderRadius: Radius.pill },
  rowMain: { flex: 1, gap: 2 },
  deleteBtn: { padding: Spacing.xs },
  snackbar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
});
