import { type FilingStatus } from '@/domain';
import { type FederalConfig } from '@/tax-config/types';

import { applyProgressiveBrackets } from '@/tax-engine/brackets';

export type FederalResult = {
  agi: number;
  qbiDeduction: number;
  taxableIncome: number;
  federalIncomeTax: number;
};

/** Federal income tax incl. AGI, standard deduction, and QBI (PRD §6.3). */
export function computeFederalIncomeTax(args: {
  netProfit: number;
  filingStatus: FilingStatus;
  seTaxDeduction: number;
  retirementContributions?: number;
  selfEmployedHealthInsurance?: number;
  federal: FederalConfig;
}): FederalResult {
  const { netProfit, filingStatus, seTaxDeduction, federal } = args;

  // AGI = net profit − above-the-line deductions.
  const aboveTheLine =
    seTaxDeduction + (args.retirementContributions ?? 0) + (args.selfEmployedHealthInsurance ?? 0);
  const agi = netProfit - aboveTheLine;

  // MVP always uses the standard deduction (itemized is out of scope).
  const standardDeduction = federal.standard_deduction[filingStatus];
  const taxableBeforeQbi = Math.max(0, agi - standardDeduction);

  // QBI deduction (Section 199A). Below the threshold (the typical user): a
  // simple 20% of the lesser of QBI and taxable income (net capital gains = 0
  // in the MVP). Above the threshold: conservatively 0 (limitations out of MVP).
  const qbi = netProfit - seTaxDeduction;
  const qbiThreshold = federal.qbi_threshold[filingStatus];
  let qbiDeduction = 0;
  if (taxableBeforeQbi <= qbiThreshold) {
    qbiDeduction = federal.qbi_rate * Math.max(0, Math.min(qbi, taxableBeforeQbi));
  }

  const taxableIncome = Math.max(0, agi - standardDeduction - qbiDeduction);
  const federalIncomeTax = applyProgressiveBrackets(taxableIncome, federal.brackets[filingStatus]);

  return { agi, qbiDeduction, taxableIncome, federalIncomeTax };
}
