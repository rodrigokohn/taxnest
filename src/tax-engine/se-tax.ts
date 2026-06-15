import { type FilingStatus } from '@/domain';
import { type SelfEmploymentConfig } from '@/tax-config/types';

import { type SeTaxResult } from '@/tax-engine/types';

/** IRS: no self-employment tax is owed if net earnings are below $400. */
const SE_TAX_MIN_NET_EARNINGS = 400;

const ZERO_SE: Omit<SeTaxResult, 'nese'> = {
  socialSecurity: 0,
  medicare: 0,
  additionalMedicare: 0,
  seTax: 0,
  seTaxDeduction: 0,
};

/** Self-Employment Tax — Schedule SE (PRD §6.2). */
export function computeSelfEmploymentTax(
  netProfit: number,
  filingStatus: FilingStatus,
  se: SelfEmploymentConfig,
): SeTaxResult {
  const nese = netProfit * se.nese_factor;
  if (nese < SE_TAX_MIN_NET_EARNINGS) {
    return { nese: Math.max(0, nese), ...ZERO_SE };
  }

  // Social Security: 12.4% up to the wage base (capped).
  const ssTaxable = Math.min(nese, se.social_security_wage_base);
  const socialSecurity = ssTaxable * se.social_security_rate;

  // Medicare: 2.9%, no cap.
  const medicare = nese * se.medicare_rate;

  // Additional Medicare: 0.9% over the filing-status threshold.
  const threshold = se.additional_medicare_threshold[filingStatus];
  const additionalMedicare = Math.max(0, nese - threshold) * se.additional_medicare_rate;

  const seTax = socialSecurity + medicare + additionalMedicare;
  // Half of SS + Medicare is deductible above the line; additional Medicare is NOT.
  const seTaxDeduction = (socialSecurity + medicare) / 2;

  return { nese, socialSecurity, medicare, additionalMedicare, seTax, seTaxDeduction };
}
