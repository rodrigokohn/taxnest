/**
 * Tax-year resolution.
 *
 * The app REQUESTS a config for the current calendar year; the backend (or the
 * bundled seed) returns the most recent config at or before it. The *operating*
 * year the UI shows and keys data by is then the loaded config's own `tax_year`
 * — see `useActiveTaxYear`. This makes the app advance automatically when the
 * backend serves a newer year, with no app update and no way to crash.
 */

/** The current calendar year — the tax year we request a config for. */
export function calendarYear(date: Date = new Date()): number {
  return date.getFullYear();
}
