import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AnimatedEntrance } from '@/components/animated-entrance';
import { Card } from '@/components/card';
import { IconSymbol } from '@/components/icon-symbol';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useIsPro } from '@/config/gating';
import { DEFAULT_TAX_YEAR } from '@/config/tax-year';
import { Radius, Spacing, useTheme } from '@/design';
import { shortDate } from '@/lib/deadlines';
import { formatUSD } from '@/lib/money';
import { useCountUp } from '@/lib/use-count-up';
import { useDashboardData } from '@/features/dashboard/use-dashboard-data';

/** Home / Dashboard (PRD §8.2): "am I covered?" answered at a glance. */
export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const data = useDashboardData();
  const isPro = useIsPro();
  const [showBreakdown, setShowBreakdown] = useState(false);

  const heroValue = useCountUp(data?.totalSetAside ?? 0);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <AnimatedEntrance index={0}>
          <View style={styles.headerRow}>
            <ThemedText variant="screenTitle">Hi 👋</ThemedText>
            <View style={[styles.yearChip, { backgroundColor: theme.surface }]}>
              <ThemedText variant="secondary" color="textSecondary">
                {DEFAULT_TAX_YEAR}
              </ThemedText>
            </View>
          </View>
        </AnimatedEntrance>

        <AnimatedEntrance index={1}>
          <View style={styles.hero}>
            <ThemedText variant="secondary" color="textSecondary">
              Set aside this year
            </ThemedText>
            <ThemedText variant="heroNumber" style={styles.heroNumber}>
              {formatUSD(heroValue)}
            </ThemedText>
            {data?.hasPayments ? (
              <View style={styles.statusRow}>
                <IconSymbol name="checkmark.circle.fill" color={theme.success} size={18} />
                <ThemedText variant="body" color="success">
                  You&apos;re covered so far
                </ThemedText>
              </View>
            ) : (
              <ThemedText variant="body" color="textSecondary">
                Add your first payment to see how much to set aside.
              </ThemedText>
            )}
          </View>
        </AnimatedEntrance>

        {data?.nextDeadline && (
          <AnimatedEntrance index={2}>
            <Pressable onPress={() => router.navigate('/(tabs)/taxes')} accessibilityRole="button">
              <NextDeadlineCard
                quarter={data.nextDeadline.quarter}
                date={data.nextDeadline.date}
                daysRemaining={data.nextDeadline.daysRemaining}
                isOverdue={data.nextDeadline.isOverdue}
                suggested={data.suggestedQuarterly}
              />
            </Pressable>
          </AnimatedEntrance>
        )}

        <AnimatedEntrance index={3} style={styles.cardRow}>
          <Pressable
            style={styles.halfCard}
            onPress={() => setShowBreakdown((v) => !v)}
            accessibilityRole="button">
            <Card style={styles.fill}>
              <ThemedText variant="secondary" color="textSecondary">
                Projected annual tax
              </ThemedText>
              <ThemedText variant="sectionHeader" style={styles.cardValue}>
                {formatUSD(data?.projectedTax ?? 0)}
              </ThemedText>
              {data?.usingEstimate && (
                <ThemedText variant="caption" color="textTertiary">
                  Based on your estimate
                </ThemedText>
              )}
            </Card>
          </Pressable>

          <View style={styles.halfCard}>
            <Card style={styles.fill}>
              <ThemedText variant="secondary" color="textSecondary">
                Effective tax rate
              </ThemedText>
              <ThemedText variant="sectionHeader" style={styles.cardValue}>
                {Math.round((data?.effectiveRate ?? 0) * 100)}%
              </ThemedText>
            </Card>
          </View>
        </AnimatedEntrance>

        {showBreakdown && data && (
          <Card>
            <BreakdownRow label="Self-employment tax" value={data.componentBreakdown.se} />
            <BreakdownRow label="Federal income tax" value={data.componentBreakdown.federal} />
            {data.includeState ? (
              <BreakdownRow label="State income tax" value={data.componentBreakdown.state} />
            ) : (
              <View style={styles.breakdownRow}>
                <ThemedText variant="secondary" color="textTertiary">
                  State income tax
                </ThemedText>
                <ThemedText variant="secondary" color="textTertiary">
                  Pro
                </ThemedText>
              </View>
            )}
          </Card>
        )}

        <AnimatedEntrance index={4} style={styles.cardRow}>
          <ProEntryCard
            title="Deductions"
            icon="tag.fill"
            locked={!isPro}
            onPress={() => router.navigate('/(tabs)/more')}
          />
          <ProEntryCard
            title="Reports"
            icon="doc.text.fill"
            locked={!isPro}
            onPress={() => router.navigate('/(tabs)/more')}
          />
        </AnimatedEntrance>
      </ScrollView>
    </Screen>
  );
}

function NextDeadlineCard({
  quarter,
  date,
  daysRemaining,
  isOverdue,
  suggested,
}: {
  quarter: number;
  date: string;
  daysRemaining: number;
  isOverdue: boolean;
  suggested: number;
}) {
  const theme = useTheme();
  const accent = isOverdue ? theme.danger : daysRemaining <= 14 ? theme.warning : theme.primary;
  const status = isOverdue ? 'overdue' : `in ${daysRemaining} days`;

  return (
    <Card style={[styles.deadlineCard, { borderLeftColor: accent, borderLeftWidth: 3 }]}>
      <ThemedText variant="secondary" color="textSecondary">
        Next quarterly payment
      </ThemedText>
      <ThemedText variant="sectionHeader" style={styles.cardValue}>
        Q{quarter} · due {shortDate(date)} · {status}
      </ThemedText>
      <ThemedText variant="body">Suggested: {formatUSD(suggested)}</ThemedText>
    </Card>
  );
}

function ProEntryCard({
  title,
  icon,
  locked,
  onPress,
}: {
  title: string;
  icon: 'tag.fill' | 'doc.text.fill';
  locked: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable style={styles.halfCard} onPress={onPress} accessibilityRole="button">
      <Card style={styles.fill}>
        <View style={styles.proHeader}>
          <IconSymbol name={icon} color={theme.primary} size={22} />
          {locked && <IconSymbol name="lock.fill" color={theme.textTertiary} size={16} />}
        </View>
        <ThemedText variant="body" style={styles.cardValue}>
          {title}
        </ThemedText>
      </Card>
    </Pressable>
  );
}

function BreakdownRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.breakdownRow}>
      <ThemedText variant="secondary" color="textSecondary">
        {label}
      </ThemedText>
      <ThemedText variant="secondary">{formatUSD(value)}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
  },
  yearChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
  },
  hero: { gap: Spacing.xs, paddingVertical: Spacing.md },
  heroNumber: { fontSize: 40, lineHeight: 46 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  deadlineCard: { gap: Spacing.xs },
  cardRow: { flexDirection: 'row', gap: Spacing.md },
  halfCard: { flex: 1 },
  fill: { flex: 1, gap: Spacing.xs },
  cardValue: { marginTop: Spacing.xxs },
  proHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
});
