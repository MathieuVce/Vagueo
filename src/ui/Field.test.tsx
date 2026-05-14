import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Field, NumberField } from './Field';

describe('Field', () => {
  it('renders label and placeholder', () => {
    render(<Field label="Email" value="" onChange={() => {}} placeholder="Enter email" />);
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter email')).toBeInTheDocument();
  });

  it('calls onChange when typing', () => {
    const handleChange = vi.fn();
    render(<Field value="" onChange={handleChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test@example.com' } });
    expect(handleChange).toHaveBeenCalledWith('test@example.com');
  });

  it('respects readOnly prop', () => {
    render(<Field value="Fixed" onChange={() => {}} readOnly />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('readonly');
  });
});

describe('NumberField', () => {
  it('renders label and unit', () => {
    render(<NumberField label="Minutes" value={10} onChange={() => {}} unit="min" />);
    expect(screen.getByText('Minutes')).toBeInTheDocument();
    expect(screen.getByText('min')).toBeInTheDocument();
  });

  it('calls onChange with a number when changed', () => {
    const handleChange = vi.fn();
    render(<NumberField value={10} onChange={handleChange} />);
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '20' } });
    expect(handleChange).toHaveBeenCalledWith(20);
  });
});
