import { describe, expect, it } from '@jest/globals';

import { formatUSD } from '@/lib/money';

describe('formatUSD', () => {
  it('formats whole dollars without cents by default', () => {
    expect(formatUSD(2400)).toBe('$2,400');
  });

  it('formats with cents when requested', () => {
    expect(formatUSD(612.5, { cents: true })).toBe('$612.50');
  });

  it('formats zero', () => {
    expect(formatUSD(0)).toBe('$0');
  });
});
