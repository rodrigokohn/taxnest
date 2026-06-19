import { useEffect, useMemo, useState } from 'react';

import { DEFAULT_TAX_YEAR } from '@/config/tax-year';
import { deductionRepo } from '@/data';
import { type DeadlineInfo, nextQuarterlyDeadline } from '@/lib/deadlines';
import { computeAnnualTax, computeSafeHarbor } from '@/tax-engine';
import { usePaymentsStore, useProfileStore, useTaxConfigStore } from '@/store';

export type DashboardData = {
  totalSetAside: number;
  projectedTax: number;
  effectiveRate: number;
  suggestedQuarterly: number;
  componentBreakdown: { se: number; federal: number; state: number };
  includeState: boolean;
  /** True when the projection is still based on the onboarding estimate. */
  usingEstimate: boolean;
  hasPayments: boolean;
  nextDeadline: DeadlineInfo | null;
};

/** Loads + derives everything the Dashboard renders (PRD §8.2). */
export function useDashboardData(): DashboardData | null {
  const profile = useProfileStore((s) => s.profile);
  const config = useTaxConfigStore((s) => s.config);
  const totalSetAside = usePaymentsStore((s) => s.totalSetAside);
  const totalIncome = usePaymentsStore((s) => s.totalIncome);
  const payments = usePaymentsStore((s) => s.payments);
  const [deductions, setDeductions] = useState(0);

  useEffect(() => {
    usePaymentsStore.getState().load(DEFAULT_TAX_YEAR);
  }, []);

  useEffect(() => {
    deductionRepo.sumByYear(DEFAULT_TAX_YEAR).then(setDeductions);
  }, [payments]);

  return useMemo(() => {
    if (!profile || !config) return null;

    const usingEstimate = totalIncome < profile.estimated_annual_income;
    const projectedIncome = Math.max(profile.estimated_annual_income, totalIncome);
    const projectedNetProfit = Math.max(0, projectedIncome - deductions);

    const b = computeAnnualTax(
      {
        filing_status: profile.filing_status,
        state: profile.state,
        net_profit: projectedNetProfit,
      },
      config,
    );
    const projectedTax = b.se.seTax + b.federalIncomeTax + b.stateTax;
    const effectiveRate = projectedIncome > 0 ? projectedTax / projectedIncome : 0;

    // Suggested quarterly uses the IRS safe-harbor target.
    const safeHarbor = computeSafeHarbor({
      currentYearTax: projectedTax,
      priorYearTax: profile.prior_year_tax,
      priorYearAgi: profile.prior_year_agi,
    });
    const suggestedQuarterly = safeHarbor.quarterlyPayment;

    return {
      totalSetAside,
      projectedTax,
      effectiveRate,
      suggestedQuarterly,
      componentBreakdown: { se: b.se.seTax, federal: b.federalIncomeTax, state: b.stateTax },
      includeState: true,
      usingEstimate,
      hasPayments: payments.length > 0,
      nextDeadline: nextQuarterlyDeadline(config.quarterly_deadlines),
    };
  }, [profile, config, totalSetAside, totalIncome, deductions, payments.length]);
}
