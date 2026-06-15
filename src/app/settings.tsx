import Constants from 'expo-constants';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useEntitlementStore, useIsPro } from '@/config/gating';
import { DEFAULT_TAX_YEAR } from '@/config/tax-year';
import { FILING_STATUS_LABELS } from '@/domain';
import { Radius, Spacing, useTheme } from '@/design';
import { formatUSD } from '@/lib/money';
import { stateName } from '@/lib/us-states';
import { useProfileStore } from '@/store';

const DISCLAIMER =
  'FreelanceTax provides estimates for planning purposes only. It is not tax, legal, or ' +
  'financial advice and does not replace a licensed tax professional.';

/** Settings (PRD §8.9). */
export default function SettingsScreen() {
  const theme = useTheme();
  const profile = useProfileStore((s) => s.profile);
  const isPro = useIsPro();
  const setEntitlement = useEntitlementStore((s) => s.setEntitlement);

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
      </Section>

      <Section title="Subscription">
        <Row label="Current plan" value={isPro ? 'Pro' : 'Free'} />
        <View style={styles.row}>
          <ThemedText variant="body">Simulate Pro (dev)</ThemedText>
          <Switch
            value={isPro}
            onValueChange={(v) => setEntitlement(v ? 'pro' : 'free')}
            trackColor={{ true: theme.primary }}
          />
        </View>
      </Section>

      <Section title="About">
        <ThemedText variant="secondary" color="textSecondary" style={styles.disclaimer}>
          {DISCLAIMER}
        </ThemedText>
        <Row label="Version" value={Constants.expoConfig?.version ?? '—'} />
      </Section>
    </ScrollView>
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
});
