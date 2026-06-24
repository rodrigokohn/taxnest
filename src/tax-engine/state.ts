import { type FilingStatus, type StateCode } from '@/domain';
import { type StateConfig } from '@/tax-config/types';

import { applyProgressiveBrackets } from '@/tax-engine/brackets';

export type StateResult = {
  stateTax: number;
  /** False when the state isn't in the config yet (not a no-tax state — just unknown). */
  supported: boolean;
};

/**
 * State income tax (PRD §6.4). Approximation: starts from federal AGI minus a
 * per-state standard deduction. Uses the filing-status-specific brackets and
 * standard deduction when the state provides them, else the base (single)
 * values. State rules vary; the UI shows a disclaimer.
 */
export function computeStateTax(
  agi: number,
  state: StateCode,
  states: Record<string, StateConfig>,
  filingStatus: FilingStatus,
): StateResult {
  const config = states[state];
  if (!config) return { stateTax: 0, supported: false };
  if (config.type === 'none') return { stateTax: 0, supported: true };

  const standardDeduction =
    config.standard_deduction_by_status?.[filingStatus] ?? config.standard_deduction;
  const stateTaxable = Math.max(0, agi - standardDeduction);
  if (config.type === 'flat') {
    return { stateTax: stateTaxable * config.rate, supported: true };
  }
  const brackets = config.brackets_by_status?.[filingStatus] ?? config.brackets;
  return { stateTax: applyProgressiveBrackets(stateTaxable, brackets), supported: true };
}
