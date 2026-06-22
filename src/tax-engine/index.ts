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
export {
  marginalSetAside,
  marginalSetAsideBreakdown,
  type SetAsideBreakdown,
} from '@/tax-engine/set-aside';
