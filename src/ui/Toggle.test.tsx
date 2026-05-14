import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Toggle } from './Toggle';

describe('Toggle', () => {
  it('renders label and sublabel', () => {
    render(<Toggle on={false} onToggle={() => {}} label="Push Notifications" sublabel="Stay updated" />);
    expect(screen.getByText('Push Notifications')).toBeInTheDocument();
    expect(screen.getByText('Stay updated')).toBeInTheDocument();
  });

  it('calls onToggle when clicked', () => {
    const handleToggle = vi.fn();
    render(<Toggle on={false} onToggle={handleToggle} label="Toggle" />);
    fireEvent.click(screen.getByRole('switch'));
    expect(handleToggle).toHaveBeenCalledTimes(1);
  });

  it('reflects "on" state via aria-checked', () => {
    const { rerender } = render(<Toggle on={false} onToggle={() => {}} label="Toggle" />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
    
    rerender(<Toggle on={true} onToggle={() => {}} label="Toggle" />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('applies style changes based on "on" state', () => {
    const { rerender } = render(<Toggle on={false} onToggle={() => {}} label="Toggle" />);
    const toggle = screen.getByRole('switch');
    // COLOR.line is 'rgba(17,20,26,0.08)'
    expect(toggle.style.background).toBe('transparent');

    rerender(<Toggle on={true} onToggle={() => {}} label="Toggle" />);
    // COLOR.primaryBg is 'oklch(0.96 0.03 250)'
    expect(toggle.style.background).toBe('oklch(0.96 0.03 250)');
  });
});
