import { describe, expect, it } from '@jest/globals';

import { SEED_TAX_CONFIG_2025 as CONFIG } from '@/tax-config/seed-2025';
import { SEED_TAX_CONFIG_2026 as CONFIG_2026 } from '@/tax-config/seed-2026';
import {
  computeAnnualTax,
  computeSafeHarbor,
  marginalSetAside,
  marginalSetAsideBreakdown,
  type TaxProfile,
} from '@/tax-engine';

// All expected values below are computed by hand from the 2025 seed config.
// They are the regression anchors for the engine (PRD §6.8).

describe('§6.8 case 1 — single, $60k net profit, TX (no state tax)', () => {
  const breakdown = computeAnnualTax(
    { filing_status: 'single', state: 'TX', net_profit: 60_000 },
    CONFIG,
  );

  it('computes SE tax with the 0.9235 factor', () => {
    // NESE 55,410 → SS 6,870.84 + Medicare 1,606.89 = 8,477.73
    expect(breakdown.se.socialSecurity).toBeCloseTo(6_870.84, 2);
    expect(breakdown.se.medicare).toBeCloseTo(1_606.89, 2);
    expect(breakdown.se.additionalMedicare).toBe(0);
    expect(breakdown.se.seTax).toBeCloseTo(8_477.73, 2);
    expect(breakdown.se.seTaxDeduction).toBeCloseTo(4_238.865, 3);
  });

  it('computes federal income tax (after QBI)', () => {
    // taxable income 32,608.91 → federal 3,674.57
    expect(breakdown.federalIncomeTax).toBeCloseTo(3_674.57, 2);
  });

  it('has no state tax in TX', () => {
    expect(breakdown.stateTax).toBe(0);
    expect(breakdown.stateSupported).toBe(true);
  });

  it('totals SE + federal + state', () => {
    expect(breakdown.totalAnnualTax).toBeCloseTo(12_152.3, 2);
    expect(breakdown.quarterlyPayment).toBeCloseTo(3_038.07, 2);
    expect(breakdown.effectiveRate).toBeCloseTo(0.2025, 4);
  });
});

describe('§6.8 case 2 — single, $60k, California (progressive state tax)', () => {
  const breakdown = computeAnnualTax(
    { filing_status: 'single', state: 'CA', net_profit: 60_000 },
    CONFIG,
  );

  it('applies CA progressive brackets to AGI − CA standard deduction', () => {
    // state taxable 50,221.14 across CA brackets ≈ 1,636.29
    expect(breakdown.stateSupported).toBe(true);
    expect(breakdown.stateTax).toBeCloseTo(1_636.29, 2);
  });

  it('adds state tax on top of the federal+SE total', () => {
    expect(breakdown.totalAnnualTax).toBeCloseTo(13_788.59, 2);
  });
});

describe('§6.8 case 3 — high income $250k (SS cap + additional Medicare)', () => {
  const breakdown = computeAnnualTax(
    { filing_status: 'single', state: 'TX', net_profit: 250_000 },
    CONFIG,
  );

  it('caps Social Security at the wage base', () => {
    // NESE 230,875 > 176,100 → SS = 176,100 × 0.124 = 21,836.40
    expect(breakdown.se.socialSecurity).toBeCloseTo(21_836.4, 2);
  });

  it('charges additional Medicare above the threshold', () => {
    // (230,875 − 200,000) × 0.009 = 277.875
    expect(breakdown.se.additionalMedicare).toBeCloseTo(277.875, 3);
  });
});

describe('§6.8 case 4 — income below the standard deduction', () => {
  const breakdown = computeAnnualTax(
    { filing_status: 'single', state: 'TX', net_profit: 10_000 },
    CONFIG,
  );

  it('has zero taxable income and zero federal tax', () => {
    expect(breakdown.taxableIncome).toBe(0);
    expect(breakdown.federalIncomeTax).toBe(0);
  });

  it('still owes SE tax', () => {
    // NESE 9,235 → SS 1,145.14 + Medicare 267.815 = 1,412.955
    expect(breakdown.se.seTax).toBeCloseTo(1_412.955, 2);
    expect(breakdown.se.seTax).toBeGreaterThan(0);
  });
});

