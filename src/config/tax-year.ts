/**
 * The tax year the app operates on.
 *
 * Until the backend serves configs for newer years, the app uses the latest
 * year we ship a validated seed for. Once the backend (Phase 3) and the annual
 * AI refresh (Phase 5) are live, this becomes the current calendar year and the
 * config is fetched dynamically.
 */
export const DEFAULT_TAX_YEAR = 2025;

/** The calendar year for a given date (a payment's tax year). */
export function calendarYear(date: Date = new Date()): number {
  return date.getFullYear();
}
