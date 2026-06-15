/**
 * Design tokens — spacing & layout (PRD §8.0).
 * 8pt base grid, generous side margins, soft rounded cards.
 */
export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 14, // default card radius
  xl: 20,
  pill: 999,
} as const;

/** Generous horizontal screen padding (16–20pt range). */
export const ScreenPadding = 20;

/** Minimum interactive touch target (PRD §8.0 accessibility). */
export const MinTouchTarget = 44;
