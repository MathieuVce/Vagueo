import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import VgButton from './VgButton';

describe('VgButton', () => {
  it('renders correctly', () => {
    render(<VgButton onClick={() => {}}>Click Me</VgButton>);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<VgButton onClick={handleClick}>Click Me</VgButton>);
    fireEvent.click(screen.getByText('Click Me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows children content (e.g. icon)', () => {
    render(
      <VgButton onClick={() => {}}>
        <span>🚀</span> Rocket
      </VgButton>,
    );
    expect(screen.getByText('🚀')).toBeInTheDocument();
    expect(screen.getByText(/Rocket/)).toBeInTheDocument();
  });
});
