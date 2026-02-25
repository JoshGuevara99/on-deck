import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { FilterModal, type ExtraFilters } from '../../components/FilterModal';
import { ThemeProvider } from '../../context/ThemeContext';

const DEFAULT_FILTERS: ExtraFilters = { tonightOnly: false, freeOnly: false };

function wrap(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('FilterModal', () => {
  it('does not render content when not visible', () => {
    wrap(
      <FilterModal
        visible={false}
        filters={DEFAULT_FILTERS}
        onChange={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(screen.queryByText('Filter Events')).toBeNull();
  });

  it('renders filter options when visible', () => {
    wrap(
      <FilterModal
        visible={true}
        filters={DEFAULT_FILTERS}
        onChange={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText('Filter Events')).toBeTruthy();
    expect(screen.getByText('Tonight only')).toBeTruthy();
    expect(screen.getByText('Free admission')).toBeTruthy();
  });

  it('shows "Done" button when no active filters', () => {
    wrap(
      <FilterModal
        visible={true}
        filters={DEFAULT_FILTERS}
        onChange={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText('Done')).toBeTruthy();
  });

  it('shows "Apply (1)" when one filter is active', () => {
    wrap(
      <FilterModal
        visible={true}
        filters={{ tonightOnly: true, freeOnly: false }}
        onChange={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText('Apply (1)')).toBeTruthy();
  });

  it('shows "Apply (2)" when both filters are active', () => {
    wrap(
      <FilterModal
        visible={true}
        filters={{ tonightOnly: true, freeOnly: true }}
        onChange={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText('Apply (2)')).toBeTruthy();
  });

  it('shows "Clear all" button only when filters are active', () => {
    const { rerender } = wrap(
      <ThemeProvider>
        <FilterModal
          visible={true}
          filters={DEFAULT_FILTERS}
          onChange={jest.fn()}
          onClose={jest.fn()}
        />
      </ThemeProvider>,
    );
    expect(screen.queryByText('Clear all')).toBeNull();

    rerender(
      <ThemeProvider>
        <FilterModal
          visible={true}
          filters={{ tonightOnly: true, freeOnly: false }}
          onChange={jest.fn()}
          onClose={jest.fn()}
        />
      </ThemeProvider>,
    );
    expect(screen.getByText('Clear all')).toBeTruthy();
  });

  it('calls onClose when Done/Apply is pressed', () => {
    const onClose = jest.fn();
    wrap(
      <FilterModal
        visible={true}
        filters={DEFAULT_FILTERS}
        onChange={jest.fn()}
        onClose={onClose}
      />,
    );
    fireEvent.press(screen.getByText('Done'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onChange with cleared filters when "Clear all" is pressed', () => {
    const onChange = jest.fn();
    wrap(
      <FilterModal
        visible={true}
        filters={{ tonightOnly: true, freeOnly: true }}
        onChange={onChange}
        onClose={jest.fn()}
      />,
    );
    fireEvent.press(screen.getByText('Clear all'));
    expect(onChange).toHaveBeenCalledWith({ tonightOnly: false, freeOnly: false });
  });
});
