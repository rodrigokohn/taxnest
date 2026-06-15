/**
 * Design tokens — typography (PRD §8.0).
 *
 * Uses the iOS system font (SF Pro) for a native feel and free Dynamic Type.
 * Dollar "hero" numbers use tabular figures so they align in lists and don't
 * jump while count-up animating.
 */
import { Platform, type TextStyle } from 'react-native';

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
})!;

/** Type scale from PRD §8.0. */
export const Typography = {
  heroNumber: {
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  screenTitle: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  sectionHeader: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  secondary: { fontSize: 15, lineHeight: 20, fontWeight: '400' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
} satisfies Record<string, TextStyle>;

export type TypographyRole = keyof typeof Typography;
