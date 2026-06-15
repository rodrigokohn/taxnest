/**
 * TaxConfig (PRD §7) — the single source of truth for one tax year's
 * parameters: rates, brackets, thresholds, deadlines, and per-state rules.
 *
 * It is plain data. The TaxEngine reads it; the annual AI job is the only thing
 * that writes it, and only through a deterministic validation gate. A wrong tax
 * number can therefore only come from a wrong (validated, auditable) TaxConfig.
 */
import { type FilingStatus, type StateCode } from '@/domain';

/**
 * A single progressive tax bracket. `upper` is exclusive. The top bracket uses
 * `upper: null` (no upper bound) — JSON-safe, unlike Infinity, so the same shape
 * survives transport from the backend.
 */
export type Bracket = {
  lower: number;
  upper: number | null;
  rate: number;
};

export type StateConfig =
  | { type: 'none' }
  | { type: 'flat'; rate: number; standard_deduction: number }
  | { type: 'progressive'; brackets: Bracket[]; standard_deduction: number };

export type SelfEmploymentConfig = {
  social_security_wage_base: number; // ref 2025: 176_100
  social_security_rate: number; // 0.124
  medicare_rate: number; // 0.029
  additional_medicare_rate: number; // 0.009
  additional_medicare_threshold: Record<FilingStatus, number>;
  nese_factor: number; // 0.9235
};

export type FederalConfig = {
  standard_deduction: Record<FilingStatus, number>;
  brackets: Record<FilingStatus, Bracket[]>;
  qbi_threshold: Record<FilingStatus, number>;
  qbi_rate: number; // 0.20
};

export type TaxConfig = {
  tax_year: number;
  last_updated: string; // when the AI job last refreshed this
  source_urls: string[]; // irs.gov URLs the data came from (audit trail)

  se: SelfEmploymentConfig;
  federal: FederalConfig;

  /** The four estimated-quarterly deadlines (ISO dates) for this tax year. */
  quarterly_deadlines: string[];

  /** Per-state rules, keyed by two-letter state code. */
  states: Record<StateCode, StateConfig>;
};
