import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { EventTypeBadge } from '../../components/EventTypeBadge';
import { ThemeProvider } from '../../context/ThemeContext';

function wrap(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('EventTypeBadge', () => {
  it('renders "Open Mic" for OPEN_MIC type', () => {
    wrap(<EventTypeBadge type="OPEN_MIC" />);
    expect(screen.getByText('Open Mic')).toBeTruthy();
  });

  it('renders "Jam Session" for JAM_SESSION type', () => {
    wrap(<EventTypeBadge type="JAM_SESSION" />);
    expect(screen.getByText('Jam Session')).toBeTruthy();
  });
});
