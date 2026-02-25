export const DARK_COLORS = {
  // Backgrounds — deep, atmospheric dark
  bg: '#0A0A12',
  surface: '#121220',
  surfaceHigh: '#1A1A2C',

  // Accents — warm stage-light tones
  gold: '#F0A030',   // open mic
  jam: '#E8553E',    // jam session

  // Text
  text: '#EDEEF5',
  textSecondary: '#8888AA',
  textMuted: '#55556E',

  // UI chrome
  border: '#252540',
  tabBar: '#0D0D1A',

  // Status
  live: '#4ADE80',
} as const;

export const LIGHT_COLORS = {
  // Backgrounds
  bg: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceHigh: '#F2F2F7',

  // Accents — slightly deeper for light-background contrast
  gold: '#C8820A',
  jam: '#C4402E',

  // Text
  text: '#0D0D1A',
  textSecondary: '#44445A',
  textMuted: '#888899',

  // UI chrome
  border: '#E0E0EC',
  tabBar: '#FFFFFF',

  // Status
  live: '#16A34A',
} as const;

// Backward-compat alias — still compiles anywhere that hasn't migrated to useTheme() yet.
export const COLORS = DARK_COLORS;

// Widen literal types to string so both DARK_COLORS and LIGHT_COLORS satisfy AppColors.
export type AppColors = { [K in keyof typeof DARK_COLORS]: string };
export type ThemeMode = 'dark' | 'light';
