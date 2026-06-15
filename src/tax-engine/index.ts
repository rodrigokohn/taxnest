/**
 * TaxEngine — the deterministic core. Pure functions of (inputs + TaxConfig).
 * No network, no AI, no side effects (PRD §5). See docs/ARCHITECTURE.md.
 */
export * from '@/tax-engine/types';
export { applyProgressiveBrackets } from '@/tax-engine/brackets';
export { computeSelfEmploymentTax } from '@/tax-engine/se-tax';
export { computeFederalIncomeTax, type FederalResult } from '@/tax-engine/federal';
export { computeStateTax, type StateResult } from '@/tax-engine/state';
export { computeAnnualTax } from '@/tax-engine/annual';
export { computeSafeHarbor } from '@/tax-engine/safe-harbor';
export { marginalSetAside, effectiveSetAside } from '@/tax-engine/set-aside';

import { computeAnnualTax } from '@/tax-engine/annual';
import { applyProgressiveBrackets } from '@/tax-engine/brackets';
import { computeSafeHarbor } from '@/tax-engine/safe-harbor';
import { effectiveSetAside, marginalSetAside } from '@/tax-engine/set-aside';

/** Convenience facade grouping the engine's public operations. */
export const TaxEngine = {
  computeAnnualTax,
  computeSafeHarbor,
  marginalSetAside,
  effectiveSetAside,
  applyProgressiveBrackets,
} as const;
