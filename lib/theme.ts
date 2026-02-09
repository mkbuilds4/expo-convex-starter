/**
 * Minimal color scheme. Use only these tokens—no extra colors.
 *
 * Primary (main actions, highlights): pick one when you're ready. Options:
 *   Neutral (current): '#404040'
 *   Blue:    '#3b82f6'
 *   Green:   '#22c55e'
 *   Emerald: '#047857'  (lighter: '#059669')
 *   Amber:   '#f59e0b'
 *   Slate:   '#475569'
 */
export type ColorPalette = {
  background: string;
  surface: string;
  text: string;
  muted: string;
  error: string;
  primary: string;
  onPrimary: string; // text on primary (e.g. button label)
};

export const darkColors: ColorPalette = {
  background: '#0a0a0a',
  surface: '#262626',
  text: '#fafafa',
  muted: '#737373',
  error: '#f87171',
  primary: '#047857',
  onPrimary: '#ffffff',
};

export const lightColors: ColorPalette = {
  background: '#fafafa',
  surface: '#e5e5e5',
  text: '#171717',
  muted: '#737373',
  error: '#dc2626',
  primary: '#047857',
  onPrimary: '#ffffff',
};

/** @deprecated Use useTheme().colors or darkColors/lightColors */
export const colors = darkColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
} as const;

export const typography = {
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
  },
  bodySmall: {
    fontSize: 15,
    fontWeight: '400' as const,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
  },
  button: {
    fontSize: 16,
    fontWeight: '500' as const,
  },
} as const;

export const layout = {
  maxContentWidth: 320,
} as const;
