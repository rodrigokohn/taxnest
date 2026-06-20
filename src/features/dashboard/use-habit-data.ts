import { useMemo } from 'react';

import { nextQuarterlyDeadline } from '@/lib/deadlines';
import { computeAnnualTax, computeSafeHarbor } from '@/tax-engine';
import { type Payment } from '@/domain';
import { usePaymentsStore, useProfileStore, useTaxConfigStore } from '@/store';

import { nextMilestone } from './milestones';

type Profile = NonNullable<ReturnType<typeof useProfileStore.getState>['profile']>;
type Config = NonNullable<ReturnType<typeof useTaxConfigStore.getState>['config']>;

const AT_RISK_DAYS = 14;
const WEEKS_SHOWN = 12;

export type WeekBar = { weekStart: string; amount: number; covered: boolean };

export type HabitData = {
  totalSetAside: number;
  /** Consecutive ISO weeks covered, ending this week (0 = no payments yet). */
  coveredWeeksStreak: number;
  /** Last 12 weeks of set-aside, oldest → newest (for the sparkline). */
  weeklySetAside: WeekBar[];
  /** True only when a deadline is near AND the pace is behind. */
  atRisk: boolean;
  /** How much more to set aside to be back on safe-harbor pace. */
  atRiskAmount: number;
  quarterly: {
    target: number;
    current: number;
    pct: number;
    quarter: number;
    dueDate: string;
    daysRemaining: number;
    isOverdue: boolean;
  } | null;
  nextMilestone: { threshold: number; pct: number } | null;
};

/** Local YYYY-MM-DD (avoids the UTC shift of toISOString). */
function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Monday of the week containing `d`, as YYYY-MM-DD. */
function weekStart(d: Date): string {
  const monday = new Date(d);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return toISODate(monday);
}

function addWeeks(weekStartIso: string, n: number): string {
  const d = new Date(`${weekStartIso}T00:00:00`);
  d.setDate(d.getDate() + n * 7);
  return toISODate(d);
}

/** Pure habit derivation — reused by the dashboard and the set-aside moment. */
export function computeHabitData(
  payments: readonly Pick<Payment, 'amount' | 'date' | 'set_aside_amount'>[],
  profile: Profile,
  config: Config,
  now: Date = new Date(),
): HabitData {
  const totalSetAside = payments.reduce((s, p) => s + p.set_aside_amount, 0);
  const totalIncome = payments.reduce((s, p) => s + p.amount, 0);

  // Quarterly safe-harbor pace: by the next deadline you should have set aside
  // `quarterlyPayment * quarter` cumulatively.
  const projectedIncome = Math.max(profile.estimated_annual_income, totalIncome);
  const tax = computeAnnualTax(
    {
      filing_status: profile.filing_status,
      state: profile.state,
      net_profit: Math.max(0, projectedIncome),
    },
    config,
  );
  const projectedTax = tax.se.seTax + tax.federalIncomeTax + tax.stateTax;
  const sh = computeSafeHarbor({
    currentYearTax: projectedTax,
    priorYearTax: profile.prior_year_tax,
    priorYearAgi: profile.prior_year_agi,
  });
  const deadline = nextQuarterlyDeadline(config.quarterly_deadlines, now);

  let quarterly: HabitData['quarterly'] = null;
  let atRisk = false;
  let atRiskAmount = 0;
  if (deadline) {
    const target = sh.quarterlyPayment * deadline.quarter;
    const pct = target > 0 ? Math.max(0, Math.min(1, totalSetAside / target)) : 1;
    quarterly = {
      target,
      current: totalSetAside,
      pct,
      quarter: deadline.quarter,
      dueDate: deadline.date,
      daysRemaining: deadline.daysRemaining,
      isOverdue: deadline.isOverdue,
    };
    const behind = totalSetAside < target;
    atRisk = behind && (deadline.isOverdue || deadline.daysRemaining <= AT_RISK_DAYS);
    atRiskAmount = behind ? target - totalSetAside : 0;
  }

  // Weekly coverage + streak. By construction the set-aside per payment is the
  // marginal tax it owes, so a week is "covered" once any income is logged.
  const dated = [...payments].filter((p) => p.date).sort((a, b) => a.date.localeCompare(b.date));
  const thisWeek = weekStart(now);

  let coveredWeeksStreak = 0;
  let firstWeek: string | null = null;
  if (dated.length > 0) {
    firstWeek = weekStart(new Date(`${dated[0].date}T00:00:00`));
    let w = firstWeek;
    while (w <= thisWeek) {
      coveredWeeksStreak += 1;
      w = addWeeks(w, 1);
    }
  }

  const byWeek = new Map<string, number>();
  for (const p of dated) {
    const wk = weekStart(new Date(`${p.date}T00:00:00`));
    byWeek.set(wk, (byWeek.get(wk) ?? 0) + p.set_aside_amount);
  }
  const weeklySetAside: WeekBar[] = [];
  for (let i = WEEKS_SHOWN - 1; i >= 0; i--) {
    const wk = addWeeks(thisWeek, -i);
    weeklySetAside.push({
      weekStart: wk,
      amount: byWeek.get(wk) ?? 0,
      covered: firstWeek != null && wk >= firstWeek,
    });
  }

  return {
    totalSetAside,
    coveredWeeksStreak,
    weeklySetAside,
    atRisk,
    atRiskAmount,
    quarterly,
    nextMilestone: nextMilestone(totalSetAside),
  };
}

/** Reactive habit data for the dashboard. */
export function useHabitData(): HabitData | null {
  const payments = usePaymentsStore((s) => s.payments);
  const profile = useProfileStore((s) => s.profile);
  const config = useTaxConfigStore((s) => s.config);
  return useMemo(() => {
    if (!profile || !config) return null;
    return computeHabitData(payments, profile, config);
  }, [payments, profile, config]);
}