describe('§6.8 case 5 — safe harbor with prior-year AGI > $150k (110%)', () => {
  const currentYearTax = 12_152.3;

  it('uses the 110% multiplier when prior AGI is high and it is the lesser', () => {
    const result = computeSafeHarbor({
      currentYearTax,
      priorYearTax: 8_000,
      priorYearAgi: 160_000,
    });
    expect(result.priorYearMultiplier).toBe(1.1);
    expect(result.basis).toBe('prior_110');
    expect(result.requiredAnnualPayment).toBeCloseTo(8_800, 2); // 8,000 × 1.10
  });

  it('uses the 100% multiplier when prior AGI is below the threshold', () => {
    const result = computeSafeHarbor({
      currentYearTax,
      priorYearTax: 8_000,
      priorYearAgi: 140_000,
    });
    expect(result.priorYearMultiplier).toBe(1);
    expect(result.basis).toBe('prior_100');
    expect(result.requiredAnnualPayment).toBeCloseTo(8_000, 2);
  });

  it('falls back to 90% of the current year with no prior-year data', () => {
    const result = computeSafeHarbor({ currentYearTax });
    expect(result.basis).toBe('current_90');
    expect(result.requiredAnnualPayment).toBeCloseTo(10_937.07, 2); // 0.9 × 12,152.30
  });
});

describe('§6.8 case 6 — marginal set-aside crosses brackets', () => {
  const profile: TaxProfile = { filing_status: 'single', state: 'TX' };
  const payment = 20_000;

  const m1 = marginalSetAside({
    priorNetProfit: 0,
    paymentAmount: payment,
    profile,
    config: CONFIG,
  });
  const m2 = marginalSetAside({
    priorNetProfit: 20_000,
    paymentAmount: payment,
    profile,
    config: CONFIG,
  });
  const m3 = marginalSetAside({
    priorNetProfit: 40_000,
    paymentAmount: payment,
    profile,
    config: CONFIG,
  });

  it('produces a larger set-aside for later payments (progressivity)', () => {
    expect(m1).toBeLessThan(m2);
    expect(m2).toBeLessThan(m3);
  });

  it('makes the later payment exceed the average effective rate', () => {
    const { effectiveRate } = computeAnnualTax(
      { filing_status: 'single', state: 'TX', net_profit: 60_000 },
      CONFIG,
    );
    expect(m3 / payment).toBeGreaterThan(effectiveRate);
  });

  it('decomposes the annual tax exactly (marginals sum to the total)', () => {
    const total = computeAnnualTax(
      { filing_status: 'single', state: 'TX', net_profit: 60_000 },
      CONFIG,
    ).totalAnnualTax;
    expect(m1 + m2 + m3).toBeCloseTo(total, 6);
  });
});

describe('state coverage — an unknown code must flag itself (not silently $0)', () => {
  // All 50 states + DC are configured now; an unrecognized code stays unsupported.
  const breakdown = computeAnnualTax(
    { filing_status: 'single', state: 'ZZ', net_profit: 60_000 },
    CONFIG,
  );

  it('returns $0 state tax but marks it unsupported (not a no-tax state)', () => {
    expect(breakdown.stateTax).toBe(0);
    expect(breakdown.stateSupported).toBe(false);
  });

  it('still computes federal + SE so the estimate is partial, not zero', () => {
    expect(breakdown.federalIncomeTax).toBeGreaterThan(0);
    expect(breakdown.se.seTax).toBeGreaterThan(0);
  });
});

