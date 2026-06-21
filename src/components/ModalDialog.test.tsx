import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ModalDialog from './ModalDialog';

describe('ModalDialog', () => {
  it('renders title and message', () => {
    render(
      <ModalDialog
        title="Confirm"
        message="Are you sure?"
        primary={{ label: 'Yes', onPress: () => {} }}
      />,
    );
    expect(screen.getByText('Confirm')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
  });

  it('calls onPress when primary button is clicked', () => {
    const handlePress = vi.fn();
    render(
      <ModalDialog
        title="Confirm"
        message="Are you sure?"
        primary={{ label: 'Yes', onPress: handlePress }}
      />,
    );
    fireEvent.click(screen.getByText('Yes'));
    expect(handlePress).toHaveBeenCalledTimes(1);
  });

  it('handles autoClose countdown', () => {
    vi.useFakeTimers();
    render(
      <ModalDialog
        title="Alert"
        message="Closing soon"
        primary={{ label: 'OK', onPress: () => {} }}
        autoCloseMs={3000}
      />,
    );

    expect(screen.getByText(/3s/)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText(/2s/)).toBeInTheDocument();
    vi.useRealTimers();
  });
});
