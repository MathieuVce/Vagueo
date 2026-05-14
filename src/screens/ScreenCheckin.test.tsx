import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ScreenCheckin from './ScreenCheckin';

describe('ScreenCheckin', () => {
  it('renders check-in instructions', () => {
    render(<ScreenCheckin onConfirm={() => {}} onDelay={() => {}} />);
    expect(screen.getByText(/Approchez/i)).toBeInTheDocument();
    expect(screen.getByText(/JE SUIS DEVANT/i)).toBeInTheDocument();
  });

  it('calls onConfirm when main button is clicked', () => {
    const handleConfirm = vi.fn();
    render(<ScreenCheckin onConfirm={handleConfirm} onDelay={() => {}} />);
    fireEvent.click(screen.getByText(/JE SUIS DEVANT/i));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('shows delay button and calls onDelay when clicked', () => {
    const handleDelay = vi.fn();
    render(<ScreenCheckin onConfirm={() => {}} onDelay={handleDelay} delayUsed={false} delayMin={10} />);
    const delayBtn = screen.getByText(/Pas encore là/i);
    expect(delayBtn).toBeInTheDocument();
    expect(delayBtn).toHaveTextContent(/10 min/);
    fireEvent.click(delayBtn);
    expect(handleDelay).toHaveBeenCalledTimes(1);
  });

  it('hides delay button if delayUsed is true', () => {
    render(<ScreenCheckin onConfirm={() => {}} onDelay={() => {}} delayUsed={true} />);
    expect(screen.queryByText(/Pas encore là/i)).not.toBeInTheDocument();
  });
});