describe('every US state + DC is now supported', () => {
  const CODES = [
    'AL',
    'AK',
    'AZ',
    'AR',
    'CA',
    'CO',
    'CT',
    'DE',
    'DC',
    'FL',
    'GA',
    'HI',
    'ID',
    'IL',
    'IN',
    'IA',
    'KS',
    'KY',
    'LA',
    'ME',
    'MD',
    'MA',
    'MI',
    'MN',
    'MS',
    'MO',
    'MT',
    'NE',
    'NV',
    'NH',
    'NJ',
    'NM',
    'NY',
    'NC',
    'ND',
    'OH',
    'OK',
    'OR',
    'PA',
    'RI',
    'SC',
    'SD',
    'TN',
    'TX',
    'UT',
    'VT',
    'VA',
    'WA',
    'WV',
    'WI',
    'WY',
  ];
  it('flips supported=true for all 51 jurisdictions', () => {
    for (const code of CODES) {
      const b = computeAnnualTax(
        { filing_status: 'single', state: code, net_profit: 60_000 },
        CONFIG,
      );
      expect(b.stateSupported).toBe(true);
    }
  });
});

describe('§ 2026 federal — single, $60k net profit, TX', () => {
  const b = computeAnnualTax({ filing_status: 'single', state: 'TX', net_profit: 60_000 }, CONFIG_2026);

  it('uses the 2026 standard deduction + brackets (lower tax than 2025)', () => {
    // AGI 55,761.135 − $16,100 std − QBI 7,932.227 = taxable 31,728.908
    // 1,240 (10%) + 2,319.469 (12%) = 3,559.47
    expect(b.federalIncomeTax).toBeCloseTo(3_559.47, 2);
  });

  it('SE tax matches 2025 (income below both wage bases) and the year is 2026', () => {
    expect(b.se.seTax).toBeCloseTo(8_477.73, 2);
    expect(CONFIG_2026.tax_year).toBe(2026);
    expect(CONFIG_2026.se.social_security_wage_base).toBe(184_500);
    expect(CONFIG_2026.quarterly_deadlines).toEqual([
      '2026-04-15',
      '2026-06-15',
      '2026-09-15',
      '2027-01-15',
    ]);
  });

  // Authoritative anchors — Tax Foundation Table 1, citing IRS Rev. Proc.
  // 2025-32. These caught a bad AI refresh that shaved $25–50 off the 32%/QBI
  // thresholds; if a future refresh changes them, this test must fail.
  it('matches the IRS-verified 2026 thresholds (Rev. Proc. 2025-32)', () => {
    const single = CONFIG_2026.federal.brackets.single;
    expect(single.find((x) => x.rate === 0.32)?.lower).toBe(201_775);
    expect(single.find((x) => x.rate === 0.35)?.lower).toBe(256_225);
    const mfj = CONFIG_2026.federal.brackets.married_joint;
    expect(mfj.find((x) => x.rate === 0.32)?.lower).toBe(403_550);
    expect(mfj.find((x) => x.rate === 0.35)?.lower).toBe(512_450);
    expect(CONFIG_2026.federal.qbi_threshold.single).toBe(201_775);
    expect(CONFIG_2026.federal.qbi_threshold.married_joint).toBe(403_500);
  });
});

describe('state golden cases ($60k single, AGI 55,761.135)', () => {
  const at = (state: string) =>
    computeAnnualTax({ filing_status: 'single', state, net_profit: 60_000 }, CONFIG);

  it('Arizona flat 2.5% → $1,019.03', () => {
    // (55,761.135 − 15,000) × 0.025
    expect(at('AZ').stateTax).toBeCloseTo(1_019.03, 2);
  });

  it('New Jersey graduated → $1,588.30', () => {
    // 280 + 262.5 + 175 + (55,761.135 − 40,000) × 0.05525
    expect(at('NJ').stateTax).toBeCloseTo(1_588.3, 2);
  });

  it('Oregon graduated → $4,325.10', () => {
    // std $2,800 → taxable 52,961.135: 209 + 448.875 + (52,961.135 − 11,050) × 0.0875
    expect(at('OR').stateTax).toBeCloseTo(4_325.1, 2);
  });
});

