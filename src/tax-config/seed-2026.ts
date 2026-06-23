/**
 * Seed TaxConfig for tax year 2026 — OFFLINE-FIRST FALLBACK only.
 *
 * Accuracy notes:
 * - Federal + Self-Employment values are 2026 reference figures (IRS Rev. Proc.
 *   2025-32 / SSA 2026 COLA). These are the accurate core of the app and are
 *   golden-tested.
 * - STATE values are intentionally carried over from the verified 2025 seed as a
 *   CONSERVATIVE approximation: the 2025→2026 state change is mostly small
 *   inflation indexing, and 2025's (lower) thresholds slightly *over*-estimate —
 *   the safe direction. We did NOT use an automated 2026 state scrape because it
 *   misclassified several graduated states (MO, NE, WV, OK) as flat at their
 *   lowest rate. Verified 2026 state brackets will replace these via the annual
 *   refresh + review (task #25 C). The UI labels everything as estimates (#30).
 */
import { SEED_TAX_CONFIG_2025 } from '@/tax-config/seed-2025';
import { type TaxConfig } from '@/tax-config/types';

const TOP = null;

export const SEED_TAX_CONFIG_2026 = {
  tax_year: 2026,
  last_updated: '2026-01-01T00:00:00.000Z',
  source_urls: [
    'https://www.irs.gov/pub/irs-drop/rp-25-32.pdf',
    'https://www.ssa.gov/news/en/cola/factsheets/2026.html',
  ],

  se: {
    social_security_wage_base: 184_500,
    social_security_rate: 0.124,
    medicare_rate: 0.029,
    additional_medicare_rate: 0.009,
    // Statutory, not inflation-indexed — unchanged since 2013.
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
      single: 16_100,
      married_joint: 32_200,
      married_separate: 16_100,
      head_of_household: 24_150,
    },
    brackets: {
      single: [
        { lower: 0, upper: 12_400, rate: 0.1 },
        { lower: 12_400, upper: 50_400, rate: 0.12 },
        { lower: 50_400, upper: 105_700, rate: 0.22 },
        { lower: 105_700, upper: 201_775, rate: 0.24 },
        { lower: 201_775, upper: 256_225, rate: 0.32 },
        { lower: 256_225, upper: 640_600, rate: 0.35 },
        { lower: 640_600, upper: TOP, rate: 0.37 },
      ],
      married_joint: [
        { lower: 0, upper: 24_800, rate: 0.1 },
        { lower: 24_800, upper: 100_800, rate: 0.12 },
        { lower: 100_800, upper: 211_400, rate: 0.22 },
        { lower: 211_400, upper: 403_550, rate: 0.24 },
        { lower: 403_550, upper: 512_450, rate: 0.32 },
        { lower: 512_450, upper: 768_700, rate: 0.35 },
        { lower: 768_700, upper: TOP, rate: 0.37 },
      ],
      // Mirrors single except the top bracket starts at MFJ/2.
      married_separate: [
        { lower: 0, upper: 12_400, rate: 0.1 },
        { lower: 12_400, upper: 50_400, rate: 0.12 },
        { lower: 50_400, upper: 105_700, rate: 0.22 },
        { lower: 105_700, upper: 201_775, rate: 0.24 },
        { lower: 201_775, upper: 256_225, rate: 0.32 },
        { lower: 256_225, upper: 384_350, rate: 0.35 },
        { lower: 384_350, upper: TOP, rate: 0.37 },
      ],
      head_of_household: [
        { lower: 0, upper: 17_700, rate: 0.1 },
        { lower: 17_700, upper: 67_450, rate: 0.12 },
        { lower: 67_450, upper: 105_700, rate: 0.22 },
        { lower: 105_700, upper: 201_775, rate: 0.24 },
        { lower: 201_775, upper: 256_200, rate: 0.32 },
        { lower: 256_200, upper: 640_600, rate: 0.35 },
        { lower: 640_600, upper: TOP, rate: 0.37 },
      ],
    },
    qbi_threshold: {
      single: 201_775,
      married_joint: 403_500,
      married_separate: 201_775,
      head_of_household: 201_775,
    },
    qbi_rate: 0.2,
  },

  // 2026: Apr 15 2026, Jun 15 2026, Sep 15 2026, Jan 15 2027 (all weekdays).
  quarterly_deadlines: ['2026-04-15', '2026-06-15', '2026-09-15', '2027-01-15'],

  // Carried over from the verified 2025 seed (see header) — conservative until
  // verified 2026 state brackets are reviewed in.
  states: SEED_TAX_CONFIG_2025.states,
} satisfies TaxConfig;
