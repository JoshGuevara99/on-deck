export const DARK_COLORS = {
  // Backgrounds
  bg: '#08080E',
  surface: '#0F0F1C',
  surfaceHigh: '#17172A',

  // Accents
  gold: '#FFB800',     // Open Mic / warm
  jam: '#FF3CAC',      // Hot magenta — neon sign energy
  accent: '#7C3AFF',   // Electric violet — primary CTA / spotlight
  cyan: '#00D4FF',     // Electric cyan — third accent

  // Text
  text: '#F0F0FF',
  textSecondary: '#7878A0',
  textMuted: '#4A4A6A',

  // UI chrome
  border: '#1E1E38',
  tabBar: '#0F0F1C',

  // Status
  live: '#4ADE80',
} as const;

export const LIGHT_COLORS = {
  // Backgrounds — warm cream / aged poster
  bg: '#F2F0EB',
  surface: '#FDFCF8',
  surfaceHigh: '#EDEAE3',

  // Accents
  gold: '#D4900A',
  jam: '#DB2777',
  accent: '#6D28D9',
  cyan: '#0284C7',

  // Text
  text: '#0A0810',
  textSecondary: '#44445A',
  textMuted: '#888899',

  // UI chrome
  border: '#DDD8CE',
  tabBar: '#FDFCF8',

  // Status
  live: '#16A34A',
} as const;

// Backward-compat alias
export const COLORS = DARK_COLORS;

export type AppColors = { [K in keyof typeof DARK_COLORS]: string };
export type ThemeMode = 'dark' | 'light';
