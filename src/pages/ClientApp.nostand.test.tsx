/**
 * ClientApp tests when no ?stand= param is present (STAND_ID = '').
 * The app must show a clear "invalid link" screen instead of a broken queue UI.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ClientApp from './ClientApp';
import { useStand } from '../hooks/useStand';
import { useClientSession } from '../hooks/useClientSession';

vi.mock('../tokens', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../tokens')>();
  return { ...actual, STAND_ID: '' };
});

vi.mock('../hooks/useStand');
vi.mock('../hooks/useClientSession');
vi.mock('../hooks/useClock', () => ({ useClock: () => new Date('2024-01-01T10:30:00') }));
vi.mock('../hooks/usePush', () => ({
  usePush: () => ({ requestPermission: vi.fn(), notify: vi.fn() }),
}));

describe('ClientApp — sans STAND_ID (lien invalide)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useStand as any).mockReturnValue([null, {}]);
    (useClientSession as any).mockReturnValue([null, 'loading', {}, {}]);
  });

  it('shows "Lien invalide" heading', () => {
    render(<ClientApp />);
    expect(screen.getByText(/Lien invalide/i)).toBeInTheDocument();
  });

  it('shows instruction to scan QR code again', () => {
    render(<ClientApp />);
    expect(screen.getByText(/QR code/i)).toBeInTheDocument();
  });

  it('does not show the splash join button', () => {
    render(<ClientApp />);
    expect(screen.queryByText(/Rejoindre la file/i)).not.toBeInTheDocument();
  });

  it('does not show the loading spinner', () => {
    render(<ClientApp />);
    expect(screen.queryByText(/Attente estimée/i)).not.toBeInTheDocument();
  });
});
