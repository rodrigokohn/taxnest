import { isProNow } from '@/config/gating';
import { deductionRepo, incomeSourceRepo, paymentRepo, quarterlyPaymentRepo } from '@/data';
import { type DeductionCategory, type QuarterlyPayment, type UserProfile } from '@/domain';
import { computeAnnualTax } from '@/tax-engine';
import { useProfileStore, useTaxConfigStore } from '@/store';

export type ReportData = {
  year: number;
  profile: UserProfile;
  incomeBySource: { name: string; color: string; total: number }[];
  deductionsByCategory: { category: DeductionCategory; total: number }[];
  quarterly: QuarterlyPayment[];
  totals: { income: number; deductions: number; netProfit: number };
  tax: { se: number; federal: number; state: number; total: number; includeState: boolean };
};

function sumBy<T>(items: T[], get: (t: T) => number): number {
  return items.reduce((s, t) => s + get(t), 0);
}

/** Gathers everything the PDF report needs. Pure data — no React, runs from a handler. */
export async function gatherReportData(year: number): Promise<ReportData> {
  const profile = useProfileStore.getState().profile;
  const config = useTaxConfigStore.getState().config;
  if (!profile || !config) throw new Error('Profile or tax config not loaded');

  const [payments, deductions, sources, quarterly] = await Promise.all([
    paymentRepo.listByYear(year),
    deductionRepo.listByYear(year),
    incomeSourceRepo.list(),
    quarterlyPaymentRepo.listByYear(year),
  ]);

  const income = sumBy(payments, (p) => p.amount);
  const totalDeductions = sumBy(deductions, (d) => d.amount);
  const netProfit = Math.max(0, income - totalDeductions);

  const incomeBySource = sources
    .map((s) => ({
      name: s.name,
      color: s.color,
      total: sumBy(
        payments.filter((p) => p.income_source_id === s.id),
        (p) => p.amount,
      ),
    }))
    .filter((s) => s.total > 0);

  const byCategory = new Map<DeductionCategory, number>();
  for (const d of deductions)
    byCategory.set(d.category, (byCategory.get(d.category) ?? 0) + d.amount);
  const deductionsByCategory = Array.from(byCategory, ([category, total]) => ({ category, total }));

  const includeState = isProNow();
  const b = computeAnnualTax(
    { filing_status: profile.filing_status, state: profile.state, net_profit: netProfit },
    config,
  );
  const state = includeState ? b.stateTax : 0;

  return {
    year,
    profile,
    incomeBySource,
    deductionsByCategory,
    quarterly,
    totals: { income, deductions: totalDeductions, netProfit },
    tax: {
      se: b.se.seTax,
      federal: b.federalIncomeTax,
      state,
      total: b.se.seTax + b.federalIncomeTax + state,
      includeState,
    },
  };
}
