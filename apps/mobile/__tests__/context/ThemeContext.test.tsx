import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ThemeProvider, useTheme } from '../../context/ThemeContext';
import { DARK_COLORS, LIGHT_COLORS } from '../../constants/colors';

function ThemeReadout() {
  const { theme, colors, toggleTheme } = useTheme();
  return (
    <>
      <Text testID="theme-value">{theme}</Text>
      <Text testID="bg-color">{colors.bg}</Text>
      <TouchableOpacity testID="toggle-btn" onPress={toggleTheme}>
        <Text>Toggle</Text>
      </TouchableOpacity>
    </>
  );
}

describe('ThemeProvider', () => {
  it('starts in dark mode', () => {
    render(
      <ThemeProvider>
        <ThemeReadout />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('theme-value').props.children).toBe('dark');
    expect(screen.getByTestId('bg-color').props.children).toBe(DARK_COLORS.bg);
  });

  it('toggles to light mode', () => {
    render(
      <ThemeProvider>
        <ThemeReadout />
      </ThemeProvider>,
    );
    fireEvent.press(screen.getByTestId('toggle-btn'));
    expect(screen.getByTestId('theme-value').props.children).toBe('light');
    expect(screen.getByTestId('bg-color').props.children).toBe(LIGHT_COLORS.bg);
  });

  it('toggles back to dark mode', () => {
    render(
      <ThemeProvider>
        <ThemeReadout />
      </ThemeProvider>,
    );
    fireEvent.press(screen.getByTestId('toggle-btn'));
    fireEvent.press(screen.getByTestId('toggle-btn'));
    expect(screen.getByTestId('theme-value').props.children).toBe('dark');
  });

  it('throws when useTheme is called outside provider', () => {
    // Suppress expected error output from React
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ThemeReadout />)).toThrow(
      'useTheme must be used inside <ThemeProvider>',
    );
    consoleSpy.mockRestore();
  });
});
