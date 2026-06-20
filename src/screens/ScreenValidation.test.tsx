import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ScreenValidation from './ScreenValidation';

describe('ScreenValidation', () => {
  it('renders correctly with clock and secure color', () => {
    const mockClock = new Date(2026, 4, 14, 12, 30, 45); // 12:30:45
    render(<ScreenValidation clock={mockClock} onDone={() => {}} secureColor="#ff0000" />);
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText(':45')).toBeInTheDocument();
    expect(screen.getByText(/Montrez cet écran au vendeur/i)).toBeInTheDocument();
  });

  it('calls onDone when button is clicked', () => {
    const handleDone = vi.fn();
    render(<ScreenValidation clock={new Date()} onDone={handleDone} />);
    fireEvent.click(screen.getByText(/C'est fait/i));
    expect(handleDone).toHaveBeenCalledTimes(1);
  });
});
