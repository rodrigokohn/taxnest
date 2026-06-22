import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { IconSymbol } from '@/components/icon-symbol';
import { Screen } from '@/components/screen';
import { StateCoverageNotice } from '@/components/state-coverage-notice';
import { ThemedText } from '@/components/themed-text';
import { DEFAULT_TAX_YEAR } from '@/config/tax-year';
import { deductionRepo, incomeSourceRepo } from '@/data';
import { Radius, Spacing, useTheme } from '@/design';
import { highestMilestoneReached } from '@/features/dashboard/milestones';
import { computeHabitData } from '@/features/dashboard/use-habit-data';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { formatUSD } from '@/lib/money';
import { useCountUp } from '@/lib/use-count-up';
import { haptics } from '@/services/haptics';
import { computeAnnualTax } from '@/tax-engine';
import { usePaymentsStore, useProfileStore, useTaxConfigStore } from '@/store';

type Delta = { se: number; federal: number; state: number };
type HabitFeedback = { streak: number; total: number; milestone: number | null };

/** Keep only digits and a single decimal point with up to 2 places. */
function sanitizeAmount(t: string): string {
  const cleaned = t.replace(/[^0-9.]/g, '');
  const dot = cleaned.indexOf('.');
  if (dot === -1) return cleaned;
  return (
    cleaned.slice(0, dot + 1) +
    cleaned
      .slice(dot + 1)
      .replace(/\./g, '')
      .slice(0, 2)
  );
}

/** Add income (core loop, PRD §8.3): input → the "set aside" moment. */
export function AddIncomeSheet() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const kbHeight = useKeyboardHeight();

  const [stage, setStage] = useState<'input' | 'result'>('input');
  const [amountText, setAmountText] = useState('');
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [setAside, setSetAside] = useState(0);
  const [delta, setDelta] = useState<Delta>({ se: 0, federal: 0, state: 0 });
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [habitFeedback, setHabitFeedback] = useState<HabitFeedback | null>(null);

  const [date, setDate] = useState(new Date());
  const amount = parseFloat(amountText) || 0;

  // Reset to a fresh entry whenever the Add tab loses focus.
  useFocusEffect(
    useCallback(
      () => () => {
        setStage('input');
        setAmountText('');
        setNote('');
        setShowNote(false);
        setShowBreakdown(false);
        setHabitFeedback(null);
        setDate(new Date());
      },
      [],
    ),
  );

  async function calculate() {
    const profile = useProfileStore.getState().profile;
    const config = useTaxConfigStore.getState().config;
    if (!profile || !config || amount <= 0) return;

    setCalculating(true);
    await usePaymentsStore.getState().load(DEFAULT_TAX_YEAR);
    const priorIncome = usePaymentsStore.getState().totalIncome;
    const deductions = await deductionRepo.sumByYear(DEFAULT_TAX_YEAR);
    const priorNetProfit = Math.max(0, priorIncome - deductions);

    const taxProfile = { filing_status: profile.filing_status, state: profile.state };
    const before = computeAnnualTax({ ...taxProfile, net_profit: priorNetProfit }, config);
    const after = computeAnnualTax({ ...taxProfile, net_profit: priorNetProfit + amount }, config);

    const d: Delta = {
      se: after.se.seTax - before.se.seTax,
      federal: after.federalIncomeTax - before.federalIncomeTax,
      state: after.stateTax - before.stateTax,
    };
    setDelta(d);
    const setAsideValue = Math.max(0, d.se + d.federal + d.state);
    setSetAside(setAsideValue);

    // Habit feedback (streak + milestone) for the result, from the hypothetical
    // state after this payment is added.
    const payments = usePaymentsStore.getState().payments;
    const beforeTotal = payments.reduce((sum, p) => sum + p.set_aside_amount, 0);
    const habit = computeHabitData(
      [
        ...payments,
        { amount, date: date.toISOString().slice(0, 10), set_aside_amount: setAsideValue },
      ],
      profile,
      config,
    );
    const beforeMile = highestMilestoneReached(beforeTotal);
    const afterMile = highestMilestoneReached(habit.totalSetAside);
    setHabitFeedback({
      streak: habit.coveredWeeksStreak,
      total: habit.totalSetAside,
      milestone: afterMile && (!beforeMile || afterMile > beforeMile) ? afterMile : null,
    });

    setStage('result');
    setCalculating(false);
    haptics.success(); // the "set aside" moment (PRD §8.3)
  }

  async function done() {
    const source = await incomeSourceRepo.ensureDefault();
    await usePaymentsStore.getState().add({
      income_source_id: source.id,
      amount,
      date: date.toISOString().slice(0, 10),
      set_aside_amount: setAside,
      note: note.trim() || undefined,
      tax_year: DEFAULT_TAX_YEAR,
    });
    router.navigate('/');
  }

  function addAnother() {
    setAmountText('');
    setNote('');
    setShowNote(false);
    setShowBreakdown(false);
    setHabitFeedback(null);
    setStage('input');
  }

  if (stage === 'result') {
    return (
      <Screen edges={['top']}>
        <SetAsideResult
          amount={amount}
          setAside={setAside}
          delta={delta}
          habit={habitFeedback}
          showBreakdown={showBreakdown}
          onToggleBreakdown={() => setShowBreakdown((v) => !v)}
          onAddAnother={addAnother}
          onDone={done}
        />
      </Screen>
    );
  }

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <ThemedText variant="screenTitle">Add income</ThemedText>
      </View>

      <View style={styles.amountWrap}>
        <ThemedText style={[styles.currency, { color: theme.textSecondary }]}>$</ThemedText>
        <TextInput
          keyboardType="decimal-pad"
          value={amountText}
          onChangeText={(t) => setAmountText(sanitizeAmount(t))}
          placeholder="0"
          placeholderTextColor={theme.textTertiary}
          style={[styles.amountInput, { color: theme.textPrimary }]}
          autoFocus
        />
      </View>

      <View style={styles.meta}>
        <View style={styles.dateRow}>
          <ThemedText variant="secondary" color="textSecondary">
            Date
          </ThemedText>
          <DateTimePicker
            value={date}
            mode="date"
            display="compact"
            maximumDate={new Date()}
            onChange={(_event, picked) => picked && setDate(picked)}
          />
        </View>
        {showNote ? (
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Add a note"
            placeholderTextColor={theme.textTertiary}
            style={[styles.noteInput, { color: theme.textPrimary, borderColor: theme.border }]}
          />
        ) : (
          <Pressable onPress={() => setShowNote(true)} accessibilityRole="button">
            <ThemedText variant="secondary" color="primary">
              Add note
            </ThemedText>
          </Pressable>
        )}
      </View>

      <View
        style={[
          styles.footer,
          { paddingBottom: kbHeight > 0 ? kbHeight + Spacing.md : insets.bottom + 72 },
        ]}>
        <Button
          title="Calculate"
          onPress={calculate}
          disabled={amount <= 0}
          loading={calculating}
        />
      </View>
    </Screen>
  );
}

