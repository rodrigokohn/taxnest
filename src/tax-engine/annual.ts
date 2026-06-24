import { type TaxConfig } from '@/tax-config/types';

import { computeFederalIncomeTax } from '@/tax-engine/federal';
import { computeSelfEmploymentTax } from '@/tax-engine/se-tax';
import { computeStateTax } from '@/tax-engine/state';
import { type TaxBreakdown, type TaxInput } from '@/tax-engine/types';

/**
 * The whole annual picture for a given net profit (PRD §6.5): SE tax + federal +
 * state, the quarterly split, and the effective rate. Pure and deterministic —
 * this is the function the marginal set-aside calls twice.
 */
export function computeAnnualTax(input: TaxInput, config: TaxConfig): TaxBreakdown {
  const netProfit = Math.max(0, input.net_profit);

  const se = computeSelfEmploymentTax(netProfit, input.filing_status, config.se);

  const federal = computeFederalIncomeTax({
    netProfit,
    filingStatus: input.filing_status,
    seTaxDeduction: se.seTaxDeduction,
    retirementContributions: input.retirement_contributions,
    selfEmployedHealthInsurance: input.self_employed_health_insurance,
    federal: config.federal,
  });

  const state = computeStateTax(federal.agi, input.state, config.states, input.filing_status);

  const totalAnnualTax = se.seTax + federal.federalIncomeTax + state.stateTax;

  return {
    netProfit,
    se,
    agi: federal.agi,
    qbiDeduction: federal.qbiDeduction,
    taxableIncome: federal.taxableIncome,
    federalIncomeTax: federal.federalIncomeTax,
    stateTax: state.stateTax,
    stateSupported: state.supported,
    totalAnnualTax,
    quarterlyPayment: totalAnnualTax / 4,
    effectiveRate: netProfit > 0 ? totalAnnualTax / netProfit : 0,
  };
}
