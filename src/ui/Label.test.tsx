import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Label } from './Label';

describe('Label', () => {
  it('renders children correctly', () => {
    render(<Label>Test Label</Label>);
    expect(screen.getByText('Test Label')).toBeInTheDocument();
  });

  it('applies custom styles', () => {
    render(<Label style={{ color: 'red' }}>Styled Label</Label>);
    const label = screen.getByText('Styled Label');
    expect(label.style.color).toBe('red');
  });
});
