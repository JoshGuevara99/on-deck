export const DARK_COLORS = {
  // Backgrounds — warm deep blacks, like a late-night venue
  bg: '#0D0A07',
  surface: '#141109',
  surfaceHigh: '#1C1812',

  // Accents — electric stage energy
  gold: '#FFB700',   // electric amber
  jam: '#FF2D55',    // hot pink

  // Text — warm cream, not cold white
  text: '#F5EFE0',
  textSecondary: '#9A8E7C',
  textMuted: '#5A5248',

  // UI chrome
  border: '#2A231A',
  tabBar: '#0A0806',

  // Status
  live: '#39FF14',   // neon green
} as const;

export const LIGHT_COLORS = {
  // Backgrounds
  bg: '#FAF7F2',
  surface: '#FFFFFF',
  surfaceHigh: '#F0EBE3',

  // Accents
  gold: '#D4960A',
  jam: '#E01A47',

  // Text
  text: '#120E0A',
  textSecondary: '#5A4E42',
  textMuted: '#9A8E7C',

  // UI chrome
  border: '#E8E0D4',
  tabBar: '#FAF7F2',

  // Status
  live: '#16A34A',
} as const;

// Backward-compat alias — still compiles anywhere that hasn't migrated to useTheme() yet.
export const COLORS = DARK_COLORS;

// Widen literal types to string so both DARK_COLORS and LIGHT_COLORS satisfy AppColors.
export type AppColors = { [K in keyof typeof DARK_COLORS]: string };
export type ThemeMode = 'dark' | 'light';
