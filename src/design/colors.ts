/**
 * Design tokens — color palette (PRD §8.0).
 *
 * Direction: "calm financial clarity". Deep green carries safety / money /
 * "you're covered". The warm coral accent is reserved EXCLUSIVELY for the
 * "set aside" moment (the emotional climax of the app) — do not use it for
 * ordinary UI. Semantic colors are used sparingly.
 */
export const Colors = {
  light: {
    primary: '#0F6E56', // deep green — brand, primary CTAs
    primaryTint: '#E1F5EE', // success / highlight background
    accent: '#D85A30', // warm coral — ONLY the "set aside" moment
    textPrimary: '#1A1A1A',
    textSecondary: '#6B6B6B',
    textTertiary: '#9A9A9A',
    background: '#FFFFFF',
    surface: '#F7F7F5', // cards, groupings
    border: 'rgba(0,0,0,0.08)',
    success: '#1D9E75', // covered / paid / on track
    warning: '#BA7517', // deadline approaching
    danger: '#C0392B', // overdue / missed — rare
  },
  dark: {
    primary: '#1F9E7C', // brightness-adjusted green for dark surfaces
    primaryTint: '#11332B',
    accent: '#E86A41',
    textPrimary: '#F2F4F3',
    textSecondary: '#A6ADAA',
    textTertiary: '#6F7773',
    background: '#0B0F0D', // near-black with a hint of green
    surface: '#161A18', // one step above background
    border: 'rgba(255,255,255,0.10)',
    success: '#2BB286',
    warning: '#D08A2C',
    danger: '#E05646',
  },
} as const;

export type ColorScheme = keyof typeof Colors; // 'light' | 'dark'
export type ThemeColor = keyof typeof Colors.light;
