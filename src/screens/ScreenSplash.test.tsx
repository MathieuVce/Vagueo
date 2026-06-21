import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ScreenSplash from './ScreenSplash';

describe('ScreenSplash', () => {
  it('renders correctly with default props', () => {
    render(<ScreenSplash onJoin={() => {}} />);
    expect(screen.getByText(/Temps d'attente estimé/i)).toBeInTheDocument();
    expect(screen.getByText(/Rejoindre la file/i)).toBeInTheDocument();
  });

  it('renders stand name and logo if provided', () => {
    render(
      <ScreenSplash
        onJoin={() => {}}
        standName="Magic Crepes"
        logoUrl="https://example.com/logo.png"
      />,
    );
    expect(screen.getByText('Magic Crepes')).toBeInTheDocument();
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/logo.png');
  });

  it('calls onJoin when button is clicked', () => {
    const handleJoin = vi.fn();
    render(<ScreenSplash onJoin={handleJoin} />);
    fireEvent.click(screen.getByText(/Rejoindre la file/i));
    expect(handleJoin).toHaveBeenCalledTimes(1);
  });

  it('shows closed state when isOpen is false', () => {
    render(<ScreenSplash onJoin={() => {}} isOpen={false} />);
    expect(screen.getByText(/La file est fermée/i)).toBeInTheDocument();
    expect(screen.queryByText(/Rejoindre la file/i)).not.toBeInTheDocument();
  });

  it('shows paused state when isPaused is true', () => {
    render(<ScreenSplash onJoin={() => {}} isPaused={true} />);
    expect(screen.getByText(/Stand en pause/i)).toBeInTheDocument();
  });

  it('shows full state when isFull is true', () => {
    render(<ScreenSplash onJoin={() => {}} isFull={true} />);
    expect(screen.getByText(/File complète/i)).toBeInTheDocument();
  });
});
