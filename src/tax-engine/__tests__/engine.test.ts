import { describe, expect, it } from '@jest/globals';

import { SEED_TAX_CONFIG_2025 as CONFIG } from '@/tax-config/seed-2025';
import {
  computeAnnualTax,
  computeSafeHarbor,
  marginalSetAside,
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

describe('state coverage — a state missing from the config must flag itself', () => {
  // AZ is not in the curated seed; it must NOT silently report $0 as complete.
  const breakdown = computeAnnualTax(
    { filing_status: 'single', state: 'AZ', net_profit: 60_000 },
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
