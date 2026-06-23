import { Fragment, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AnimatedEntrance } from '@/components/animated-entrance';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { IconSymbol, type IconSymbolName } from '@/components/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { deductionRepo } from '@/data';
import { DEDUCTION_CATEGORIES, type Deduction, type DeductionCategory } from '@/domain';
import { Radius, Spacing, useTheme } from '@/design';
import { formatUSD } from '@/lib/money';
import { useCountUp } from '@/lib/use-count-up';
import { computeAnnualTax } from '@/tax-engine';
import { useActiveTaxYear, usePaymentsStore, useProfileStore, useTaxConfigStore } from '@/store';

const META: Record<DeductionCategory, { label: string; icon: IconSymbolName }> = {
  home_office: { label: 'Home office', icon: 'house.fill' },
  software: { label: 'Software', icon: 'laptopcomputer' },
  equipment: { label: 'Equipment', icon: 'wrench.and.screwdriver.fill' },
  travel: { label: 'Travel', icon: 'airplane' },
  education: { label: 'Education', icon: 'graduationcap.fill' },
  supplies: { label: 'Supplies', icon: 'shippingbox.fill' },
  other: { label: 'Other', icon: 'ellipsis.circle.fill' },
};

// Left inset so row separators align under the category label (icon circle + gap).
const ROW_TEXT_INSET = Spacing.lg + 38 + Spacing.md;

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

/** Deductions (PRD §8.5, Pro). The impact line is the hook. */
export function DeductionsScreen() {
  const theme = useTheme();
  const profile = useProfileStore((s) => s.profile);
  const config = useTaxConfigStore((s) => s.config);
  const totalIncome = usePaymentsStore((s) => s.totalIncome);
  const taxYear = useActiveTaxYear();

  const [items, setItems] = useState<Deduction[]>([]);
  const [adding, setAdding] = useState(false);
  const [category, setCategory] = useState<DeductionCategory>('home_office');
  const [amountText, setAmountText] = useState('');
  const amount = parseFloat(amountText) || 0;

  const load = () => deductionRepo.listByYear(taxYear).then(setItems);
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taxYear]);

  const total = useMemo(() => items.reduce((s, d) => s + d.amount, 0), [items]);
  const totalValue = useCountUp(total);

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
      tax_year: taxYear,
    });
    setAmountText('');
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
      <AnimatedEntrance index={0}>
        <View style={[styles.summary, { backgroundColor: theme.primaryTint }]}>
          <ThemedText variant="secondary" color="textSecondary">
            Total deductions · {taxYear}
          </ThemedText>
          <ThemedText variant="heroNumber" style={styles.summaryNumber}>
            {formatUSD(totalValue)}
          </ThemedText>
          {impact > 0 ? (
            <View style={styles.impactRow}>
              <IconSymbol name="arrow.down.circle.fill" color={theme.success} size={18} />
              <ThemedText variant="body" color="success">
                Lowers your projected tax by {formatUSD(impact)}
              </ThemedText>
            </View>
          ) : (
            <ThemedText variant="secondary" color="textSecondary">
              Log business expenses to lower your taxable income.
            </ThemedText>
          )}
        </View>
      </AnimatedEntrance>

      {items.length > 0 && (
        <AnimatedEntrance index={1}>
          <View
            style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {items.map((d, i) => (
              <Fragment key={d.id}>
                <View style={styles.row}>
                  <View style={[styles.rowIcon, { backgroundColor: theme.primaryTint }]}>
                    <IconSymbol name={META[d.category].icon} color={theme.primary} size={18} />
                  </View>
                  <ThemedText variant="body" style={styles.rowLabel}>
                    {META[d.category].label}
                  </ThemedText>
                  <ThemedText variant="body" style={styles.tabular}>
                    {formatUSD(d.amount)}
                  </ThemedText>
                  <Pressable
                    onPress={() => remove(d.id)}
                    hitSlop={8}
                    accessibilityLabel="Delete deduction"
                    style={styles.deleteBtn}>
                    <IconSymbol name="trash" color={theme.textTertiary} size={17} />
                  </Pressable>
                </View>
                {i < items.length - 1 && (
                  <View style={[styles.separator, { backgroundColor: theme.border }]} />
                )}
              </Fragment>
            ))}
          </View>
        </AnimatedEntrance>
      )}

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
              keyboardType="decimal-pad"
              value={amountText}
              onChangeText={(t) => setAmountText(sanitizeAmount(t))}
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
  content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  summary: { gap: Spacing.xs, padding: Spacing.xl, borderRadius: Radius.xl },
  summaryNumber: { fontSize: 40, lineHeight: 46 },
  impactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xxs,
  },
  group: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
  deleteBtn: { padding: Spacing.xs },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: ROW_TEXT_INSET },
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
