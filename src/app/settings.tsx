import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Children, Fragment, type ReactNode, useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { IconSymbol, type IconSymbolName } from '@/components/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { isProNow, useEntitlementStore, useIsPro, type SubStatus } from '@/config/gating';
import { PRIVACY_URL, TERMS_URL } from '@/config/legal';
import { DEFAULT_TAX_YEAR } from '@/config/tax-year';
import { FILING_STATUS_LABELS } from '@/domain';
import { Radius, Spacing, type ThemeColor, useTheme } from '@/design';
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

const ROW_ICON = 30;
const ROW_TEXT_INSET = Spacing.lg + ROW_ICON + Spacing.md;

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

  const sub = subscriptionMeta(status, expiresAt);

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <ProfileHero
        title={profile ? FILING_STATUS_LABELS[profile.filing_status] : 'Set up your profile'}
        subtitle={
          profile
            ? `${stateName(profile.state)} · ${formatUSD(profile.estimated_annual_income)} · ${DEFAULT_TAX_YEAR}`
            : 'Filing status, state, and income'
        }
        onPress={() => router.navigate('/edit-profile')}
      />

      <Section title="Notifications">
        <Row
          icon="bell.fill"
          label="Quarterly reminders"
          accessory={
            <Switch
              value={remindersOn}
              onValueChange={toggleReminders}
              trackColor={{ true: theme.primary }}
            />
          }
        />
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
        <Row icon="crown.fill" label="Current plan" value={sub.label} valueColor={sub.tone} />
        <Row
          icon="creditcard.fill"
          label="Manage subscription"
          accessory="chevron"
          onPress={manageSubscription}
        />
        <Row icon="arrow.clockwise" label="Restore purchases" onPress={restore} />
      </Section>

      <Section title="About">
        <Row
          icon="doc.text.fill"
          label="Terms of Service"
          accessory="external"
          onPress={() => Linking.openURL(TERMS_URL)}
        />
        <Row
          icon="lock.fill"
          label="Privacy Policy"
          accessory="external"
          onPress={() => Linking.openURL(PRIVACY_URL)}
        />
        <Row icon="info.circle.fill" label="Version" value={Constants.expoConfig?.version ?? '—'} />
      </Section>

      <Section title="Account">
        <Row
          icon="rectangle.portrait.and.arrow.right"
          iconTone="danger"
          label="Sign out"
          labelColor="danger"
          onPress={confirmSignOut}
        />
      </Section>

      {__DEV__ && (
        <Section title="Developer">
          <Row
            icon="wrench.and.screwdriver.fill"
            label="Simulate Pro"
            accessory={
              <Switch
                value={isPro}
                onValueChange={(v) => setEntitlement(v ? 'pro' : 'free')}
                trackColor={{ true: theme.primary }}
              />
            }
          />
          <Row
            icon="arrow.counterclockwise"
            label="Reset onboarding"
            onPress={() => {
              // Clear the dev entitlement too, so the re-run lands on the paywall.
              setEntitlement('free');
              useProfileStore.getState().reset();
            }}
          />
        </Section>
      )}

      <ThemedText variant="caption" color="textTertiary" style={styles.disclaimer}>
        {DISCLAIMER}
      </ThemedText>
    </ScrollView>
  );
}

