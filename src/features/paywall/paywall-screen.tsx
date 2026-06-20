import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { type PurchasesPackage } from 'react-native-purchases';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { Button } from '@/components/button';
import { IconSymbol, type IconSymbolName } from '@/components/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { isProNow, useEntitlementStore } from '@/config/gating';
import { Radius, ScreenPadding, Spacing, useTheme } from '@/design';
import {
  freeTrialLabel,
  getSubscriptionPackages,
  isUserCancelled,
  purchasePackage,
  restorePurchases,
} from '@/services/purchases';
import { useProfileStore, useTaxConfigStore } from '@/store';
import { computeAnnualTax } from '@/tax-engine';

// TODO(launch): point these at the real hosted pages before App Store submission.
const TERMS_URL = 'https://freelancetax.app/terms';
const PRIVACY_URL = 'https://freelancetax.app/privacy';

const FEATURES: { icon: IconSymbolName; text: string }[] = [
  { icon: 'chart.bar.fill', text: 'Know what to set aside on every payment' },
  { icon: 'building.columns.fill', text: 'Federal + state tax estimates' },
  { icon: 'tag.fill', text: 'Track deductions to lower your bill' },
  { icon: 'doc.text.fill', text: 'Accountant-ready PDF reports' },
  { icon: 'sparkles', text: 'AI assistant for your tax questions' },
  { icon: 'bell.fill', text: 'Quarterly deadline reminders' },
];

type PlanKey = 'annual' | 'monthly';

