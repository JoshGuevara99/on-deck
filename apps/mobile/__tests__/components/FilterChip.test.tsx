import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { FilterChip } from '../../components/FilterChip';
import { ThemeProvider } from '../../context/ThemeContext';

function wrap(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('FilterChip', () => {
  it('renders the label', () => {
    wrap(<FilterChip label="Open Mic" active={false} onPress={jest.fn()} />);
    expect(screen.getByText('Open Mic')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    wrap(<FilterChip label="Jazz" active={false} onPress={onPress} />);
    fireEvent.press(screen.getByText('Jazz'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('has selected accessibility state when active', () => {
    wrap(<FilterChip label="All" active={true} onPress={jest.fn()} />);
    const chip = screen.getByRole('button', { name: 'All' });
    expect(chip.props.accessibilityState).toMatchObject({ selected: true });
  });

  it('has unselected accessibility state when inactive', () => {
    wrap(<FilterChip label="All" active={false} onPress={jest.fn()} />);
    const chip = screen.getByRole('button', { name: 'All' });
    expect(chip.props.accessibilityState).toMatchObject({ selected: false });
  });
});
