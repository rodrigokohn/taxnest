import { type Bracket } from '@/tax-config/types';

/**
 * Progressive bracket tax (PRD §6.3). Each bracket taxes only the portion of
 * income that falls within it. The top bracket has `upper: null` (unbounded).
 */
export function applyProgressiveBrackets(income: number, brackets: Bracket[]): number {
  if (income <= 0) return 0;
  let tax = 0;
  for (const bracket of brackets) {
    if (income <= bracket.lower) continue;
    const upper = bracket.upper ?? Infinity;
    const taxedInBracket = Math.min(income, upper) - bracket.lower;
    if (taxedInBracket > 0) tax += taxedInBracket * bracket.rate;
  }
  return tax;
}