export function PaywallScreen() {
  const theme = useTheme();
  const setEntitlement = useEntitlementStore((s) => s.setEntitlement);
  const profile = useProfileStore((s) => s.profile);
  const config = useTaxConfigStore((s) => s.config);

  const [annual, setAnnual] = useState<PurchasesPackage | null>(null);
  const [monthly, setMonthly] = useState<PurchasesPackage | null>(null);
  const [selected, setSelected] = useState<PlanKey>('annual');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Personalized set-aside rate from the quiz/profile (same math as the reveal).
  const rate = useMemo(() => {
    if (!profile || !config || profile.estimated_annual_income <= 0) return null;
    const b = computeAnnualTax(
      {
        filing_status: profile.filing_status,
        state: profile.state,
        net_profit: profile.estimated_annual_income,
      },
      config,
    );
    const tax = b.se.seTax + b.federalIncomeTax + b.stateTax;
    return Math.round((tax / profile.estimated_annual_income) * 100);
  }, [profile, config]);

  useEffect(() => {
    let cancelled = false;
    getSubscriptionPackages()
      .then(({ annual, monthly }) => {
        if (cancelled) return;
        setAnnual(annual);
        setMonthly(monthly);
        setSelected(annual ? 'annual' : 'monthly');
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const pkg = selected === 'annual' ? annual : monthly;
  const trial = pkg ? freeTrialLabel(pkg) : null;

  async function startTrial() {
    if (!pkg) return;
    setBusy(true);
    try {
      const info = await purchasePackage(pkg);
      useEntitlementStore.getState().applyCustomerInfo(info);
    } catch (err) {
      if (!isUserCancelled(err)) Alert.alert('Purchase failed', 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function onRestore() {
    setBusy(true);
    try {
      const info = await restorePurchases();
      if (info) useEntitlementStore.getState().applyCustomerInfo(info);
      if (!isProNow()) {
        Alert.alert('Nothing to restore', 'No active subscription was found for this Apple ID.');
      }
    } catch {
      Alert.alert('Restore failed', 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.fill, styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  const hasPlans = Boolean(annual || monthly);
  const ctaLabel = trial ? 'Try it free for 30 days' : 'Subscribe';

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <GlowBg color={theme.primary} />
      <SafeAreaView edges={['top', 'bottom']} style={styles.fill}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <GlowIcon icon="leaf.fill" />
            <ThemedText variant="screenTitle" style={[styles.center, styles.title]}>
              Stay ahead of every tax bill
            </ThemedText>
            {rate != null && (
              <View style={[styles.planChip, { backgroundColor: theme.primaryTint }]}>
                <IconSymbol name="chart.bar.fill" color={theme.primary} size={15} />
                <ThemedText variant="secondary" color="primary" style={styles.planChipText}>
                  Your plan: set aside {rate}% of every payment
                </ThemedText>
              </View>
            )}
          </View>

          <View style={styles.features}>
            {FEATURES.map((f) => (
              <View key={f.text} style={styles.featureRow}>
                <View style={[styles.featureIcon, { backgroundColor: theme.primaryTint }]}>
                  <IconSymbol name={f.icon} color={theme.primary} size={18} />
                </View>
                <ThemedText variant="body" style={styles.featureText}>
                  {f.text}
                </ThemedText>
              </View>
            ))}
          </View>

          <View
            style={[styles.social, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.stars}>
              {[0, 1, 2, 3, 4].map((i) => (
                <IconSymbol key={i} name="star.fill" color={theme.warning} size={15} />
              ))}
            </View>
            <ThemedText variant="secondary" color="textSecondary" style={styles.center}>
              “I finally stopped panicking about taxes every April.”
            </ThemedText>
          </View>

          {hasPlans ? (
            <View style={styles.plans}>
              {annual && (
                <PlanCard
                  label="Annual"
                  price={
                    annual.product.pricePerMonthString
                      ? `${annual.product.pricePerMonthString}/mo`
                      : annual.product.priceString
                  }
                  sublabel={`${annual.product.priceString} billed yearly`}
                  badge={savingsBadge(annual, monthly)}
                  popular
                  selected={selected === 'annual'}
                  onPress={() => setSelected('annual')}
                />
              )}
              {monthly && (
                <PlanCard
                  label="Monthly"
                  price={monthly.product.priceString}
                  sublabel="Billed monthly"
                  selected={selected === 'monthly'}
                  onPress={() => setSelected('monthly')}
                />
              )}
            </View>
          ) : (
            <ThemedText variant="body" color="textSecondary" style={styles.center}>
              Subscriptions aren’t available right now. Please try again in a moment.
            </ThemedText>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {hasPlans && <Button title={ctaLabel} loading={busy} onPress={startTrial} />}
          {pkg && (
            <ThemedText variant="caption" color="textTertiary" style={styles.center}>
              {trial ? `${cap(trial)}, then ` : ''}
              {pkg.product.priceString}/{selected === 'annual' ? 'year' : 'month'} · No charge today
              · Cancel anytime
            </ThemedText>
          )}
          <View style={styles.footerLinks}>
            <Pressable onPress={onRestore} disabled={busy} accessibilityRole="button">
              <ThemedText variant="caption" color="primary">
                Restore
              </ThemedText>
            </Pressable>
            <ThemedText variant="caption" color="textTertiary">
              ·
            </ThemedText>
            <Pressable onPress={() => Linking.openURL(TERMS_URL)} accessibilityRole="link">
              <ThemedText variant="caption" color="textTertiary">
                Terms
              </ThemedText>
            </Pressable>
            <ThemedText variant="caption" color="textTertiary">
              ·
            </ThemedText>
            <Pressable onPress={() => Linking.openURL(PRIVACY_URL)} accessibilityRole="link">
              <ThemedText variant="caption" color="textTertiary">
                Privacy
              </ThemedText>
            </Pressable>
          </View>
          {__DEV__ && (
            <Pressable
              onPress={() => setEntitlement('pro')}
              accessibilityRole="button"
              style={styles.devSkip}>
              <ThemedText variant="caption" color="textTertiary">
                Skip for now (dev)
              </ThemedText>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

function GlowBg({ color }: { color: string }) {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="paywallGlow" cx="50%" cy="2%" r="70%">
          <Stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#paywallGlow)" />
    </Svg>
  );
}

function GlowIcon({ icon }: { icon: IconSymbolName }) {
  const theme = useTheme();
  return (
    <View
      style={[styles.glowIcon, { backgroundColor: theme.primaryTint, shadowColor: theme.primary }]}>
      <IconSymbol name={icon} color={theme.primary} size={34} />
    </View>
  );
}

function PlanCard({
  label,
  price,
  sublabel,
  badge,
  popular,
  selected,
  onPress,
}: {
  label: string;
  price: string;
  sublabel: string;
  badge?: string | null;
  popular?: boolean;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.plan,
        { backgroundColor: theme.surface, borderColor: selected ? theme.primary : theme.border },
        selected && {
          borderWidth: 2,
          shadowColor: theme.primary,
          shadowOpacity: 0.3,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
          elevation: 6,
        },
      ]}>
      {popular && (
        <View style={[styles.popular, { backgroundColor: theme.primary }]}>
          <ThemedText variant="caption" style={styles.popularText}>
            MOST POPULAR
          </ThemedText>
        </View>
      )}
      <View style={styles.planRow}>
        <View
          style={[
            styles.radio,
            { borderColor: selected ? theme.primary : theme.border },
            selected && { backgroundColor: theme.primary },
          ]}>
          {selected && <IconSymbol name="checkmark" color="#FFFFFF" size={13} />}
        </View>
        <View style={styles.planMain}>
          <ThemedText variant="sectionHeader">{label}</ThemedText>
          <ThemedText variant="caption" color="textTertiary">
            {sublabel}
          </ThemedText>
        </View>
        <View style={styles.planRight}>
          <ThemedText variant="sectionHeader">{price}</ThemedText>
          {badge && (
            <View style={[styles.badge, { backgroundColor: theme.primaryTint }]}>
              <ThemedText variant="caption" color="primary" style={styles.badgeText}>
                {badge}
              </ThemedText>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

/** "Save 40%" badge for the annual plan vs 12× the monthly price, when both exist. */
function savingsBadge(
  annual: PurchasesPackage | null,
  monthly: PurchasesPackage | null,
): string | null {
  const yearly = annual?.product.pricePerYear ?? null;
  const monthlyPrice = monthly?.product.price ?? null;
  if (!yearly || !monthlyPrice) return 'Best value';
  const fullYear = monthlyPrice * 12;
  if (fullYear <= yearly) return 'Best value';
  const pct = Math.round((1 - yearly / fullYear) * 100);
  return pct > 0 ? `Save ${pct}%` : 'Best value';
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  root: { flex: 1 },
  center: { textAlign: 'center', alignItems: 'center', justifyContent: 'center' },
  scroll: {
    paddingHorizontal: ScreenPadding,
    paddingTop: Spacing.md,
    gap: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  hero: { alignItems: 'center', gap: Spacing.md, paddingTop: Spacing.sm },
  glowIcon: {
    width: 68,
    height: 68,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.5,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
  },
  title: { fontSize: 26, lineHeight: 32 },
  planChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
  },
  planChipText: { fontWeight: '600' },
  features: { gap: Spacing.md },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { flex: 1 },
  social: {
    alignItems: 'center',
    gap: Spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  stars: { flexDirection: 'row', gap: 3 },
  plans: { gap: Spacing.md },
  plan: { borderWidth: 1.5, borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.sm },
  popular: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  popularText: { color: '#FFFFFF', fontWeight: '700', letterSpacing: 0.5 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  radio: {
    width: 24,
    height: 24,
    borderRadius: Radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planMain: { flex: 1, gap: 2 },
  planRight: { alignItems: 'flex-end', gap: 4 },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 1, borderRadius: Radius.pill },
  badgeText: { fontWeight: '700' },
  footer: { paddingHorizontal: ScreenPadding, paddingTop: Spacing.sm, gap: Spacing.sm },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  devSkip: { alignItems: 'center', paddingTop: Spacing.xs },
});