describe('marginalSetAsideBreakdown — components sum to the total', () => {
  const args = {
    priorNetProfit: 40_000,
    paymentAmount: 5_000,
    profile: { filing_status: 'single', state: 'CA' } as TaxProfile,
    config: CONFIG,
  };

  it('matches marginalSetAside and decomposes into se + federal + state', () => {
    const b = marginalSetAsideBreakdown(args);
    expect(b.total).toBeCloseTo(marginalSetAside(args), 6);
    expect(b.se + b.federal + b.state).toBeCloseTo(b.total, 6);
    expect(b.se).toBeGreaterThan(0);
    expect(b.state).toBeGreaterThan(0); // CA is supported
  });
});

// Coverage for the non-single filing statuses + the high-income paths the
// single-filer cases never reach (MFJ/HoH brackets, SS wage-base cap, additional
// Medicare, QBI disallowed above the threshold). Values hand-computed from the
// verified 2026 seed via Schedule SE + the progressive brackets + §199A.
describe('§29 authoritative golden — filing statuses & high income (2026)', () => {
  const at = (filing_status: TaxProfile['filing_status'], net_profit: number) =>
    computeAnnualTax({ filing_status, state: 'TX', net_profit }, CONFIG_2026);

  it('MFJ $150k: SS uncapped, no additional Medicare, MFJ brackets + QBI', () => {
    const b = at('married_joint', 150_000);
    expect(b.se.socialSecurity).toBeCloseTo(17_177.1, 2);
    expect(b.se.additionalMedicare).toBe(0); // NESE 138,525 < 250k MFJ threshold
    expect(b.se.seTax).toBeCloseTo(21_194.32, 2);
    expect(b.qbiDeduction).toBeCloseTo(21_440.568, 2);
    expect(b.federalIncomeTax).toBeCloseTo(9_795.47, 2);
  });

  it('HoH $90k: HoH brackets + standard deduction + QBI', () => {
    const b = at('head_of_household', 90_000);
    expect(b.se.seTax).toBeCloseTo(12_716.6, 2);
    expect(b.qbiDeduction).toBeCloseTo(11_898.341, 2);
    expect(b.federalIncomeTax).toBeCloseTo(5_357.2, 2);
  });

  it('Single $300k: SS capped at the wage base, additional Medicare, QBI disallowed', () => {
    const b = at('single', 300_000);
    expect(b.se.socialSecurity).toBeCloseTo(22_878, 2); // 184,500 wage base × 12.4%
    expect(b.se.additionalMedicare).toBeCloseTo(693.45, 2); // (277,050 − 200k) × 0.9%
    expect(b.se.seTax).toBeCloseTo(31_605.9, 2);
    expect(b.qbiDeduction).toBe(0); // taxable income > the $201,775 QBI threshold
    expect(b.federalIncomeTax).toBeCloseTo(62_724.57, 2);
  });
});

// Per-filing-status state brackets (#24). California doubles its single brackets
// + standard deduction for MFJ; the engine must use those, and fall back to the
// single values for any status the state doesn't override.
describe('§24 per-filing-status state tax — California (MFJ doubles)', () => {
  const at = (filing_status: TaxProfile['filing_status'], net_profit: number) =>
    computeAnnualTax({ filing_status, state: 'CA', net_profit }, CONFIG);

  it('applies the doubled MFJ brackets + deduction (far below the single basis)', () => {
    expect(at('married_joint', 120_000).stateTax).toBeCloseTo(3_272.58, 2);
    expect(at('married_joint', 120_000).stateTax).toBeLessThan(at('single', 120_000).stateTax);
  });

  it('falls back to the single brackets for statuses with no override', () => {
    // married_separate has no CA override → identical to the single computation.
    expect(at('married_separate', 120_000).stateTax).toBeCloseTo(at('single', 120_000).stateTax, 6);
  });
});
