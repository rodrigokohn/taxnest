import { Alert } from 'react-native';

/**
 * Single source of truth for what the deterministic estimate covers and what it
 * deliberately leaves out. Used by the in-app scope note and the disclaimer so
 * the product is honest about its boundaries (it's an estimator, not a filing
 * engine). Keep in sync with the engine's actual capabilities.
 */
export const ESTIMATE_INCLUDES = [
  'Federal income tax',
  'Self-employment tax (Social Security + Medicare)',
  'State income tax — where rates are available',
];

export const ESTIMATE_EXCLUDES = [
  'Local / city income taxes (e.g. NYC, San Francisco)',
  'Tax credits (Child Tax Credit, EITC, education…)',
  'Itemized deductions (uses the standard deduction)',
  'Other income — W-2 / spouse wages, investments, capital gains',
  'Net Investment Income Tax, AMT, multi-state or part-year residency',
];

export const ESTIMATE_ASSUMPTIONS =
  'Estimates assume one self-employment income, the standard deduction, and a single state ' +
  'of residence for the full year.';

/** The canonical app disclaimer — names the assumptions so it's accurate, not generic. */
export const DISCLAIMER =
  'Taxnest provides estimates for planning purposes only — not tax, legal, or financial ' +
  'advice, and no substitute for a licensed professional. ' +
  ESTIMATE_ASSUMPTIONS;

/** A short, calm one-liner for placing near a number. */
export const ESTIMATE_SCOPE_SHORT =
  'Covers federal, self-employment & state tax — not local taxes, credits, or other income.';

/** Opens the full "what's counted" breakdown (matches the app's Alert pattern). */
export function showEstimateScope(): void {
  Alert.alert(
    'What this estimate covers',
    `Included:\n• ${ESTIMATE_INCLUDES.join('\n• ')}\n\n` +
      `Not included:\n• ${ESTIMATE_EXCLUDES.join('\n• ')}\n\n` +
      `${ESTIMATE_ASSUMPTIONS}\n\nThis is an estimate for planning only — not tax advice.`,
  );
}
