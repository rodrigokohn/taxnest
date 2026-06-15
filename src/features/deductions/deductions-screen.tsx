import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { IconSymbol, type IconSymbolName } from '@/components/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { DEFAULT_TAX_YEAR } from '@/config/tax-year';
import { deductionRepo } from '@/data';
import { DEDUCTION_CATEGORIES, type Deduction, type DeductionCategory } from '@/domain';
import { Radius, Spacing, useTheme } from '@/design';
import { formatUSD } from '@/lib/money';
import { computeAnnualTax } from '@/tax-engine';
import { usePaymentsStore, useProfileStore, useTaxConfigStore } from '@/store';

const META: Record<DeductionCategory, { label: string; icon: IconSymbolName }> = {
  home_office: { label: 'Home office', icon: 'house.fill' },
  software: { label: 'Software', icon: 'laptopcomputer' },
  equipment: { label: 'Equipment', icon: 'wrench.and.screwdriver.fill' },
  travel: { label: 'Travel', icon: 'airplane' },
  education: { label: 'Education', icon: 'graduationcap.fill' },
  supplies: { label: 'Supplies', icon: 'shippingbox.fill' },
  other: { label: 'Other', icon: 'ellipsis.circle.fill' },
};

/** Deductions (PRD §8.5, Pro). The impact line is the hook. */
export function DeductionsScreen() {
  const theme = useTheme();
  const profile = useProfileStore((s) => s.profile);
  const config = useTaxConfigStore((s) => s.config);
  const totalIncome = usePaymentsStore((s) => s.totalIncome);

  const [items, setItems] = useState<Deduction[]>([]);
  const [adding, setAdding] = useState(false);
  const [category, setCategory] = useState<DeductionCategory>('home_office');
  const [amount, setAmount] = useState(0);

  const load = () => deductionRepo.listByYear(DEFAULT_TAX_YEAR).then(setItems);
  useEffect(() => {
    load();
  }, []);

  const total = useMemo(() => items.reduce((s, d) => s + d.amount, 0), [items]);

  const impact = useMemo(() => {
    if (!profile || !config) return 0;
    const income = Math.max(profile.estimated_annual_income, totalIncome);
    const taxProfile = { filing_status: profile.filing_status, state: profile.state };
    const without = computeAnnualTax({ ...taxProfile, net_profit: income }, config).totalAnnualTax;
    const withDeductions = computeAnnualTax(
      { ...taxProfile, net_profit: Math.max(0, income - total) },
      config,
    ).totalAnnualTax;
    return Math.max(0, without - withDeductions);
  }, [profile, config, total, totalIncome]);

  async function add() {
    if (amount <= 0) return;
    await deductionRepo.create({
      category,
      amount,
      date: new Date().toISOString().slice(0, 10),
      tax_year: DEFAULT_TAX_YEAR,
    });
    setAmount(0);
    setAdding(false);
    load();
  }

  async function remove(id: string) {
    await deductionRepo.remove(id);
    load();
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <ThemedText variant="secondary" color="textSecondary">
          Deductions · {DEFAULT_TAX_YEAR}
        </ThemedText>
        <ThemedText variant="heroNumber">{formatUSD(total)}</ThemedText>
        {impact > 0 && (
          <ThemedText variant="body" color="success">
            ↓ Lowered your projected tax by {formatUSD(impact)}
          </ThemedText>
        )}
      </View>

      {items.map((d) => (
        <View key={d.id} style={styles.row}>
          <IconSymbol name={META[d.category].icon} color={theme.primary} size={22} />
          <ThemedText variant="body" style={styles.rowLabel}>
            {META[d.category].label}
          </ThemedText>
          <ThemedText variant="body">{formatUSD(d.amount)}</ThemedText>
          <Pressable onPress={() => remove(d.id)} hitSlop={8} accessibilityLabel="Delete deduction">
            <IconSymbol name="trash" color={theme.textTertiary} size={18} />
          </Pressable>
        </View>
      ))}

      {adding ? (
        <Card style={styles.form}>
          <View style={styles.chips}>
            {DEDUCTION_CATEGORIES.map((c) => (
              <Pressable
                key={c}
                onPress={() => setCategory(c)}
                style={[
                  styles.chip,
                  {
                    borderColor: category === c ? theme.primary : theme.border,
                    backgroundColor: category === c ? theme.primaryTint : 'transparent',
                  },
                ]}>
                <ThemedText variant="caption" color={category === c ? 'primary' : 'textSecondary'}>
                  {META[c].label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
          <View style={[styles.amountBox, { borderColor: theme.border }]}>
            <ThemedText variant="body" color="textSecondary">
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
          <Button title="Add deduction" onPress={add} disabled={amount <= 0} />
        </Card>
      ) : (
        <Button title="+ Add deduction" variant="secondary" onPress={() => setAdding(true)} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxxl },
  header: { gap: Spacing.xs, paddingBottom: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  rowLabel: { flex: 1 },
  form: { gap: Spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  amountInput: { flex: 1, fontSize: 20, fontWeight: '600' },
});
