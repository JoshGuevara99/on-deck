import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider, useTheme } from '../../context/ThemeContext';
import { DARK_COLORS } from '../../constants/colors';

function ThemeReadout() {
  const { theme, colors } = useTheme();
  return (
    <>
      <Text testID="theme-value">{theme}</Text>
      <Text testID="bg-color">{colors.bg}</Text>
    </>
  );
}

describe('ThemeProvider', () => {
  it('is always in dark mode', () => {
    render(
      <ThemeProvider>
        <ThemeReadout />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('theme-value').props.children).toBe('dark');
    expect(screen.getByTestId('bg-color').props.children).toBe(DARK_COLORS.bg);
  });
});
