import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Toast } from './Toast';

describe('Toast', () => {
  it('renders message and type correctly', () => {
    render(<Toast message="Success!" type="success" />);
    expect(screen.getByText('Success!')).toBeInTheDocument();
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('calls onDone after duration', () => {
    vi.useFakeTimers();
    const handleDone = vi.fn();
    render(<Toast message="Auto hide" onDone={handleDone} duration={1000} />);
    
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    
    expect(handleDone).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
