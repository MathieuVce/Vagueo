import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import VagueoLogo from './VagueoLogo';

describe('VagueoLogo', () => {
  it('renders correctly', () => {
    render(<VagueoLogo />);
    expect(screen.getByText('Vagu')).toBeInTheDocument();
    expect(screen.getByText('o')).toBeInTheDocument();
  });

  it('applies custom size to style', () => {
    render(<VagueoLogo size={50} />);
    const logo = screen.getByText('Vagu').parentElement;
    expect(logo?.style.fontSize).toBe('50px');
  });
});