function SetAsideResult({
  amount,
  setAside,
  delta,
  habit,
  showBreakdown,
  onToggleBreakdown,
  onAddAnother,
  onDone,
}: {
  amount: number;
  setAside: number;
  delta: Delta;
  habit: HabitFeedback | null;
  showBreakdown: boolean;
  onToggleBreakdown: () => void;
  onAddAnother: () => void;
  onDone: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const animated = useCountUp(setAside, 800);

  useEffect(() => {
    if (habit?.milestone) haptics.light();
  }, [habit?.milestone]);

  return (
    <View style={styles.resultRoot}>
      <View style={styles.resultCenter}>
        <ThemedText variant="sectionHeader" color="textSecondary">
          Set aside
        </ThemedText>
        <View style={styles.heroWrap}>
          <View style={[styles.halo, { backgroundColor: theme.accent }]} pointerEvents="none" />
          <Animated.View entering={ZoomIn.springify().damping(12).mass(0.6)}>
            <ThemedText style={[styles.setAsideHero, { color: theme.accent }]}>
              {formatUSD(animated)}
            </ThemedText>
          </Animated.View>
        </View>
        <ThemedText variant="body" color="textSecondary">
          from this {formatUSD(amount)} payment
        </ThemedText>

        <Animated.View
          entering={FadeInDown.delay(300).springify().damping(18)}
          style={styles.coveredRow}>
          <IconSymbol name="checkmark.circle.fill" color={theme.success} size={20} />
          <ThemedText variant="body" color="success">
            That keeps you covered for taxes
          </ThemedText>
        </Animated.View>

        <StateCoverageNotice />

        {habit && (
          <Animated.View
            entering={FadeInDown.delay(450).springify().damping(18)}
            style={styles.habitRow}>
            {habit.milestone ? (
              <>
                <IconSymbol name="checkmark.seal.fill" color={theme.accent} size={16} />
                <ThemedText variant="secondary" color="accent">
                  {formatUSD(habit.milestone)} set aside this year
                </ThemedText>
              </>
            ) : (
              <ThemedText variant="secondary" color="textTertiary">
                {formatUSD(habit.total)} set aside this year
                {habit.streak >= 2 ? ` · ${habit.streak} weeks covered` : ''}
              </ThemedText>
            )}
          </Animated.View>
        )}

        <Pressable
          onPress={onToggleBreakdown}
          accessibilityRole="button"
          style={styles.explainLink}>
          <ThemedText variant="secondary" color="primary">
            How is this calculated?
          </ThemedText>
          <IconSymbol
            name={showBreakdown ? 'chevron.up' : 'chevron.down'}
            color={theme.primary}
            size={14}
          />
        </Pressable>

        {showBreakdown && (
          <View style={[styles.breakdown, { borderColor: theme.border }]}>
            <BreakdownRow label="Self-employment tax" value={delta.se} />
            <BreakdownRow label="Federal income tax" value={delta.federal} />
            {delta.state > 0 && <BreakdownRow label="State income tax" value={delta.state} />}
          </View>
        )}
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 72 }]}>
        <Button title="Done" onPress={onDone} />
        <Button title="Add another" variant="ghost" onPress={onAddAnother} />
      </View>
    </View>
  );
}

function BreakdownRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.breakdownRow}>
      <ThemedText variant="secondary" color="textSecondary">
        {label}
      </ThemedText>
      <ThemedText variant="secondary">{formatUSD(value, { cents: true })}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
  },
  amountWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  currency: { fontSize: 40, fontWeight: '600', lineHeight: 60 },
  amountInput: {
    fontSize: 56,
    fontWeight: '700',
    lineHeight: 64,
    minWidth: 24,
    textAlign: 'center',
  },
  meta: { gap: Spacing.sm, paddingBottom: Spacing.lg },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  noteInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 16,
  },
  footer: { gap: Spacing.sm, paddingBottom: Spacing.md },
  resultRoot: { flex: 1 },
  resultCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  heroWrap: { alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 240, height: 240, borderRadius: 120, opacity: 0.07 },
  setAsideHero: { fontSize: 56, lineHeight: 64, fontWeight: '700', fontVariant: ['tabular-nums'] },
  coveredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },

  explainLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.lg,
  },
  breakdown: {
    alignSelf: 'stretch',
    marginTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
