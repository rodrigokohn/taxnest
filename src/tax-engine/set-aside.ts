import { type TaxConfig } from '@/tax-config/types';

import { computeAnnualTax } from '@/tax-engine/annual';
import { type TaxProfile } from '@/tax-engine/types';

export type SetAsideBreakdown = {
  /** The set-aside amount (clamped at 0) — the immutable snapshot stored per payment. */
  total: number;
  /** Marginal deltas by component (for the "How is this calculated?" breakdown). */
  se: number;
  federal: number;
  state: number;
};

type MarginalArgs = {
  priorNetProfit: number;
  paymentAmount: number;
  profile: TaxProfile;
  config: TaxConfig;
};

/**
 * "How much to set aside from THIS payment?" — the core loop (PRD §6.7), with the
 * per-component breakdown.
 *
 * Marginal approach: the set-aside is the increase in the projected annual tax
 * caused by this payment, given the net profit accrued before it. Because the
 * tax is progressive, later/larger payments correctly produce a larger
 * set-aside — exactly the precision that justifies the app.
 */
export function marginalSetAsideBreakdown(args: MarginalArgs): SetAsideBreakdown {
  const { priorNetProfit, paymentAmount, profile, config } = args;
  const before = computeAnnualTax({ ...profile, net_profit: priorNetProfit }, config);
  const after = computeAnnualTax(
    { ...profile, net_profit: priorNetProfit + paymentAmount },
    config,
  );

  const se = after.se.seTax - before.se.seTax;
  const federal = after.federalIncomeTax - before.federalIncomeTax;
  const state = after.stateTax - before.stateTax;

  return { total: Math.max(0, se + federal + state), se, federal, state };
}

/** The set-aside total only — the value stored as the payment's immutable snapshot. */
export function marginalSetAside(args: MarginalArgs): number {
  return marginalSetAsideBreakdown(args).total;
}
