import React, { createContext, useContext, useMemo, useState } from 'react';
import { DARK_COLORS, LIGHT_COLORS, type AppColors, type ThemeMode } from '../constants/colors';

interface ThemeContextValue {
  colors: AppColors;
  theme: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>('dark');

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: theme === 'dark' ? DARK_COLORS : LIGHT_COLORS,
      theme,
      toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
