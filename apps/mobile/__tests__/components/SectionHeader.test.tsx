import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SectionHeader } from '../../components/SectionHeader';
import { ThemeProvider } from '../../context/ThemeContext';

function wrap(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('SectionHeader', () => {
  it('renders the title in uppercase', () => {
    wrap(<SectionHeader title="tonight" />);
    expect(screen.getByText('TONIGHT')).toBeTruthy();
  });

  it('renders the subtitle when provided', () => {
    wrap(<SectionHeader title="Coming Up" subtitle="3 events" />);
    expect(screen.getByText('3 events')).toBeTruthy();
  });

  it('does not render subtitle when omitted', () => {
    wrap(<SectionHeader title="Tonight" />);
    expect(screen.queryByText('3 events')).toBeNull();
  });
});
