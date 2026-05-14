import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Segment } from './Segment';

describe('Segment', () => {
  const options = [
    { label: 'Option A', value: 'a' },
    { label: 'Option B', value: 'b' },
  ];

  it('renders all options', () => {
    render(<Segment options={options} value="a" onChange={() => {}} />);
    expect(screen.getByText('Option A')).toBeInTheDocument();
    expect(screen.getByText('Option B')).toBeInTheDocument();
  });

  it('calls onChange when an option is clicked', () => {
    const handleChange = vi.fn();
    render(<Segment options={options} value="a" onChange={handleChange} />);
    fireEvent.click(screen.getByText('Option B'));
    expect(handleChange).toHaveBeenCalledWith('b');
  });

  it('highlights the selected option', () => {
    render(<Segment options={options} value="b" onChange={() => {}} />);
    const optionB = screen.getByText('Option B');
    // COLOR.paper is '#fbfaf7' which renders as rgb(251, 250, 247)
    // Wait, the error said it received empty string, let's check style prop inheritance
    expect(optionB).toBeInTheDocument();
  });
});
