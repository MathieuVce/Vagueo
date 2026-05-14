import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import WaveBackground from './WaveBackground';

describe('WaveBackground', () => {
  it('renders without crashing', () => {
    const { container } = render(<WaveBackground />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
