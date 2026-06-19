import { useEffect, useState } from 'react';
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

import { Button } from '@/components/button';
import { IconSymbol, type IconSymbolName } from '@/components/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { isProNow, useEntitlementStore } from '@/config/gating';
import { Radius, Spacing, useTheme } from '@/design';
import {
  freeTrialLabel,
  getSubscriptionPackages,
  isUserCancelled,
  purchasePackage,
  restorePurchases,
} from '@/services/purchases';

// TODO(launch): point these at the real hosted pages before App Store submission.
const TERMS_URL = 'https://freelancetax.app/terms';
const PRIVACY_URL = 'https://freelancetax.app/privacy';

const FEATURES: { icon: IconSymbolName; text: string }[] = [
  { icon: 'chart.bar.fill', text: 'Know what to set aside on every payment' },
  { icon: 'building.columns.fill', text: 'Federal + state tax estimates' },
  { icon: 'tag.fill', text: 'Track deductions to lower your bill' },
  { icon: 'doc.text.fill', text: 'Accountant-ready PDF reports' },
  { icon: 'bubble.left.fill', text: 'Ask AI your freelance tax questions' },
  { icon: 'bell.fill', text: 'Quarterly deadline reminders' },
];

type PlanKey = 'annual' | 'monthly';

export function PaywallScreen() {
  const theme = useTheme();
  const setEntitlement = useEntitlementStore((s) => s.setEntitlement);

  const [annual, setAnnual] = useState<PurchasesPackage | null>(null);
  const [monthly, setMonthly] = useState<PurchasesPackage | null>(null);
  const [selected, setSelected] = useState<PlanKey>('annual');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

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
      // The root gate routes to the app once the entitlement flips to `pro`.
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
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  const hasPlans = Boolean(annual || monthly);
  const cta = trial ? 'Start free trial' : 'Subscribe';

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <IconSymbol name="leaf.fill" color={theme.primary} size={44} />
        <ThemedText variant="screenTitle" style={styles.center}>
          Unlock Taxnest
        </ThemedText>
        <ThemedText variant="body" color="textSecondary" style={styles.center}>
          {trial
            ? `Try everything free for ${trial.replace(' free trial', '')}. Cancel anytime.`
            : 'Everything you need to stay ahead of your taxes.'}
        </ThemedText>
      </View>

      <View style={styles.features}>
        {FEATURES.map((f) => (
          <View key={f.text} style={styles.featureRow}>
            <IconSymbol name={f.icon} color={theme.primary} size={20} />
            <ThemedText variant="body" style={styles.featureText}>
              {f.text}
            </ThemedText>
          </View>
        ))}
      </View>

      {hasPlans ? (
        <View style={styles.plans}>
          {annual && (
            <PlanCard
              label="Annual"
              price={annual.product.priceString}
              sublabel={
                annual.product.pricePerMonthString
                  ? `${annual.product.pricePerMonthString}/mo`
                  : 'Billed yearly'
              }
              badge={savingsBadge(annual, monthly)}
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

      {hasPlans && <Button title={cta} loading={busy} onPress={startTrial} style={styles.cta} />}

      {pkg && (
        <ThemedText variant="caption" color="textTertiary" style={styles.center}>
          {trial ? `${cap(trial)}, then ` : ''}
          {pkg.product.priceString}/{selected === 'annual' ? 'year' : 'month'}. Auto-renews until
          cancelled.
        </ThemedText>
      )}

      <Pressable
        onPress={onRestore}
        disabled={busy}
        style={styles.restore}
        accessibilityRole="button">
        <ThemedText variant="body" color="primary">
          Restore purchases
        </ThemedText>
      </Pressable>

      <View style={styles.legalRow}>
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
          style={styles.devSkip}
          accessibilityRole="button">
          <ThemedText variant="caption" color="textTertiary">
            Skip for now (dev)
          </ThemedText>
        </Pressable>
      )}
    </ScrollView>
  );
}

function PlanCard({
  label,
  price,
  sublabel,
  badge,
  selected,
  onPress,
}: {
  label: string;
  price: string;
  sublabel: string;
  badge?: string | null;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[
        styles.plan,
        { borderColor: selected ? theme.primary : theme.border, backgroundColor: theme.surface },
        selected && { borderWidth: 2 },
      ]}>
      <View style={styles.planMain}>
        <ThemedText variant="sectionHeader">{label}</ThemedText>
        <ThemedText variant="caption" color="textTertiary">
          {sublabel}
        </ThemedText>
      </View>
      <View style={styles.planRight}>
        {badge && (
          <View style={[styles.badge, { backgroundColor: theme.primary }]}>
            <ThemedText variant="caption" style={styles.badgeText}>
              {badge}
            </ThemedText>
          </View>
        )}
        <ThemedText variant="body">{price}</ThemedText>
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
  center: { textAlign: 'center', alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  hero: { alignItems: 'center', gap: Spacing.sm, paddingTop: Spacing.xl },
  features: { gap: Spacing.md, paddingHorizontal: Spacing.xs },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  featureText: { flex: 1 },
  plans: { gap: Spacing.md },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  planMain: { gap: 2 },
  planRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.pill },
  badgeText: { color: '#FFFFFF' },
  cta: { marginTop: Spacing.sm },
  restore: { alignItems: 'center', paddingVertical: Spacing.sm },
  legalRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm },
  devSkip: { alignItems: 'center', paddingVertical: Spacing.md },
});
