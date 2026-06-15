import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { IconSymbol } from '@/components/icon-symbol';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { isProNow } from '@/config/gating';
import { DEFAULT_TAX_YEAR } from '@/config/tax-year';
import { deductionRepo, incomeSourceRepo } from '@/data';
import { Radius, Spacing, useTheme } from '@/design';
import { formatUSD } from '@/lib/money';
import { useCountUp } from '@/lib/use-count-up';
import { computeAnnualTax } from '@/tax-engine';
import { usePaymentsStore, useProfileStore, useTaxConfigStore } from '@/store';

type Delta = { se: number; federal: number; state: number };

/** Add income (core loop, PRD §8.3): input → the "set aside" moment. */
export function AddIncomeSheet() {
  const theme = useTheme();
  const router = useRouter();

  const [stage, setStage] = useState<'input' | 'result'>('input');
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [setAside, setSetAside] = useState(0);
  const [delta, setDelta] = useState<Delta>({ se: 0, federal: 0, state: 0 });
  const [showBreakdown, setShowBreakdown] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

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

    const includeState = isProNow(); // State tax is a Pro feature (PRD §11).
    const d: Delta = {
      se: after.se.seTax - before.se.seTax,
      federal: after.federalIncomeTax - before.federalIncomeTax,
      state: includeState ? after.stateTax - before.stateTax : 0,
    };
    setDelta(d);
    setSetAside(Math.max(0, d.se + d.federal + d.state));
    setStage('result');
    setCalculating(false);
  }

  async function done() {
    const source = await incomeSourceRepo.ensureDefault();
    await usePaymentsStore.getState().add({
      income_source_id: source.id,
      amount,
      date: today,
      set_aside_amount: setAside,
      note: note.trim() || undefined,
      tax_year: DEFAULT_TAX_YEAR,
    });
    router.back();
  }

  function addAnother() {
    setAmount(0);
    setNote('');
    setShowNote(false);
    setShowBreakdown(false);
    setStage('input');
  }

  if (stage === 'result') {
    return (
      <Screen edges={['top', 'bottom']}>
        <SetAsideResult
          amount={amount}
          setAside={setAside}
          delta={delta}
          showBreakdown={showBreakdown}
          onToggleBreakdown={() => setShowBreakdown((v) => !v)}
          onAddAnother={addAnother}
          onDone={done}
        />
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.header}>
        <ThemedText variant="screenTitle">Add income</ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={() => router.back()}>
          <IconSymbol name="xmark.circle.fill" color={theme.textTertiary} size={28} />
        </Pressable>
      </View>

      <View style={styles.amountWrap}>
        <ThemedText variant="heroNumber" color="textSecondary">
          $
        </ThemedText>
        <TextInput
          keyboardType="number-pad"
          value={amount > 0 ? String(amount) : ''}
          onChangeText={(t) => setAmount(Number(t.replace(/[^0-9]/g, '')) || 0)}
          placeholder="0"
          placeholderTextColor={theme.textTertiary}
          style={[styles.amountInput, { color: theme.textPrimary }]}
          autoFocus
        />
      </View>

      <View style={styles.meta}>
        <ThemedText variant="secondary" color="textSecondary">
          Date: Today
        </ThemedText>
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

      <View style={styles.footer}>
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
  showBreakdown,
  onToggleBreakdown,
  onAddAnother,
  onDone,
}: {
  amount: number;
  setAside: number;
  delta: Delta;
  showBreakdown: boolean;
  onToggleBreakdown: () => void;
  onAddAnother: () => void;
  onDone: () => void;
}) {
  const theme = useTheme();
  const animated = useCountUp(setAside);

  return (
    <View style={styles.resultRoot}>
      <View style={styles.resultCenter}>
        <ThemedText variant="sectionHeader" color="textSecondary">
          Set aside
        </ThemedText>
        <ThemedText style={[styles.setAsideHero, { color: theme.accent }]}>
          {formatUSD(animated)}
        </ThemedText>
        <ThemedText variant="body" color="textSecondary">
          from this {formatUSD(amount)} payment
        </ThemedText>

        <View style={styles.coveredRow}>
          <IconSymbol name="checkmark.circle.fill" color={theme.success} size={20} />
          <ThemedText variant="body" color="success">
            That keeps you covered for taxes
          </ThemedText>
        </View>

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

      <View style={styles.footer}>
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
  amountInput: { fontSize: 56, fontWeight: '700', minWidth: 120, textAlign: 'left' },
  meta: { gap: Spacing.sm, paddingBottom: Spacing.lg },
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
  setAsideHero: { fontSize: 56, fontWeight: '700', fontVariant: ['tabular-nums'] },
  coveredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
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
