// Laika Music — Design System Theme
// Single source of truth for all visual constants

export const colors = {
  // Backgrounds
  bg: '#030712',
  surface: '#0f172a',
  surfaceRaised: '#0b1a2e',

  // Borders
  borderSubtle: '#1e293b',
  borderAccent: '#334155',

  // Brand
  brand: '#38bdf8',
  brandGlow: '#0284c7',

  // Text
  textPrimary: '#f8fafc',
  textSecondary: '#cbd5e1',
  textMuted: '#64748b',

  // States
  active: '#22d3ee',
  error: '#fca5a5',
  orange: '#f97316',

  // Misc / one-offs used across screens
  deepBlue: '#082f49',
  deepBlueBorder: '#0284c7',
  activeBg: '#0b2535',
  activeBorder: '#0e7490',
  activeDeepBg: '#083344',

  // Extended palette
  skyLight: '#e0f2fe',
  skyMid: '#7dd3fc',
  navBg: '#020617',
  tabBg: '#0b1220',
  cardBlueBorder: '#1e3a8a',
  mutedText: '#9ca3af',
  orangeDeep: '#9a3412',
  coverBorder: '#0ea5e9',
} as const;

export const typography = {
  display: { fontSize: 30, fontWeight: '800' as const },
  title: { fontSize: 24, fontWeight: '800' as const },
  heading: { fontSize: 19, fontWeight: '700' as const },
  body: { fontSize: 14, fontWeight: '400' as const },
  bodyStrong: { fontSize: 15, fontWeight: '600' as const },
  caption: { fontSize: 12, fontWeight: '600' as const },
  label: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 18,
  xxl: 20,
  pill: 999,
} as const;

export const shadows = {
  card: {
    shadowColor: '#0284c7',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  glow: {
    shadowColor: '#38bdf8',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
} as const;
