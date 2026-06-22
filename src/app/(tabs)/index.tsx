import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AnimatedEntrance } from '@/components/animated-entrance';
import { Card } from '@/components/card';
import { EstimateScopeNote } from '@/components/estimate-scope-note';
import { IconSymbol } from '@/components/icon-symbol';
import { Screen } from '@/components/screen';
import { StateCoverageNotice } from '@/components/state-coverage-notice';
import { ThemedText } from '@/components/themed-text';
import { DEFAULT_TAX_YEAR } from '@/config/tax-year';
import { Radius, Spacing, useTheme } from '@/design';
import { CoverageStreak } from '@/features/dashboard/coverage-streak';
import { MilestoneCelebration } from '@/features/dashboard/milestone-celebration';
import {
  getCelebratedMilestone,
  highestMilestoneReached,
  setCelebratedMilestone,
} from '@/features/dashboard/milestones';
import { QuarterlyProgress } from '@/features/dashboard/quarterly-progress';
import { useDashboardData } from '@/features/dashboard/use-dashboard-data';
import { useHabitData } from '@/features/dashboard/use-habit-data';
import { formatUSD } from '@/lib/money';
import { useCountUp } from '@/lib/use-count-up';

/** Home / Dashboard (PRD §8.2): "am I covered?" answered at a glance, with the habit layer. */
export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const data = useDashboardData();
  const habit = useHabitData();
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [celebrating, setCelebrating] = useState<number | null>(null);

  const total = data?.totalSetAside ?? 0;
  const heroValue = useCountUp(total);

  // Celebrate a savings milestone once per year (the first time it's reached).
  useEffect(() => {
    let cancelled = false;
    const reached = highestMilestoneReached(total);
    if (!reached) return;
    getCelebratedMilestone(DEFAULT_TAX_YEAR).then((celebrated) => {
      if (cancelled || reached <= celebrated) return;
      setCelebrating(reached);
      void setCelebratedMilestone(DEFAULT_TAX_YEAR, reached);
    });
    return () => {
      cancelled = true;
    };
  }, [total]);

  const covered = (data?.hasPayments ?? false) && !(habit?.atRisk ?? false);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {celebrating != null && (
          <MilestoneCelebration threshold={celebrating} onDismiss={() => setCelebrating(null)} />
        )}

        <AnimatedEntrance index={0}>
          <View style={styles.headerRow}>
            <ThemedText variant="screenTitle">{greeting()}</ThemedText>
            <View style={[styles.yearChip, { backgroundColor: theme.surface }]}>
              <ThemedText variant="secondary" color="textSecondary">
                {DEFAULT_TAX_YEAR}
              </ThemedText>
            </View>
          </View>
        </AnimatedEntrance>

        <AnimatedEntrance index={1}>
          <View style={[styles.hero, { backgroundColor: theme.primaryTint }]}>
            <ThemedText variant="secondary" color="textSecondary">
              Set aside this year
            </ThemedText>
            <ThemedText variant="heroNumber" style={styles.heroNumber}>
              {formatUSD(heroValue)}
            </ThemedText>
            {data?.hasPayments ? (
              <View style={styles.statusRow}>
                <IconSymbol
                  name={covered ? 'checkmark.circle.fill' : 'exclamationmark.triangle.fill'}
                  color={covered ? theme.success : theme.warning}
                  size={18}
                />
                <ThemedText variant="body" color={covered ? 'success' : 'warning'}>
                  {covered ? "You're covered for taxes" : 'Action needed to stay covered'}
                </ThemedText>
              </View>
            ) : (
              <ThemedText variant="body" color="textSecondary">
                Add your first payment to see how much to set aside.
              </ThemedText>
            )}
          </View>
        </AnimatedEntrance>

        <StateCoverageNotice />

        {habit && (
          <AnimatedEntrance index={2}>
            <CoverageStreak
              streak={habit.coveredWeeksStreak}
              weeks={habit.weeklySetAside}
              atRisk={habit.atRisk}
              atRiskAmount={habit.atRiskAmount}
              dueDate={habit.quarterly?.dueDate}
            />
          </AnimatedEntrance>
        )}

        {habit?.quarterly && (
          <AnimatedEntrance index={3}>
            <QuarterlyProgress {...habit.quarterly} atRisk={habit.atRisk} />
          </AnimatedEntrance>
        )}

        <AnimatedEntrance index={4} style={styles.cardRow}>
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
            <BreakdownRow label="State income tax" value={data.componentBreakdown.state} />
          </Card>
        )}

        <AnimatedEntrance index={5} style={styles.cardRow}>
          <EntryCard
            title="Deductions"
            icon="tag.fill"
            onPress={() => router.navigate('/(tabs)/more')}
          />
          <EntryCard
            title="Reports"
            icon="doc.text.fill"
            onPress={() => router.navigate('/(tabs)/more')}
          />
        </AnimatedEntrance>

        <EstimateScopeNote />
      </ScrollView>
    </Screen>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function EntryCard({
  title,
  icon,
  onPress,
}: {
  title: string;
  icon: 'tag.fill' | 'doc.text.fill';
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable style={styles.halfCard} onPress={onPress} accessibilityRole="button">
      <Card style={styles.fill}>
        <IconSymbol name={icon} color={theme.primary} size={22} />
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
  hero: { gap: Spacing.xs, padding: Spacing.xl, borderRadius: Radius.xl },
  heroNumber: { fontSize: 46, lineHeight: 52 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.xs },
  cardRow: { flexDirection: 'row', gap: Spacing.md },
  halfCard: { flex: 1 },
  fill: { flex: 1, gap: Spacing.xs },
  cardValue: { marginTop: Spacing.xxs },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
});
