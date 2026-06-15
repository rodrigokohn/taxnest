/**
 * USD formatting for display only. The tax math itself happens in the
 * TaxEngine; this module never participates in calculations.
 */
export function formatUSD(amount: number, options: { cents?: boolean } = {}): string {
  const { cents = false } = options;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  }).format(amount);
}
