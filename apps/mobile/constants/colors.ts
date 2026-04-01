export const DARK_COLORS = {
  // Backgrounds — deep purple-black, mysterious and atmospheric
  bg: '#0C091A',
  surface: '#130F28',
  surfaceHigh: '#1E1838',

  // Accents — warm stage-light tones (unchanged)
  gold: '#F0A030',   // open mic
  jam: '#E8553E',    // jam session

  // Text — slight purple warmth
  text: '#EDE8FF',
  textSecondary: '#9A8EC0',
  textMuted: '#544870',

  // UI chrome
  border: '#2E2550',
  tabBar: '#08060F',

  // Status
  live: '#4ADE80',
} as const;

export const LIGHT_COLORS = {
  // Backgrounds — warm cream/stone tones (no pure whites or cold grays)
  bg: '#FAF8F4',        // warm off-white, slight parchment
  surface: '#FFFDF8',   // warm white for cards and inputs
  surfaceHigh: '#F0EAE0', // warm stone for elevated/nested surfaces

  // Accents — warm stage tones, tuned for legibility on light backgrounds
  gold: '#B8741A',      // rich golden amber (open mic)
  jam: '#BE3B28',       // terracotta red (jam session)

  // Text — warm-tinted darks; no cold blue-grays
  text: '#1A1410',         // warm near-black
  textSecondary: '#574A3E', // warm medium brown — ~7:1 on bg ✓ WCAG AA
  textMuted: '#7A6E62',    // warm taupe — ~4.5:1 on bg ✓ WCAG AA

  // UI chrome — sandy, warm
  border: '#E2D9CC',    // warm sand border
  tabBar: '#FFFDF8',    // warm white tab bar

  // Status
  live: '#1A7A38',
} as const;

// Backward-compat alias — still compiles anywhere that hasn't migrated to useTheme() yet.
export const COLORS = DARK_COLORS;

// Widen literal types to string so both DARK_COLORS and LIGHT_COLORS satisfy AppColors.
export type AppColors = { [K in keyof typeof DARK_COLORS]: string };
export type ThemeMode = 'dark' | 'light';
