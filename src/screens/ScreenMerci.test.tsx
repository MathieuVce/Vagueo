import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ScreenMerci from './ScreenMerci';

describe('ScreenMerci', () => {
  it('renders thank you message', () => {
    render(<ScreenMerci onRestart={() => {}} />);
    expect(screen.getByText(/À bientôt/i)).toBeInTheDocument();
    expect(screen.getByText(/Votre session est terminée/i)).toBeInTheDocument();
  });

  it('calls onRestart when button is clicked', () => {
    const handleRestart = vi.fn();
    render(<ScreenMerci onRestart={handleRestart} />);
    fireEvent.click(screen.getByText(/Rejoindre une nouvelle file/i));
    expect(handleRestart).toHaveBeenCalledTimes(1);
  });
});
