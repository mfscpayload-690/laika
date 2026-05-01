/**
 * Laika Music — Spotify-Inspired Design System
 *
 * Color palette, typography, spacing, and elevation tokens
 * modeled after Spotify's dark-mode visual language.
 */

export const colors = {
  // Core backgrounds
  background: '#121212',
  surface: '#181818',
  surfaceElevated: '#282828',
  surfaceBright: '#333333',

  // Brand accent (Spotify Green)
  brand: '#1DB954',
  brandDark: '#1AA34A',
  brandLight: '#1ED760',

  // Text hierarchy
  textPrimary: '#FFFFFF',
  textSecondary: '#B3B3B3',
  textMuted: '#727272',
  textDisabled: '#535353',

  // Interactive
  activeIcon: '#FFFFFF',
  inactiveIcon: '#B3B3B3',

  // Borders & dividers
  borderSubtle: '#333333',
  borderAccent: '#404040',

  // Semantic
  error: '#F15E6C',
  warning: '#F59B42',
  success: '#1DB954',

  // Player-specific
  progressTrack: '#535353',
  progressFill: '#1DB954',
  shuffleActive: '#1DB954',

  // Cards
  cardBg: '#181818',
  cardBgHover: '#282828',

  // Navigation
  navBg: '#121212',
  tabBg: 'transparent',

  // Legacy aliases (backward compat)
  deepBlue: '#121212',
  skyLight: '#FFFFFF',
  orange: '#1DB954',
  orangeDeep: '#1AA34A',
  coverBorder: '#333333',
  cardBlueBorder: '#282828',
  surfaceRaised: '#181818',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radii = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  pill: 999,
  full: 9999,
} as const;

export const typography = {
  display: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  heading: {
    fontSize: 16,
    fontWeight: '600' as const,
    letterSpacing: 0,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
  },
  logoGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.brand,
    opacity: 0.4, // Increased opacity for more presence
    transform: [{ scale: 1.6 }],
    zIndex: 1,
    // Add a slight blur-like shadow
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
  },
  label: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
  // Font weight aliases for ease of use
  bold: 'System', // On RN, fontFamily can often just be the font name, or we use fontWeight
  medium: 'System',
  regular: 'System',
} as const;

export const shadows = {
  glow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  subtle: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
} as const;
