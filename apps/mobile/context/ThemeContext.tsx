import React, { createContext, useContext } from 'react';
import { DARK_COLORS, type AppColors, type ThemeMode } from '../constants/colors';

interface ThemeContextValue {
  colors: AppColors;
  theme: ThemeMode;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: DARK_COLORS,
  theme: 'dark',
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeContext.Provider value={{ colors: DARK_COLORS, theme: 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
