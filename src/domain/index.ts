/**
 * Domain entities (PRD §7).
 *
 * These types are the canonical shape of the app's data. They are
 * platform-agnostic (no React Native, no SQLite, no AI) so they can be shared
 * by the TaxEngine, the repositories, the stores, and the UI. Persisted locally
 * in SQLite; mirrored to Supabase only if cloud sync is enabled (post-MVP).
 */

// ─── Filing status ──────────────────────────────────────────────────────────

export type FilingStatus = 'single' | 'married_joint' | 'married_separate' | 'head_of_household';

export const FILING_STATUSES: readonly FilingStatus[] = [
  'single',
  'married_joint',
  'married_separate',
  'head_of_household',
] as const;

/** Human-readable labels for the onboarding picker (PRD §8.1). UI copy in English. */
export const FILING_STATUS_LABELS: Record<FilingStatus, string> = {
  single: 'Single',
  married_joint: 'Married filing jointly',
  married_separate: 'Married filing separately',
  head_of_household: 'Head of household',
};

/** Two-letter US state/territory code, e.g. "CA", "TX". (Includes "DC".) */
export type StateCode = string;

// ─── Entities ───────────────────────────────────────────────────────────────

/** One per user. Drives every calculation. */
export type UserProfile = {
  id: string;
  filing_status: FilingStatus;
  state: StateCode;
  /** Onboarding estimate; used for the first projection, editable later. */
  estimated_annual_income: number;
  /** Optional — enables the prior-year safe harbor (PRD §6.6). */
  prior_year_tax?: number;
  prior_year_agi?: number;
  /** Pro, above-the-line. MVP may treat as 0. */
  retirement_contributions?: number;
  self_employed_health_insurance?: number;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
};

/** Where money comes from. Free: 1 implicit source; Pro: unlimited. */
export type IncomeSource = {
  id: string;
  name: string; // "Upwork", "Direct clients", "Patreon"
  color: string; // for the colored dot in lists
  created_at: string;
};

/** A single payment received. The core unit of the app. */
export type Payment = {
  id: string;
  income_source_id: string;
  amount: number;
  date: string; // ISO date
  /**
   * The marginal set-aside computed at the moment of registration. This is an
   * IMMUTABLE SNAPSHOT — editing/deleting other payments never rewrites it
   * (see docs/ARCHITECTURE.md "Set-aside = immutable snapshot").
   */
  set_aside_amount: number;
  note?: string;
  tax_year: number;
  created_at: string;
};

export type DeductionCategory =
  | 'home_office'
  | 'software'
  | 'equipment'
  | 'travel'
  | 'education'
  | 'supplies'
  | 'other';

export const DEDUCTION_CATEGORIES: readonly DeductionCategory[] = [
  'home_office',
  'software',
  'equipment',
  'travel',
  'education',
  'supplies',
  'other',
] as const;

/** A deductible business expense (Pro). */
export type Deduction = {
  id: string;
  category: DeductionCategory;
  amount: number;
  date: string; // ISO date
  note?: string;
  tax_year: number;
};

export type Quarter = 1 | 2 | 3 | 4;

/** Log of an estimated quarterly payment made to the IRS. */
export type QuarterlyPayment = {
  id: string;
  quarter: Quarter;
  tax_year: number;
  amount_paid: number;
  date_paid: string; // ISO date
  is_paid: boolean;
};
