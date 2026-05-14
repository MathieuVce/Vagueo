import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SecureColorBg from './SecureColorBg';

describe('SecureColorBg', () => {
  it('renders with custom bg color', () => {
    const { container } = render(<SecureColorBg bg="#ff0000" />);
    const div = container.firstChild as HTMLElement;
    expect(div.style.background).toBe('rgb(255, 0, 0)');
  });

  it('renders with default color when no bg is provided', () => {
    const { container } = render(<SecureColorBg />);
    const div = container.firstChild as HTMLElement;
    // Default is #39FF14 which is rgb(57, 255, 20)
    expect(div.style.background).toBe('rgb(57, 255, 20)');
  });
});
