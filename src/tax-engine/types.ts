/**
 * TaxEngine input/output types.
 *
 * The engine is a PURE function of (inputs + TaxConfig). It imports only data
 * types — never the SQLite layer, the network, or the AI — so it runs anywhere
 * and is fully unit-testable (PRD §5, §6).
 */
import { type FilingStatus, type StateCode } from '@/domain';

export type TaxInput = {
  filing_status: FilingStatus;
  state: StateCode;
  /** Annual net profit = gross business income − deductible business expenses. */
  net_profit: number;
  /** Above-the-line, optional (Pro). MVP may leave these undefined (treated as 0). */
  retirement_contributions?: number;
  self_employed_health_insurance?: number;
};

/** Everything in TaxInput except the income figure (used by marginal set-aside). */
export type TaxProfile = Omit<TaxInput, 'net_profit'>;

export type SeTaxResult = {
  /** Net Earnings from Self-Employment (net_profit × nese_factor). */
  nese: number;
  socialSecurity: number;
  medicare: number;
  additionalMedicare: number;
  seTax: number;
  /** Half of (SS + Medicare); the additional Medicare is excluded (PRD §6.2). */
  seTaxDeduction: number;
};

export type TaxBreakdown = {
  netProfit: number;
  se: SeTaxResult;
  agi: number;
  qbiDeduction: number;
  taxableIncome: number;
  federalIncomeTax: number;
  stateTax: number;
  /** False when the user's state isn't in the TaxConfig yet (state tax shown as TBD). */
  stateSupported: boolean;
  totalAnnualTax: number;
  quarterlyPayment: number;
  /** totalAnnualTax / netProfit. */
  effectiveRate: number;
};

export type SafeHarborInput = {
  currentYearTax: number;
  priorYearTax?: number;
  priorYearAgi?: number;
};

export type SafeHarborBasis = 'current_90' | 'prior_100' | 'prior_110';

export type SafeHarborResult = {
  requiredAnnualPayment: number;
  quarterlyPayment: number;
  basis: SafeHarborBasis;
  priorYearMultiplier: number;
};
