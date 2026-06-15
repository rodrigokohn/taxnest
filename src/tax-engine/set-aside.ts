import { type TaxConfig } from '@/tax-config/types';

import { computeAnnualTax } from '@/tax-engine/annual';
import { type TaxProfile } from '@/tax-engine/types';

/**
 * "How much to set aside from THIS payment?" — the core loop (PRD §6.7).
 *
 * Marginal approach: the set-aside is the increase in the projected annual tax
 * caused by this payment, given the net profit accrued before it. Because the
 * tax is progressive, later/larger payments correctly produce a larger
 * set-aside — exactly the precision that justifies the app. The returned value
 * is stored as the payment's immutable snapshot.
 */
export function marginalSetAside(args: {
  priorNetProfit: number;
  paymentAmount: number;
  profile: TaxProfile;
  config: TaxConfig;
}): number {
  const { priorNetProfit, paymentAmount, profile, config } = args;
  const before = computeAnnualTax(
    { ...profile, net_profit: priorNetProfit },
    config,
  ).totalAnnualTax;
  const after = computeAnnualTax(
    { ...profile, net_profit: priorNetProfit + paymentAmount },
    config,
  ).totalAnnualTax;
  return Math.max(0, after - before);
}

/**
 * Simpler effective-rate fallback (PRD §6.7): payment × (projected total tax ÷
 * projected total income). Less precise than the marginal approach; kept for
 * reference / degraded paths.
 */
export function effectiveSetAside(
  paymentAmount: number,
  projectedTotalTax: number,
  projectedTotalIncome: number,
): number {
  const rate = projectedTotalIncome > 0 ? projectedTotalTax / projectedTotalIncome : 0;
  return paymentAmount * rate;
}
