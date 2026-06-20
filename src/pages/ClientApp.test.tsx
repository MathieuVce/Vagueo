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

describe('ClientApp', () => {
  const mockStand: any = { id: 'test-stand', is_open: true, name: 'Test Stand', min_per_person: 3 };
  const mockClient: any = { status: 'waiting', delay_used: false };
  const mockDerived: any = { estimatedMin: 12, waitingStatus: 'red', positionAhead: 0 };
  const mockActions: any = {
    join: vi.fn(),
    leave: vi.fn(),
    confirmPresence: vi.fn(),
    done: vi.fn(),
    requestDelay: vi.fn(),
    extend: vi.fn(),
    restart: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useStand as any).mockReturnValue([mockStand, {}]);
    (useClientSession as any).mockReturnValue([mockClient, 'waiting', mockDerived, mockActions]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --- Step rendering ---

  it('renders loading spinner when step is loading', () => {
    (useClientSession as any).mockReturnValue([null, 'loading', mockDerived, mockActions]);
    const { container } = render(<ClientApp />);
    expect(container.firstChild).toBeTruthy();
    expect(screen.queryByText(/Attente estimée/i)).not.toBeInTheDocument();
  });

  it('renders ScreenAttente when step is waiting', () => {
    render(<ClientApp />);
    expect(screen.getByText(/Attente estimée/i)).toBeInTheDocument();
  });

  it('renders ScreenSplash when step is splash', () => {
    (useClientSession as any).mockReturnValue([null, 'splash', mockDerived, mockActions]);
    render(<ClientApp />);
    expect(screen.getByText(/Rejoindre la file/i)).toBeInTheDocument();
  });

  it('renders ScreenCheckin when step is checkin', () => {
    (useClientSession as any).mockReturnValue([mockClient, 'checkin', mockDerived, mockActions]);
    render(<ClientApp />);
    expect(screen.getByText(/Approchez/i)).toBeInTheDocument();
    expect(screen.getByText(/JE SUIS DEVANT/i)).toBeInTheDocument();
  });

  it('renders ScreenValidation when step is validation', () => {
    (useClientSession as any).mockReturnValue([
      { ...mockClient, claimed_at: { toMillis: () => Date.now() } },
      'validation',
      mockDerived,
      mockActions,
    ]);
    render(<ClientApp />);
    expect(screen.getByText(/Montrez cet écran au vendeur/i)).toBeInTheDocument();
  });

  it('renders null for unknown step', () => {
    (useClientSession as any).mockReturnValue([null, 'unknown', mockDerived, mockActions]);
    const { container } = render(<ClientApp />);
    expect(container.firstChild).toBeNull();
  });

  // --- PauseOverlay ---

  it('shows PauseOverlay when stand is paused in waiting step', () => {
    (useStand as any).mockReturnValue([{ ...mockStand, is_paused: true }, {}]);
    render(<ClientApp />);
    expect(screen.getByText(/En pause/i)).toBeInTheDocument();
    expect(screen.getByText(/Votre place est conservée/i)).toBeInTheDocument();
  });

  it('shows PauseOverlay in checkin step', () => {
    (useStand as any).mockReturnValue([{ ...mockStand, is_paused: true }, {}]);
    (useClientSession as any).mockReturnValue([mockClient, 'checkin', mockDerived, mockActions]);
    render(<ClientApp />);
    expect(screen.getByText(/En pause/i)).toBeInTheDocument();
  });

  it('shows PauseOverlay in validation step', () => {
    (useStand as any).mockReturnValue([{ ...mockStand, is_paused: true }, {}]);
    (useClientSession as any).mockReturnValue([
      { ...mockClient, claimed_at: { toMillis: () => Date.now() } },
      'validation',
      mockDerived,
      mockActions,
    ]);
    render(<ClientApp />);
    expect(screen.getByText(/En pause/i)).toBeInTheDocument();
  });

  // --- Orange modal (checkin timeout) ---
  // ORANGE_PROMPT_MS = 180_000ms, ORANGE_RESPONSE_MS = 120_000ms.
  // Advance by 181s to fire the prompt timer without triggering the auto-close.

  // --- Orange modal (checkin timeout) ---
  // ORANGE_PROMPT_MS = 180_000ms, ORANGE_RESPONSE_MS = 120_000ms.
  // Use a fixed toMillis() so fake-timer advancement doesn't change the dep
  // and accidentally re-trigger the effect (which resets orangeModal to false).

  it('shows orange modal after timeout in checkin step', async () => {
    vi.useFakeTimers();
    (useClientSession as any).mockReturnValue([
      { ...mockClient, called_at: { toMillis: () => 1000 } },
      'checkin',
      mockDerived,
      mockActions,
    ]);
    await act(async () => {
      render(<ClientApp />);
    });
    await act(async () => {
      vi.advanceTimersByTime(181_000);
    });
    expect(screen.getByText(/Vous êtes encore là/i)).toBeInTheDocument();
  });

  it('calls requestDelay from orange modal when delay not yet used', async () => {
    vi.useFakeTimers();
    (useClientSession as any).mockReturnValue([
      { ...mockClient, called_at: { toMillis: () => 1000 }, delay_used: false },
      'checkin',
      mockDerived,
      mockActions,
    ]);
    await act(async () => {
      render(<ClientApp />);
    });
    await act(async () => {
      vi.advanceTimersByTime(181_000);
    });
    fireEvent.click(screen.getAllByText(/Décaler/i)[0]);
    expect(mockActions.requestDelay).toHaveBeenCalled();
  });

  it('calls leave from orange modal when delay already used', async () => {
    vi.useFakeTimers();
    (useClientSession as any).mockReturnValue([
      { ...mockClient, called_at: { toMillis: () => 1000 }, delay_used: true },
      'checkin',
      mockDerived,
      mockActions,
    ]);
    await act(async () => {
      render(<ClientApp />);
    });
    await act(async () => {
      vi.advanceTimersByTime(181_000);
    });
    fireEvent.click(screen.getByRole('button', { name: /Quitter la file/i }));
    expect(mockActions.leave).toHaveBeenCalledWith('left_checkin');
  });

  // --- Service modal (validation timeout) ---
  // calcServicePromptMs(3) = 540_000ms, SERVICE_RESPONSE_MS = 120_000ms.
  // Same fixed-timestamp pattern to prevent dep drift.

  it('shows service modal after timeout in validation step', async () => {
    vi.useFakeTimers();
    (useClientSession as any).mockReturnValue([
      { ...mockClient, claimed_at: { toMillis: () => 1000 } },
      'validation',
      mockDerived,
      mockActions,
    ]);
    await act(async () => {
      render(<ClientApp />);
    });
    await act(async () => {
      vi.advanceTimersByTime(901_000);
    });
    expect(screen.getByText(/Toujours en cours/i)).toBeInTheDocument();
  });

  it('calls extend from service modal', async () => {
    vi.useFakeTimers();
    (useClientSession as any).mockReturnValue([
      { ...mockClient, claimed_at: { toMillis: () => 1000 } },
      'validation',
      mockDerived,
      mockActions,
    ]);
    await act(async () => {
      render(<ClientApp />);
    });
    await act(async () => {
      vi.advanceTimersByTime(901_000);
    });
    fireEvent.click(screen.getByText(/Prolonger/i));
    expect(mockActions.extend).toHaveBeenCalled();
  });

  // --- Rating modal (validation → done flow) ---

  it('shows ModalRating when done button clicked in validation', () => {
    (useClientSession as any).mockReturnValue([
      { ...mockClient, claimed_at: { toMillis: () => Date.now() } },
      'validation',
      mockDerived,
      mockActions,
    ]);
    render(<ClientApp />);
    fireEvent.click(screen.getByText(/C'est fait/i));
    expect(screen.getByText(/Votre avis compte/i)).toBeInTheDocument();
  });

  it('calls done with completed when skipping rating', () => {
    (useClientSession as any).mockReturnValue([
      { ...mockClient, claimed_at: { toMillis: () => Date.now() } },
      'validation',
      mockDerived,
      mockActions,
    ]);
    render(<ClientApp />);
    fireEvent.click(screen.getByText(/C'est fait/i));
    fireEvent.click(screen.getByText(/Passer sans noter/i));
    expect(mockActions.done).toHaveBeenCalledWith('completed');
  });

  it('calls leave from orange modal secondary when delay not yet used', async () => {
    vi.useFakeTimers();
    (useClientSession as any).mockReturnValue([
      { ...mockClient, called_at: { toMillis: () => 1000 }, delay_used: false },
      'checkin',
      mockDerived,
      mockActions,
    ]);
    await act(async () => {
      render(<ClientApp />);
    });
    await act(async () => {
      vi.advanceTimersByTime(181_000);
    });
    // delay_used=false: primary="Décaler…", secondary="Quitter la file" (leave button)
    fireEvent.click(screen.getByRole('button', { name: /Quitter la file/i }));
    expect(mockActions.leave).toHaveBeenCalledWith('left_checkin');
  });

  it("shows ModalRating when J'ai fini clicked in service modal", async () => {
    vi.useFakeTimers();
    (useClientSession as any).mockReturnValue([
      { ...mockClient, claimed_at: { toMillis: () => 1000 } },
      'validation',
      mockDerived,
      mockActions,
    ]);
    await act(async () => {
      render(<ClientApp />);
    });
    await act(async () => {
      vi.advanceTimersByTime(901_000);
    });
    fireEvent.click(screen.getByText(/J'ai fini, merci/));
    expect(screen.getByText(/Votre avis compte/i)).toBeInTheDocument();
  });

  it('calls done with rating and feedback when ModalRating submitted', () => {
    (useClientSession as any).mockReturnValue([
      { ...mockClient, claimed_at: { toMillis: () => Date.now() } },
      'validation',
      mockDerived,
      mockActions,
    ]);
    render(<ClientApp />);
    fireEvent.click(screen.getByText(/C'est fait/i));
    fireEvent.click(screen.getAllByText('★')[0]); // first star → rating=1
    fireEvent.click(screen.getByText('Envoyer mon avis'));
    expect(mockActions.done).toHaveBeenCalledWith('completed', { rating: 1, feedback: '' });
  });
});
