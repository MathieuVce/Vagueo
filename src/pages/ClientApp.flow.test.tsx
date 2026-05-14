import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ClientApp from './ClientApp';
import { useStand } from '../hooks/useStand';
import { useClientSession } from '../hooks/useClientSession';

vi.mock('../hooks/useStand');
vi.mock('../hooks/useClientSession');
vi.mock('../hooks/useClock', () => ({ useClock: () => new Date('2024-01-01T10:30:00') }));
vi.mock('../hooks/usePush', () => ({
  usePush: () => ({ requestPermission: vi.fn(), notify: vi.fn() }),
}));

describe('ClientApp — flux utilisateur', () => {
  const mockStand = { id: 'stand-1', is_open: true, name: 'Test Stand', min_per_person: 3 };
  const baseDerived = { estimatedMin: 5, waitingStatus: 'green', positionAhead: 2 };

  let actions: any;

  beforeEach(() => {
    vi.clearAllMocks();
    actions = {
      join: vi.fn(), leave: vi.fn(), confirmPresence: vi.fn(),
      done: vi.fn(), requestDelay: vi.fn(), extend: vi.fn(), restart: vi.fn(),
    };
    (useStand as any).mockReturnValue([mockStand, {}]);
  });

  afterEach(() => { vi.useRealTimers(); });

  // ─── Parcours complet ──────────────────────────────────────────

  it('splash → rejoindre → attente → appelé → en service → noter → terminer', () => {
    (useClientSession as any).mockReturnValue([null, 'splash', baseDerived, actions]);
    const { rerender } = render(<ClientApp />);

    // Splash : rejoindre la file
    expect(screen.getByText(/Rejoindre la file/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Rejoindre la file/i));
    expect(actions.join).toHaveBeenCalled();

    // En attente
    (useClientSession as any).mockReturnValue([
      { status: 'waiting', delay_used: false }, 'waiting', baseDerived, actions,
    ]);
    rerender(<ClientApp />);
    expect(screen.getByText(/Attente estimée/i)).toBeInTheDocument();

    // Called (checkin)
    (useClientSession as any).mockReturnValue([
      { status: 'checkin', delay_used: false, called_at: { toMillis: () => 1000 } },
      'checkin', baseDerived, actions,
    ]);
    rerender(<ClientApp />);
    expect(screen.getByText(/Approchez/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/JE SUIS DEVANT/i));
    expect(actions.confirmPresence).toHaveBeenCalled();

    // En service (validation)
    (useClientSession as any).mockReturnValue([
      { status: 'validation', delay_used: false, claimed_at: { toMillis: () => 1000 } },
      'validation', baseDerived, actions,
    ]);
    rerender(<ClientApp />);
    expect(screen.getByText(/Montrez cet écran au vendeur/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/C'est fait/i));

    // Notation → passer
    expect(screen.getByText(/Votre avis compte/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Passer sans noter/i));
    expect(actions.done).toHaveBeenCalledWith('completed');
  });

  // ─── Delay flow ───────────────────────────────────────────────

  it('checkin → timeout → modal orange → décaler → modal se ferme', async () => {
    vi.useFakeTimers();
    // positionAhead: 0 → orangePromptMs = 180s ; sinon (2 personnes × 3min) = 360s
    (useClientSession as any).mockReturnValue([
      { status: 'checkin', delay_used: false, called_at: { toMillis: () => 1000 } },
      'checkin', { ...baseDerived, positionAhead: 0 }, actions,
    ]);
    await act(async () => { render(<ClientApp />); });
    await act(async () => { vi.advanceTimersByTime(181_000); });

    expect(screen.getByText(/Vous êtes encore là/i)).toBeInTheDocument();
    // Target the modal button ("Décaler d'environ…"), not ScreenCheckin's ("Pas encore là — décaler…")
    fireEvent.click(screen.getByRole('button', { name: /^Décaler/i }));
    expect(actions.requestDelay).toHaveBeenCalled();
    expect(screen.queryByText(/Vous êtes encore là/i)).not.toBeInTheDocument();
  });

  // ─── Leave flow (delay exhausted) ────────────────────────────

  it('checkin (délai épuisé) → timeout → modal orange → quitter la file', async () => {
    vi.useFakeTimers();
    (useClientSession as any).mockReturnValue([
      { status: 'checkin', delay_used: true, called_at: { toMillis: () => 1000 } },
      'checkin', { ...baseDerived, positionAhead: 0 }, actions,
    ]);
    await act(async () => { render(<ClientApp />); });
    await act(async () => { vi.advanceTimersByTime(181_000); });

    expect(screen.getByText(/Vous êtes encore là/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Quitter la file/i }));
    expect(actions.leave).toHaveBeenCalledWith('left_checkin');
    expect(screen.queryByText(/Vous êtes encore là/i)).not.toBeInTheDocument();
  });

  // ─── Parcours "J'ai fini" depuis le modal de service ─────────

  it('validation → timeout service → J\'ai fini → noter avec étoile → soumettre', async () => {
    vi.useFakeTimers();
    (useClientSession as any).mockReturnValue([
      { status: 'validation', delay_used: false, claimed_at: { toMillis: () => 1000 } },
      'validation', baseDerived, actions,
    ]);
    await act(async () => { render(<ClientApp />); });
    await act(async () => { vi.advanceTimersByTime(541_000); });

    expect(screen.getByText(/Toujours en cours/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/J'ai fini, merci/));
    expect(screen.getByText(/Votre avis compte/i)).toBeInTheDocument();

    fireEvent.click(screen.getAllByText('★')[4]); // 5th star → rating=5
    expect(screen.getByText('Excellent !')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Envoyer mon avis'));
    expect(actions.done).toHaveBeenCalledWith('completed', { rating: 5, feedback: '' });
  });

  // ─── Closed queue flow ────────────────────────────────────────

  it('file fermée : bouton rejoindre absent sur le splash', () => {
    (useStand as any).mockReturnValue([{ ...mockStand, is_open: false }, {}]);
    (useClientSession as any).mockReturnValue([null, 'splash', baseDerived, actions]);
    render(<ClientApp />);
    expect(screen.queryByText(/Rejoindre la file/i)).not.toBeInTheDocument();
  });

  // ─── Parcours pause ───────────────────────────────────────────

  it('pause visible en file d\'attente puis disparaît après reprise', () => {
    (useStand as any).mockReturnValue([{ ...mockStand, is_paused: true }, {}]);
    (useClientSession as any).mockReturnValue([
      { status: 'waiting', delay_used: false }, 'waiting', baseDerived, actions,
    ]);
    const { rerender } = render(<ClientApp />);
    expect(screen.getByText(/En pause/i)).toBeInTheDocument();
    expect(screen.getByText(/Votre place est conservée/i)).toBeInTheDocument();

    (useStand as any).mockReturnValue([{ ...mockStand, is_paused: false }, {}]);
    rerender(<ClientApp />);
    expect(screen.queryByText(/En pause/i)).not.toBeInTheDocument();
  });
});
