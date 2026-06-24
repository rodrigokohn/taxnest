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

    // Flat-rate states (2025, Tax Foundation). Single-filer standard deduction;
    // where a state uses exemptions/credits instead, we use 0 (slightly
    // over-estimates, the safe direction). Per-filing-status data is task #24.
    AZ: { type: 'flat', rate: 0.025, standard_deduction: 15_000 },
    CO: { type: 'flat', rate: 0.044, standard_deduction: 15_000 },
    GA: { type: 'flat', rate: 0.0539, standard_deduction: 12_000 },
    ID: { type: 'flat', rate: 0.05695, standard_deduction: 15_000 },
    IL: { type: 'flat', rate: 0.0495, standard_deduction: 0 },
    IN: { type: 'flat', rate: 0.03, standard_deduction: 0 },
    IA: { type: 'flat', rate: 0.038, standard_deduction: 0 },
    KY: { type: 'flat', rate: 0.04, standard_deduction: 3_270 },
    LA: { type: 'flat', rate: 0.03, standard_deduction: 12_500 },
    MI: { type: 'flat', rate: 0.0425, standard_deduction: 0 },
    NC: { type: 'flat', rate: 0.0425, standard_deduction: 12_750 },
    PA: { type: 'flat', rate: 0.0307, standard_deduction: 0 },
    UT: { type: 'flat', rate: 0.0455, standard_deduction: 0 },

    // Progressive states (single-filer approximation).
    // Mississippi: 0% on the first $10k of taxable income, then a flat 4.4%.
    MS: {
      type: 'progressive',
      standard_deduction: 2_300,
      brackets: [
        { lower: 0, upper: 10_000, rate: 0 },
        { lower: 10_000, upper: TOP, rate: 0.044 },
      ],
    },
    // California doubles its single brackets AND standard deduction for married
    // filing jointly (no marriage penalty) — verified 2024 CA schedule. Other
    // statuses fall back to the single values. This is the single largest
    // per-filing-status correction (#24): without it, married CA filers are
    // materially over-estimated (the safe direction, but inaccurate).
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
      standard_deduction_by_status: { married_joint: 11_080 },
      brackets_by_status: {
        married_joint: [
          { lower: 0, upper: 20_824, rate: 0.01 },
          { lower: 20_824, upper: 49_368, rate: 0.02 },
          { lower: 49_368, upper: 77_918, rate: 0.04 },
          { lower: 77_918, upper: 108_162, rate: 0.06 },
          { lower: 108_162, upper: 136_700, rate: 0.08 },
          { lower: 136_700, upper: 698_274, rate: 0.093 },
          { lower: 698_274, upper: 837_922, rate: 0.103 },
          { lower: 837_922, upper: 1_396_542, rate: 0.113 },
          { lower: 1_396_542, upper: TOP, rate: 0.123 },
        ],
      },
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

    // Graduated states + DC (single-filer brackets, Tax Foundation 2025).
    // States with a tax-free first bracket are modeled with a leading 0% band.
    // NOTE: local/city income taxes (e.g. MD county, OH/AL municipal) are NOT
    // included — see src/config/estimate-scope.ts. Per-filing-status is task #24.
    AL: {
      type: 'progressive',
      standard_deduction: 3000,
      brackets: [
        { lower: 0, upper: 500, rate: 0.02 },
        { lower: 500, upper: 3000, rate: 0.04 },
        { lower: 3000, upper: TOP, rate: 0.05 },
      ],
    },
    AR: {
      type: 'progressive',
      standard_deduction: 2410,
      brackets: [
        { lower: 0, upper: 4500, rate: 0.02 },
        { lower: 4500, upper: TOP, rate: 0.039 },
      ],
    },
    CT: {
      type: 'progressive',
      standard_deduction: 0,
      brackets: [
        { lower: 0, upper: 10000, rate: 0.02 },
        { lower: 10000, upper: 50000, rate: 0.045 },
        { lower: 50000, upper: 100000, rate: 0.055 },
        { lower: 100000, upper: 200000, rate: 0.06 },
        { lower: 200000, upper: 250000, rate: 0.065 },
        { lower: 250000, upper: 500000, rate: 0.069 },
        { lower: 500000, upper: TOP, rate: 0.0699 },
      ],
    },
    DC: {
      type: 'progressive',
      standard_deduction: 15000,
      brackets: [
        { lower: 0, upper: 10000, rate: 0.04 },
        { lower: 10000, upper: 40000, rate: 0.06 },
        { lower: 40000, upper: 60000, rate: 0.065 },
        { lower: 60000, upper: 250000, rate: 0.085 },
        { lower: 250000, upper: 500000, rate: 0.0925 },
        { lower: 500000, upper: 1000000, rate: 0.0975 },
        { lower: 1000000, upper: TOP, rate: 0.1075 },
      ],
    },
    DE: {
      type: 'progressive',
      standard_deduction: 3250,
      brackets: [
        { lower: 0, upper: 2000, rate: 0 },
        { lower: 2000, upper: 5000, rate: 0.022 },
        { lower: 5000, upper: 10000, rate: 0.039 },
        { lower: 10000, upper: 20000, rate: 0.048 },
        { lower: 20000, upper: 25000, rate: 0.052 },
        { lower: 25000, upper: 60000, rate: 0.0555 },
        { lower: 60000, upper: TOP, rate: 0.066 },
      ],
    },
    HI: {
      type: 'progressive',
      standard_deduction: 4400,
      brackets: [
        { lower: 0, upper: 9600, rate: 0.014 },
        { lower: 9600, upper: 14400, rate: 0.032 },
        { lower: 14400, upper: 19200, rate: 0.055 },
        { lower: 19200, upper: 24000, rate: 0.064 },
        { lower: 24000, upper: 36000, rate: 0.068 },
        { lower: 36000, upper: 48000, rate: 0.072 },
        { lower: 48000, upper: 125000, rate: 0.076 },
        { lower: 125000, upper: 175000, rate: 0.079 },
        { lower: 175000, upper: 225000, rate: 0.0825 },
        { lower: 225000, upper: 275000, rate: 0.09 },
        { lower: 275000, upper: 325000, rate: 0.1 },
        { lower: 325000, upper: TOP, rate: 0.11 },
      ],
    },
    KS: {
      type: 'progressive',
      standard_deduction: 3605,
      brackets: [
        { lower: 0, upper: 23000, rate: 0.052 },
        { lower: 23000, upper: TOP, rate: 0.0558 },
      ],
    },
    MA: {
      type: 'progressive',
      standard_deduction: 0,
      brackets: [
        { lower: 0, upper: 1083150, rate: 0.05 },
        { lower: 1083150, upper: TOP, rate: 0.09 },
      ],
    },
    MD: {
      type: 'progressive',
      standard_deduction: 2700,
      brackets: [
        { lower: 0, upper: 1000, rate: 0.02 },
        { lower: 1000, upper: 2000, rate: 0.03 },
        { lower: 2000, upper: 3000, rate: 0.04 },
        { lower: 3000, upper: 100000, rate: 0.0475 },
        { lower: 100000, upper: 125000, rate: 0.05 },
        { lower: 125000, upper: 150000, rate: 0.0525 },
        { lower: 150000, upper: 250000, rate: 0.055 },
        { lower: 250000, upper: TOP, rate: 0.0575 },
      ],
    },
    ME: {
      type: 'progressive',
      standard_deduction: 15000,
      brackets: [
        { lower: 0, upper: 26800, rate: 0.058 },
        { lower: 26800, upper: 63450, rate: 0.0675 },
        { lower: 63450, upper: TOP, rate: 0.0715 },
      ],
    },
    MN: {
      type: 'progressive',
      standard_deduction: 14950,
      brackets: [
        { lower: 0, upper: 32570, rate: 0.0535 },
        { lower: 32570, upper: 106990, rate: 0.068 },
        { lower: 106990, upper: 198630, rate: 0.0785 },
        { lower: 198630, upper: TOP, rate: 0.0985 },
      ],
    },
    MO: {
      type: 'progressive',
      standard_deduction: 15000,
      brackets: [
        { lower: 0, upper: 1313, rate: 0 },
        { lower: 1313, upper: 2626, rate: 0.02 },
        { lower: 2626, upper: 3939, rate: 0.025 },
        { lower: 3939, upper: 5252, rate: 0.03 },
        { lower: 5252, upper: 6565, rate: 0.035 },
        { lower: 6565, upper: 7878, rate: 0.04 },
        { lower: 7878, upper: 9191, rate: 0.045 },
        { lower: 9191, upper: TOP, rate: 0.047 },
      ],
    },
    MT: {
      type: 'progressive',
      standard_deduction: 15000,
      brackets: [
        { lower: 0, upper: 21100, rate: 0.047 },
        { lower: 21100, upper: TOP, rate: 0.059 },
      ],
    },
    ND: {
      type: 'progressive',
      standard_deduction: 15000,
      brackets: [
        { lower: 0, upper: 48475, rate: 0 },
        { lower: 48475, upper: 244825, rate: 0.0195 },
        { lower: 244825, upper: TOP, rate: 0.025 },
      ],
    },
    NE: {
      type: 'progressive',
      standard_deduction: 8600,
      brackets: [
        { lower: 0, upper: 4030, rate: 0.0246 },
        { lower: 4030, upper: 24120, rate: 0.0351 },
        { lower: 24120, upper: 38870, rate: 0.0501 },
        { lower: 38870, upper: TOP, rate: 0.052 },
      ],
    },
    NJ: {
      type: 'progressive',
      standard_deduction: 0,
      brackets: [
        { lower: 0, upper: 20000, rate: 0.014 },
        { lower: 20000, upper: 35000, rate: 0.0175 },
        { lower: 35000, upper: 40000, rate: 0.035 },
        { lower: 40000, upper: 75000, rate: 0.05525 },
        { lower: 75000, upper: 500000, rate: 0.0637 },
        { lower: 500000, upper: 1000000, rate: 0.0897 },
        { lower: 1000000, upper: TOP, rate: 0.1075 },
      ],
    },
    NM: {
      type: 'progressive',
      standard_deduction: 15000,
      brackets: [
        { lower: 0, upper: 5500, rate: 0.015 },
        { lower: 5500, upper: 16500, rate: 0.032 },
        { lower: 16500, upper: 33500, rate: 0.043 },
        { lower: 33500, upper: 66500, rate: 0.047 },
        { lower: 66500, upper: 210000, rate: 0.049 },
        { lower: 210000, upper: TOP, rate: 0.059 },
      ],
    },
    OH: {
      type: 'progressive',
      standard_deduction: 0,
      brackets: [
        { lower: 0, upper: 26050, rate: 0 },
        { lower: 26050, upper: 100000, rate: 0.0275 },
        { lower: 100000, upper: TOP, rate: 0.035 },
      ],
    },
    OK: {
      type: 'progressive',
      standard_deduction: 6350,
      brackets: [
        { lower: 0, upper: 1000, rate: 0.0025 },
        { lower: 1000, upper: 2500, rate: 0.0075 },
        { lower: 2500, upper: 3750, rate: 0.0175 },
        { lower: 3750, upper: 4900, rate: 0.0275 },
        { lower: 4900, upper: 7200, rate: 0.0375 },
        { lower: 7200, upper: TOP, rate: 0.0475 },
      ],
    },
    OR: {
      type: 'progressive',
      standard_deduction: 2800,
      brackets: [
        { lower: 0, upper: 4400, rate: 0.0475 },
        { lower: 4400, upper: 11050, rate: 0.0675 },
        { lower: 11050, upper: 125000, rate: 0.0875 },
        { lower: 125000, upper: TOP, rate: 0.099 },
      ],
    },
    RI: {
      type: 'progressive',
      standard_deduction: 10900,
      brackets: [
        { lower: 0, upper: 79900, rate: 0.0375 },
        { lower: 79900, upper: 181650, rate: 0.0475 },
        { lower: 181650, upper: TOP, rate: 0.0599 },
      ],
    },
    SC: {
      type: 'progressive',
      standard_deduction: 15000,
      brackets: [
        { lower: 0, upper: 3560, rate: 0 },
        { lower: 3560, upper: 17830, rate: 0.03 },
        { lower: 17830, upper: TOP, rate: 0.062 },
      ],
    },
    VA: {
      type: 'progressive',
      standard_deduction: 8500,
      brackets: [
        { lower: 0, upper: 3000, rate: 0.02 },
        { lower: 3000, upper: 5000, rate: 0.03 },
        { lower: 5000, upper: 17000, rate: 0.05 },
        { lower: 17000, upper: TOP, rate: 0.0575 },
      ],
    },
    VT: {
      type: 'progressive',
      standard_deduction: 7400,
      brackets: [
        { lower: 0, upper: 47900, rate: 0.0335 },
        { lower: 47900, upper: 116000, rate: 0.066 },
        { lower: 116000, upper: 242000, rate: 0.076 },
        { lower: 242000, upper: TOP, rate: 0.0875 },
      ],
    },
    WV: {
      type: 'progressive',
      standard_deduction: 0,
      brackets: [
        { lower: 0, upper: 10000, rate: 0.0222 },
        { lower: 10000, upper: 25000, rate: 0.0296 },
        { lower: 25000, upper: 40000, rate: 0.0333 },
        { lower: 40000, upper: 60000, rate: 0.0444 },
        { lower: 60000, upper: TOP, rate: 0.0482 },
      ],
    },
    WI: {
      type: 'progressive',
      standard_deduction: 13560,
      brackets: [
        { lower: 0, upper: 14680, rate: 0.035 },
        { lower: 14680, upper: 29370, rate: 0.044 },
        { lower: 29370, upper: 323290, rate: 0.053 },
        { lower: 323290, upper: TOP, rate: 0.0765 },
      ],
    },
  },
} satisfies TaxConfig;