function subscriptionMeta(
  status: SubStatus,
  expiresAt: string | null,
): { label: string; tone: ThemeColor } {
  const date = expiresAt
    ? new Date(expiresAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;
  switch (status) {
    case 'trial':
      return { label: date ? `Free trial · ends ${date}` : 'Free trial', tone: 'success' };
    case 'active':
      return { label: date ? `Active · renews ${date}` : 'Active', tone: 'success' };
    case 'expired':
      return { label: 'Expired', tone: 'warning' };
    default:
      return { label: 'Not subscribed', tone: 'textSecondary' };
  }
}

function ProfileHero({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <View style={[styles.hero, { backgroundColor: theme.primaryTint }]}>
        <View style={[styles.heroIcon, { backgroundColor: theme.primary }]}>
          <IconSymbol name="person.text.rectangle.fill" color="#FFFFFF" size={20} />
        </View>
        <View style={styles.heroMain}>
          <ThemedText variant="sectionHeader">{title}</ThemedText>
          <ThemedText variant="caption" color="textSecondary">
            {subtitle}
          </ThemedText>
        </View>
        <IconSymbol name="chevron.right" color={theme.primary} size={15} />
      </View>
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const theme = useTheme();
  const items = Children.toArray(children);
  return (
    <View style={styles.section}>
      <ThemedText variant="caption" color="textTertiary" style={styles.sectionTitle}>
        {title.toUpperCase()}
      </ThemedText>
      <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {items.map((child, i) => (
          <Fragment key={i}>
            {child}
            {i < items.length - 1 && (
              <View style={[styles.separator, { backgroundColor: theme.border }]} />
            )}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

function Row({
  icon,
  iconTone = 'primary',
  label,
  labelColor,
  value,
  valueColor = 'textSecondary',
  accessory,
  onPress,
}: {
  icon: IconSymbolName;
  iconTone?: ThemeColor;
  label: string;
  labelColor?: ThemeColor;
  value?: string;
  valueColor?: ThemeColor;
  accessory?: 'chevron' | 'external' | ReactNode;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const Container = onPress ? Pressable : View;
  return (
    <Container
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: theme.primaryTint }]}>
        <IconSymbol name={icon} color={theme[iconTone]} size={16} />
      </View>
      <ThemedText variant="body" color={labelColor} style={styles.rowLabel}>
        {label}
      </ThemedText>
      {value != null && (
        <ThemedText variant="body" color={valueColor}>
          {value}
        </ThemedText>
      )}
      {accessory === 'chevron' ? (
        <IconSymbol name="chevron.right" color={theme.textTertiary} size={14} />
      ) : accessory === 'external' ? (
        <IconSymbol name="arrow.up.right" color={theme.textTertiary} size={13} />
      ) : (
        accessory
      )}
    </Container>
  );
}

const SEG_PAD = 3;
const SEG_GAP = 3;

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
  const [width, setWidth] = useState(0);
  const n = options.length;
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const segWidth = width > 0 ? (width - SEG_PAD * 2 - SEG_GAP * (n - 1)) / n : 0;

  const tx = useSharedValue(0);
  useEffect(() => {
    tx.value = withSpring(SEG_PAD + index * (segWidth + SEG_GAP), {
      damping: 18,
      stiffness: 220,
    });
  }, [index, segWidth, tx]);
  const indicatorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.segmented, { backgroundColor: theme.surface }]}>
      {segWidth > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.segIndicator,
            { width: segWidth, backgroundColor: theme.primary },
            indicatorStyle,
          ]}
        />
      )}
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={styles.segment}>
            <ThemedText
              variant="secondary"
              style={{
                color: active ? '#FFFFFF' : theme.textSecondary,
                fontWeight: active ? '600' : '400',
              }}>
              {opt.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.xl, paddingBottom: Spacing.xxxl },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.xl,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroMain: { flex: 1, gap: 2 },
  section: { gap: Spacing.sm },
  sectionTitle: { paddingHorizontal: Spacing.xs },
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
    minHeight: 52,
  },
  rowIcon: {
    width: ROW_ICON,
    height: ROW_ICON,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { flex: 1 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: ROW_TEXT_INSET },
  disclaimer: { paddingHorizontal: Spacing.xs, lineHeight: 18, textAlign: 'center' },
  segmented: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    padding: SEG_PAD,
    gap: SEG_GAP,
    position: 'relative',
  },
  segIndicator: {
    position: 'absolute',
    top: SEG_PAD,
    bottom: SEG_PAD,
    left: 0,
    borderRadius: Radius.sm,
  },
  segment: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.sm, alignItems: 'center' },
});
