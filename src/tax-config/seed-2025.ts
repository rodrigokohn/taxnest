/**
 * Seed TaxConfig for tax year 2025 — an OFFLINE-FIRST FALLBACK only.
 *
 * In production the authoritative TaxConfig is fetched from the backend, where
 * it is produced by the annual AI job against irs.gov and passed through a
 * deterministic validation gate (PRD §9.1). This seed lets the app function
 * before the first fetch and when the network is unavailable (PRD §8.2 error
 * state: "Using last saved tax rates").
 *
 * Accuracy notes:
 * - Federal + Self-Employment values are 2025 reference figures (Rev. Proc.
 *   2024-40 / SSA). These are the accurate core of the app.
 * - State values are a CURATED STARTER SET (no-income-tax states + a few of the
 *   largest taxing states). State brackets are coarse single-filer
 *   approximations pending the curated/AI refresh — the UI shows a disclaimer
 *   that state rules vary (PRD §6.4). The remaining states arrive via the
 *   backend (Phase 3+).
 *
 * Written as typed TS (not JSON) so `tsc` validates the shape.
 */
import { type TaxConfig } from '@/tax-config/types';

/** Top bracket has no upper bound. */
const TOP = null;

export const SEED_TAX_CONFIG_2025 = {
  tax_year: 2025,
  last_updated: '2025-01-01T00:00:00.000Z',
  source_urls: [
    'https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2025',
    'https://www.ssa.gov/oact/cola/cbb.html',
  ],

  se: {
    social_security_wage_base: 176_100,
    social_security_rate: 0.124,
    medicare_rate: 0.029,
    additional_medicare_rate: 0.009,
    additional_medicare_threshold: {
      single: 200_000,
      married_joint: 250_000,
      married_separate: 125_000,
      head_of_household: 200_000,
    },
    nese_factor: 0.9235,
  },

  federal: {
    standard_deduction: {
      single: 15_000,
      married_joint: 30_000,
      married_separate: 15_000,
      head_of_household: 22_500,
    },
    brackets: {
      single: [
        { lower: 0, upper: 11_925, rate: 0.1 },
        { lower: 11_925, upper: 48_475, rate: 0.12 },
        { lower: 48_475, upper: 103_350, rate: 0.22 },
        { lower: 103_350, upper: 197_300, rate: 0.24 },
        { lower: 197_300, upper: 250_525, rate: 0.32 },
        { lower: 250_525, upper: 626_350, rate: 0.35 },
        { lower: 626_350, upper: TOP, rate: 0.37 },
      ],
      married_joint: [
        { lower: 0, upper: 23_850, rate: 0.1 },
        { lower: 23_850, upper: 96_950, rate: 0.12 },
        { lower: 96_950, upper: 206_700, rate: 0.22 },
        { lower: 206_700, upper: 394_600, rate: 0.24 },
        { lower: 394_600, upper: 501_050, rate: 0.32 },
        { lower: 501_050, upper: 751_600, rate: 0.35 },
        { lower: 751_600, upper: TOP, rate: 0.37 },
      ],
      married_separate: [
        { lower: 0, upper: 11_925, rate: 0.1 },
        { lower: 11_925, upper: 48_475, rate: 0.12 },
        { lower: 48_475, upper: 103_350, rate: 0.22 },
        { lower: 103_350, upper: 197_300, rate: 0.24 },
        { lower: 197_300, upper: 250_525, rate: 0.32 },
        { lower: 250_525, upper: 375_800, rate: 0.35 },
        { lower: 375_800, upper: TOP, rate: 0.37 },
      ],
      head_of_household: [
        { lower: 0, upper: 17_000, rate: 0.1 },
        { lower: 17_000, upper: 64_850, rate: 0.12 },
        { lower: 64_850, upper: 103_350, rate: 0.22 },
        { lower: 103_350, upper: 197_300, rate: 0.24 },
        { lower: 197_300, upper: 250_500, rate: 0.32 },
        { lower: 250_500, upper: 626_350, rate: 0.35 },
        { lower: 626_350, upper: TOP, rate: 0.37 },
      ],
    },
    qbi_threshold: {
      single: 197_300,
      married_joint: 394_600,
      married_separate: 197_300,
      head_of_household: 197_300,
    },
    qbi_rate: 0.2,
  },

  // For tax year 2025: Apr 15 2025, Jun 16 2025 (15th is a Sunday),
  // Sep 15 2025, Jan 15 2026.
  quarterly_deadlines: ['2025-04-15', '2025-06-16', '2025-09-15', '2026-01-15'],

  states: {
    // No state income tax on earned income.
    AK: { type: 'none' },
    FL: { type: 'none' },
    NV: { type: 'none' },
    NH: { type: 'none' }, // interest/dividends only, phasing out
    SD: { type: 'none' },
    TN: { type: 'none' },
    TX: { type: 'none' },
    WA: { type: 'none' }, // capital gains only
    WY: { type: 'none' },

    // Flat-rate states (starter set).
    IL: { type: 'flat', rate: 0.0495, standard_deduction: 0 },
    PA: { type: 'flat', rate: 0.0307, standard_deduction: 0 },

    // Progressive states (starter set; single-filer approximation).
    CA: {
      type: 'progressive',
      standard_deduction: 5_540,
      brackets: [
        { lower: 0, upper: 10_412, rate: 0.01 },
        { lower: 10_412, upper: 24_684, rate: 0.02 },
        { lower: 24_684, upper: 38_959, rate: 0.04 },
        { lower: 38_959, upper: 54_081, rate: 0.06 },
        { lower: 54_081, upper: 68_350, rate: 0.08 },
        { lower: 68_350, upper: 349_137, rate: 0.093 },
        { lower: 349_137, upper: 418_961, rate: 0.103 },
        { lower: 418_961, upper: 698_271, rate: 0.113 },
        { lower: 698_271, upper: TOP, rate: 0.123 },
      ],
    },
    NY: {
      type: 'progressive',
      standard_deduction: 8_000,
      brackets: [
        { lower: 0, upper: 8_500, rate: 0.04 },
        { lower: 8_500, upper: 11_700, rate: 0.045 },
        { lower: 11_700, upper: 13_900, rate: 0.0525 },
        { lower: 13_900, upper: 80_650, rate: 0.055 },
        { lower: 80_650, upper: 215_400, rate: 0.06 },
        { lower: 215_400, upper: 1_077_550, rate: 0.0685 },
        { lower: 1_077_550, upper: TOP, rate: 0.0965 },
      ],
    },
  },
} satisfies TaxConfig;
