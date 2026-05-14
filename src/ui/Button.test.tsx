import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('shows loading state and is disabled when loading prop is true', () => {
    render(<Button loading>Submit</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('…');
    expect(button).toBeDisabled();
  });

  it('applies full width style when full prop is true', () => {
    render(<Button full>Full Button</Button>);
    const button = screen.getByRole('button');
    expect(button.style.width).toBe('100%');
  });

  it('applies variant styles correctly (danger)', () => {
    render(<Button variant="danger">Danger</Button>);
    const button = screen.getByRole('button');
    // COLOR.dangerBg is 'rgba(192,57,43,0.05)'
    expect(button.style.background).toContain('rgba(192, 57, 43, 0.05)');
  });
});
