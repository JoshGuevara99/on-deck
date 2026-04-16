export const DARK_COLORS = {
  // Backgrounds — pure black, no tint
  bg:           '#080808',
  surface:      '#111111',
  surfaceHigh:  '#1A1A1A',

  // Accents — neon red primary, amber secondary
  gold: '#FF2D55',   // primary accent (neon red — "on air" light)
  jam:  '#FF9500',   // secondary accent (amber glow)

  // Text — clean white to dark gray
  text:          '#FFFFFF',
  textSecondary: '#A0A0A0',
  textMuted:     '#3D3D3D',

  // UI chrome
  border:  '#1E1E1E',
  tabBar:  '#080808',

  // Status
  live: '#34C759',
} as const;

// Light mode kept for backward-compat but unused (app is dark-only)
export const LIGHT_COLORS = DARK_COLORS;

export const COLORS = DARK_COLORS;

export type AppColors = { [K in keyof typeof DARK_COLORS]: string };
export type ThemeMode = 'dark' | 'light';
