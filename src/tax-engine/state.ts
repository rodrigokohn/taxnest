import { type StateCode } from '@/domain';
import { type StateConfig } from '@/tax-config/types';

import { applyProgressiveBrackets } from '@/tax-engine/brackets';

export type StateResult = {
  stateTax: number;
  /** False when the state isn't in the config yet (not a no-tax state — just unknown). */
  supported: boolean;
};

/**
 * State income tax (PRD §6.4). Approximation: starts from federal AGI minus a
 * per-state standard deduction. State rules vary; the UI shows a disclaimer.
 */
export function computeStateTax(
  agi: number,
  state: StateCode,
  states: Record<string, StateConfig>,
): StateResult {
  const config = states[state];
  if (!config) return { stateTax: 0, supported: false };
  if (config.type === 'none') return { stateTax: 0, supported: true };

  const stateTaxable = Math.max(0, agi - config.standard_deduction);
  if (config.type === 'flat') {
    return { stateTax: stateTaxable * config.rate, supported: true };
  }
  return { stateTax: applyProgressiveBrackets(stateTaxable, config.brackets), supported: true };
}
