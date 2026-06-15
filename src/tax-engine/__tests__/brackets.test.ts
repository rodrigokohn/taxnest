import { describe, expect, it } from '@jest/globals';

import { applyProgressiveBrackets } from '@/tax-engine/brackets';
import { SEED_TAX_CONFIG_2025 } from '@/tax-config/seed-2025';

const single = SEED_TAX_CONFIG_2025.federal.brackets.single;

describe('applyProgressiveBrackets', () => {
  it('returns 0 for zero or negative income', () => {
    expect(applyProgressiveBrackets(0, single)).toBe(0);
    expect(applyProgressiveBrackets(-100, single)).toBe(0);
  });

  it('taxes within the first bracket only', () => {
    // $10,000 entirely in the 10% bracket.
    expect(applyProgressiveBrackets(10_000, single)).toBeCloseTo(1_000, 2);
  });

  it('taxes across multiple brackets correctly', () => {
    // $50,000: 10%·11,925 + 12%·(48,475−11,925) + 22%·(50,000−48,475)
    //        = 1,192.5 + 4,386 + 335.5 = 5,914
    expect(applyProgressiveBrackets(50_000, single)).toBeCloseTo(5_914, 2);
  });

  it('handles the unbounded top bracket', () => {
    expect(applyProgressiveBrackets(1_000_000, single)).toBeGreaterThan(0);
  });
});
