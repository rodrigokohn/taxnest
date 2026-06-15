import { type SafeHarborInput, type SafeHarborResult } from '@/tax-engine/types';

const HIGH_INCOME_AGI = 150_000;
const CURRENT_YEAR_RATE = 0.9; // 90% of the current year's tax
const HIGH_INCOME_PRIOR_MULTIPLIER = 1.1; // 110% of prior year if AGI > $150k

/**
 * Safe harbor (PRD §6.6): you avoid an underpayment penalty by paying the LESSER
 * of 90% of this year's tax or 100% (110% if prior-year AGI > $150k) of last
 * year's tax. With no prior-year data, only the current-year rule applies.
 */
export function computeSafeHarbor(input: SafeHarborInput): SafeHarborResult {
  const safeHarborCurrent = CURRENT_YEAR_RATE * input.currentYearTax;

  if (input.priorYearTax == null) {
    return {
      requiredAnnualPayment: safeHarborCurrent,
      quarterlyPayment: safeHarborCurrent / 4,
      basis: 'current_90',
      priorYearMultiplier: 1,
    };
  }

  const multiplier = (input.priorYearAgi ?? 0) > HIGH_INCOME_AGI ? HIGH_INCOME_PRIOR_MULTIPLIER : 1;
  const safeHarborPrior = input.priorYearTax * multiplier;

  if (safeHarborPrior <= safeHarborCurrent) {
    return {
      requiredAnnualPayment: safeHarborPrior,
      quarterlyPayment: safeHarborPrior / 4,
      basis: multiplier === HIGH_INCOME_PRIOR_MULTIPLIER ? 'prior_110' : 'prior_100',
      priorYearMultiplier: multiplier,
    };
  }

  return {
    requiredAnnualPayment: safeHarborCurrent,
    quarterlyPayment: safeHarborCurrent / 4,
    basis: 'current_90',
    priorYearMultiplier: multiplier,
  };
}
