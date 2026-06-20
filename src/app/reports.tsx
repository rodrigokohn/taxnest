import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedEntrance } from '@/components/animated-entrance';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { IconSymbol } from '@/components/icon-symbol';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { DEFAULT_TAX_YEAR } from '@/config/tax-year';
import { Radius, Spacing, useTheme } from '@/design';
import { formatUSD } from '@/lib/money';
import { gatherReportData, type ReportData } from '@/features/reports/report-data';
import { generateAndShareReport } from '@/features/reports/generate-report';

/** Reports (PRD §8.7). */
export default function ReportsRoute() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    gatherReportData(DEFAULT_TAX_YEAR)
      .then((d) => !cancelled && setData(d))
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  async function generate() {
    setBusy(true);
    try {
      await generateAndShareReport(DEFAULT_TAX_YEAR);
    } catch {
      Alert.alert('Reports', 'Could not generate the report. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen edges={[]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <AnimatedEntrance index={0}>
          <View style={styles.hero}>
            <View style={[styles.heroIcon, { backgroundColor: theme.primaryTint }]}>
              <IconSymbol name="doc.text.fill" color={theme.primary} size={28} />
            </View>
            <ThemedText variant="screenTitle" style={styles.center}>
              Your {DEFAULT_TAX_YEAR} tax report
            </ThemedText>
            <ThemedText variant="body" color="textSecondary" style={styles.center}>
              A clean summary you can send straight to your accountant.
            </ThemedText>
          </View>
        </AnimatedEntrance>

        {loading ? (
          <ActivityIndicator color={theme.primary} style={styles.loader} />
        ) : data ? (
          <AnimatedEntrance index={1}>
            <Card style={styles.preview}>
              <ThemedText variant="caption" color="textTertiary" style={styles.previewTitle}>
                INCLUDED IN YOUR REPORT
              </ThemedText>
              <PreviewRow label="Total income" value={formatUSD(data.totals.income)} />
              <PreviewRow label="Deductions" value={`− ${formatUSD(data.totals.deductions)}`} />
              <PreviewRow label="Net profit" value={formatUSD(data.totals.netProfit)} />

              <View style={[styles.previewDivider, { backgroundColor: theme.border }]} />

              <PreviewRow label="Estimated tax" value={formatUSD(data.tax.total)} strong />
              <PreviewSubRow label="Self-employment" value={formatUSD(data.tax.se)} />
              <PreviewSubRow label="Federal income" value={formatUSD(data.tax.federal)} />
              {data.tax.includeState && data.tax.state > 0 && (
                <PreviewSubRow label="State income" value={formatUSD(data.tax.state)} />
              )}
            </Card>
          </AnimatedEntrance>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <Button title="Generate tax report (PDF)" loading={busy} onPress={generate} />
        <ThemedText variant="caption" color="textTertiary" style={styles.center}>
          Exports a PDF you can share or print.
        </ThemedText>
      </View>
    </Screen>
  );
}

function PreviewRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.previewRow}>
      <ThemedText
        variant={strong ? 'body' : 'secondary'}
        color={strong ? 'textPrimary' : 'textSecondary'}>
        {label}
      </ThemedText>
      <ThemedText variant={strong ? 'sectionHeader' : 'body'} style={styles.tabular}>
        {value}
      </ThemedText>
    </View>
  );
}

function PreviewSubRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.previewSubRow}>
      <ThemedText variant="caption" color="textTertiary">
        {label}
      </ThemedText>
      <ThemedText variant="caption" color="textTertiary" style={styles.tabular}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.xl, paddingBottom: Spacing.xxxl },
  hero: { alignItems: 'center', gap: Spacing.sm, paddingTop: Spacing.xl },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  center: { textAlign: 'center' },
  loader: { marginTop: Spacing.xl },
  preview: { gap: Spacing.sm },
  previewTitle: { marginBottom: Spacing.xs },
  previewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  previewSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: Spacing.md,
  },
  previewDivider: { height: StyleSheet.hairlineWidth, marginVertical: Spacing.sm },
  tabular: { fontVariant: ['tabular-nums'] },
  footer: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, gap: Spacing.sm },
});
