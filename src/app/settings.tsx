import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { IconSymbol } from '@/components/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { isProNow, useEntitlementStore, useIsPro, type SubStatus } from '@/config/gating';
import { PRIVACY_URL, TERMS_URL } from '@/config/legal';
import { DEFAULT_TAX_YEAR } from '@/config/tax-year';
import { FILING_STATUS_LABELS } from '@/domain';
import { Radius, Spacing, useTheme } from '@/design';
import { formatUSD } from '@/lib/money';
import { stateName } from '@/lib/us-states';
import {
  cancelQuarterlyReminders,
  getNotificationsGranted,
  requestNotificationPermission,
  scheduleQuarterlyReminders,
} from '@/services/notifications';
import { restorePurchases } from '@/services/purchases';
import { useAuthStore, useProfileStore, useTaxConfigStore } from '@/store';
import { useThemeStore, type ThemePreference } from '@/store/theme-store';

const DISCLAIMER =
  'Taxnest provides estimates for planning purposes only. It is not tax, legal, or ' +
  'financial advice and does not replace a licensed tax professional.';

/** Settings (PRD §8.9). */
export default function SettingsScreen() {
  const theme = useTheme();
  const profile = useProfileStore((s) => s.profile);
  const isPro = useIsPro();
  const status = useEntitlementStore((s) => s.status);
  const expiresAt = useEntitlementStore((s) => s.expiresAt);
  const setEntitlement = useEntitlementStore((s) => s.setEntitlement);
  const config = useTaxConfigStore((s) => s.config);
  const router = useRouter();
  const signOut = useAuthStore((s) => s.signOut);
  const themePreference = useThemeStore((s) => s.preference);
  const setThemePreference = useThemeStore((s) => s.setPreference);

  function confirmSignOut() {
    Alert.alert('Sign out', 'Sign out of Taxnest?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  function manageSubscription() {
    Linking.openURL('itms-apps://apps.apple.com/account/subscriptions').catch(() => {
      Linking.openURL('https://apps.apple.com/account/subscriptions');
    });
  }

  async function restore() {
    try {
      const info = await restorePurchases();
      if (info) useEntitlementStore.getState().applyCustomerInfo(info);
      Alert.alert(
        isProNow() ? 'Restored' : 'Nothing to restore',
        isProNow()
          ? 'Your subscription is active.'
          : 'No active subscription was found for this Apple ID.',
      );
    } catch {
      Alert.alert('Restore failed', 'Please try again.');
    }
  }

  const [remindersOn, setRemindersOn] = useState(false);
  useEffect(() => {
    getNotificationsGranted().then(setRemindersOn);
  }, []);

  async function toggleReminders(value: boolean) {
    if (value) {
      const granted = await requestNotificationPermission();
      if (granted) await scheduleQuarterlyReminders(config?.quarterly_deadlines ?? []);
      setRemindersOn(granted);
    } else {
      await cancelQuarterlyReminders();
      setRemindersOn(false);
    }
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <Section title="Tax profile">
        <Row
          label="Filing status"
          value={profile ? FILING_STATUS_LABELS[profile.filing_status] : '—'}
        />
        <Row label="State" value={profile ? stateName(profile.state) : '—'} />
        <Row
          label="Estimated income"
          value={profile ? formatUSD(profile.estimated_annual_income) : '—'}
        />
        <Row label="Tax year" value={String(DEFAULT_TAX_YEAR)} />
        <Pressable
          onPress={() => router.navigate('/edit-profile')}
          style={styles.row}
          accessibilityRole="button">
          <ThemedText variant="body" color="primary">
            Edit tax profile
          </ThemedText>
          <IconSymbol name="chevron.right" color={theme.textTertiary} size={14} />
        </Pressable>
      </Section>

      <Section title="Notifications">
        <View style={styles.row}>
          <ThemedText variant="body">Quarterly reminders</ThemedText>
          <Switch
            value={remindersOn}
            onValueChange={toggleReminders}
            trackColor={{ true: theme.primary }}
          />
        </View>
      </Section>

      <View style={styles.section}>
        <ThemedText variant="caption" color="textTertiary" style={styles.sectionTitle}>
          APPEARANCE
        </ThemedText>
        <Segmented
          value={themePreference}
          onChange={setThemePreference}
          options={[
            { value: 'system', label: 'System' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
        />
      </View>

      <Section title="Subscription">
        <Row label="Current plan" value={subscriptionLabel(status, expiresAt)} />
        <Pressable onPress={manageSubscription} style={styles.row} accessibilityRole="button">
          <ThemedText variant="body" color="primary">
            Manage subscription
          </ThemedText>
          <IconSymbol name="chevron.right" color={theme.textTertiary} size={14} />
        </Pressable>
        <Pressable onPress={restore} style={styles.row} accessibilityRole="button">
          <ThemedText variant="body" color="primary">
            Restore purchases
          </ThemedText>
        </Pressable>
        {__DEV__ && (
          <>
            <View style={styles.row}>
              <ThemedText variant="body">Simulate Pro (dev)</ThemedText>
              <Switch
                value={isPro}
                onValueChange={(v) => setEntitlement(v ? 'pro' : 'free')}
                trackColor={{ true: theme.primary }}
              />
            </View>
            <Pressable
              onPress={() => {
                // Clear the dev entitlement too, so the re-run lands on the paywall.
                setEntitlement('free');
                useProfileStore.getState().reset();
              }}
              style={styles.row}
              accessibilityRole="button">
              <ThemedText variant="body" color="primary">
                Reset onboarding (dev)
              </ThemedText>
            </Pressable>
          </>
        )}
      </Section>

      <Section title="About">
        <ThemedText variant="secondary" color="textSecondary" style={styles.disclaimer}>
          {DISCLAIMER}
        </ThemedText>
        <Pressable
          onPress={() => Linking.openURL(TERMS_URL)}
          style={styles.row}
          accessibilityRole="link">
          <ThemedText variant="body" color="primary">
            Terms of Service
          </ThemedText>
          <IconSymbol name="arrow.up.right" color={theme.textTertiary} size={13} />
        </Pressable>
        <Pressable
          onPress={() => Linking.openURL(PRIVACY_URL)}
          style={styles.row}
          accessibilityRole="link">
          <ThemedText variant="body" color="primary">
            Privacy Policy
          </ThemedText>
          <IconSymbol name="arrow.up.right" color={theme.textTertiary} size={13} />
        </Pressable>
        <Row label="Version" value={Constants.expoConfig?.version ?? '—'} />
      </Section>

      <Section title="Account">
        <Pressable onPress={confirmSignOut} style={styles.row} accessibilityRole="button">
          <ThemedText variant="body" color="danger">
            Sign out
          </ThemedText>
        </Pressable>
      </Section>
    </ScrollView>
  );
}

function subscriptionLabel(status: SubStatus, expiresAt: string | null): string {
  const date = expiresAt
    ? new Date(expiresAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;
  switch (status) {
    case 'trial':
      return date ? `Free trial · ends ${date}` : 'Free trial';
    case 'active':
      return date ? `Active · renews ${date}` : 'Active';
    case 'expired':
      return 'Expired';
    default:
      return 'Not subscribed';
  }
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: ThemePreference;
  onChange: (v: ThemePreference) => void;
  options: { value: ThemePreference; label: string }[];
}) {
  const theme = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: theme.surface }]}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.segment, active && { backgroundColor: theme.primary }]}>
            <ThemedText
              variant="secondary"
              style={{ color: active ? '#FFFFFF' : theme.textSecondary }}>
              {opt.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <ThemedText variant="caption" color="textTertiary" style={styles.sectionTitle}>
        {title.toUpperCase()}
      </ThemedText>
      <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {children}
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <ThemedText variant="body">{label}</ThemedText>
      <ThemedText variant="body" color="textSecondary">
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.xl, paddingBottom: Spacing.xxxl },
  section: { gap: Spacing.sm },
  sectionTitle: { paddingHorizontal: Spacing.xs },
  group: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  disclaimer: { padding: Spacing.lg, lineHeight: 22 },
  segmented: { flexDirection: 'row', borderRadius: Radius.md, padding: 3, gap: 3 },
  segment: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.sm, alignItems: 'center' },
});
