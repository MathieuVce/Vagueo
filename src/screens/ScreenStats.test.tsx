import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ScreenStats from './ScreenStats';
import { onSnapshot } from 'firebase/firestore';

function setupSnapshot() {
  let successCb: ((snap: any) => void) | undefined;
  let errorCb: ((err: Error) => void) | undefined;
  (onSnapshot as any).mockImplementation((_q: any, ok: any, err: any) => {
    successCb = ok;
    errorCb = err;
    return () => {};
  });
  return {
    fire: (docs: any[]) =>
      act(async () => {
        successCb?.({ docs });
      }),
    fail: (msg: string) =>
      act(async () => {
        errorCb?.(new Error(msg));
      }),
  };
}

const mockWin = {
  document: { write: vi.fn(), close: vi.fn() },
  focus: vi.fn(),
  print: vi.fn(),
  close: vi.fn(),
  onafterprint: null as any,
};

describe('ScreenStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    window.open = vi.fn(() => mockWin as any);
    Object.assign(mockWin.document, { write: vi.fn(), close: vi.fn() });
    mockWin.focus = vi.fn();
    mockWin.print = vi.fn();
  });

  // ─── Close ────────────────────────────────────────────────────

  it('calls onClose when × is clicked', () => {
    const onClose = vi.fn();
    render(<ScreenStats onClose={onClose} />);
    fireEvent.click(screen.getByText('×'));
    expect(onClose).toHaveBeenCalled();
  });

  // ─── Loading state ─────────────────────────────────────────────

  it('does not show stats content while loading', () => {
    render(<ScreenStats onClose={() => {}} />);
    expect(screen.queryByText(/Passages/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Aucun passage/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Erreur/i)).not.toBeInTheDocument();
  });

  it('does not show PDF/CSV buttons while loading', () => {
    render(<ScreenStats onClose={() => {}} />);
    expect(screen.queryByText(/PDF/)).not.toBeInTheDocument();
    expect(screen.queryByText(/CSV/)).not.toBeInTheDocument();
  });

  it('renders period tabs regardless of loading', () => {
    render(<ScreenStats onClose={() => {}} />);
    expect(screen.getByText("Aujourd'hui")).toBeInTheDocument();
    expect(screen.getByText('Semaine')).toBeInTheDocument();
    expect(screen.getByText('Mois')).toBeInTheDocument();
  });

  // ─── Error state ──────────────────────────────────────────────

  it('shows error message when Firestore query fails', async () => {
    const { fail } = setupSnapshot();
    render(<ScreenStats onClose={() => {}} />);
    await fail('Permission denied');
    expect(screen.getByText(/Erreur de chargement/i)).toBeInTheDocument();
    expect(screen.getByText(/Permission denied/)).toBeInTheDocument();
  });

  it('hides PDF/CSV buttons on error', async () => {
    const { fail } = setupSnapshot();
    render(<ScreenStats onClose={() => {}} />);
    await fail('Something failed');
    expect(screen.queryByText(/PDF/)).not.toBeInTheDocument();
    expect(screen.queryByText(/CSV/)).not.toBeInTheDocument();
  });

  // ─── Empty state ──────────────────────────────────────────────

  it('shows empty message when no events', async () => {
    const { fire } = setupSnapshot();
    render(<ScreenStats onClose={() => {}} />);
    await fire([]);
    expect(screen.getByText(/Aucun passage pour cette période/i)).toBeInTheDocument();
  });

  it('shows "Générer un rapport vide" button in empty state', async () => {
    const { fire } = setupSnapshot();
    render(<ScreenStats onClose={() => {}} />);
    await fire([]);
    expect(screen.getByText(/Générer un rapport vide/i)).toBeInTheDocument();
  });

  it('does not show PDF/CSV buttons in empty state', async () => {
    const { fire } = setupSnapshot();
    render(<ScreenStats onClose={() => {}} />);
    await fire([]);
    expect(screen.queryByText(/PDF/)).not.toBeInTheDocument();
    expect(screen.queryByText(/CSV/)).not.toBeInTheDocument();
  });

  // ─── Full stats ────────────────────────────────────────────────

  const mockDocs = [
    {
      id: '1',
      data: () => ({
        exit_reason: 'completed',
        wait_ms: 120000,
        service_ms: 60000,
        delay_used: false,
      }),
    },
    { id: '2', data: () => ({ exit_reason: 'left_waiting', delay_used: true }) },
  ];

  async function renderWithData() {
    const { fire } = setupSnapshot();
    render(<ScreenStats onClose={() => {}} />);
    await fire(mockDocs);
  }

  it('shows total passages count', async () => {
    await renderWithData();
    expect(screen.getAllByText(/Passages/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
  });

  it('shows served and absences stat cards', async () => {
    await renderWithData();
    expect(screen.getAllByText(/Servis/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Absences/i).length).toBeGreaterThan(0);
  });

  it('shows PDF and CSV buttons when stats available', async () => {
    await renderWithData();
    expect(screen.getByText(/CSV/)).toBeInTheDocument();
    expect(screen.getByText(/PDF/)).toBeInTheDocument();
  });

  it('shows served exit detail row', async () => {
    await renderWithData();
    expect(screen.getByText(/Servis \(passés au stand\)/)).toBeInTheDocument();
  });

  it('shows left-waiting exit detail row', async () => {
    await renderWithData();
    expect(screen.getByText(/Partis en attente/)).toBeInTheDocument();
  });

  it('hides zero-value exit rows', async () => {
    await renderWithData();
    expect(screen.queryByText(/Non-présents \(timeout\)/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Service écourté/)).not.toBeInTheDocument();
  });

  it('shows delay usage row when delayUsed > 0', async () => {
    await renderWithData();
    expect(screen.getByText(/Délais de 10 min/i)).toBeInTheDocument();
  });

  it('shows average wait time card', async () => {
    await renderWithData();
    expect(screen.getByText('~2')).toBeInTheDocument(); // 120000ms / 60000 = 2 min
  });

  it('shows average service time card', async () => {
    await renderWithData();
    expect(screen.getByText('~1')).toBeInTheDocument(); // 60000ms / 60000 = 1 min
  });

  it('shows exit detail section header', async () => {
    await renderWithData();
    expect(screen.getByText(/Détail des sorties/i)).toBeInTheDocument();
  });

  // ─── Period tabs ──────────────────────────────────────────────

  it('re-subscribes when period changes to Semaine', async () => {
    const { fire } = setupSnapshot();
    render(<ScreenStats onClose={() => {}} />);
    await fire([]);
    fireEvent.click(screen.getByText('Semaine'));
    expect(onSnapshot).toHaveBeenCalledTimes(2);
  });

  it('re-subscribes when period changes to Mois', async () => {
    const { fire } = setupSnapshot();
    render(<ScreenStats onClose={() => {}} />);
    await fire([]);
    fireEvent.click(screen.getByText('Mois'));
    expect(onSnapshot).toHaveBeenCalledTimes(2);
  });

  // ─── Print ────────────────────────────────────────────────────

  it('opens print window when PDF button clicked', async () => {
    await renderWithData();
    fireEvent.click(screen.getByText(/PDF/));
    expect(window.open).toHaveBeenCalledWith('', '_blank', expect.any(String));
    expect(mockWin.document.write).toHaveBeenCalled();
    expect(mockWin.focus).toHaveBeenCalled();
  });

  it('opens print window from empty state "Générer un rapport vide"', async () => {
    const { fire } = setupSnapshot();
    render(<ScreenStats onClose={() => {}} />);
    await fire([]);
    fireEvent.click(screen.getByText(/Générer un rapport vide/i));
    expect(window.open).toHaveBeenCalled();
    expect(mockWin.document.write).toHaveBeenCalled();
  });

  it('does not crash when window.open returns null', async () => {
    window.open = vi.fn(() => null as any);
    await renderWithData();
    expect(() => fireEvent.click(screen.getByText(/PDF/))).not.toThrow();
  });

  // ─── CSV export ────────────────────────────────────────────────

  it('triggers CSV download when CSV button clicked', async () => {
    await renderWithData();
    fireEvent.click(screen.getByText(/CSV/));
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  // ─── Hourly chart ─────────────────────────────────────────────

  it('shows hourly chart for today period when events have done_at.toDate', async () => {
    const { fire } = setupSnapshot();
    render(<ScreenStats onClose={() => {}} />);
    await fire([
      {
        id: '1',
        data: () => ({
          exit_reason: 'completed',
          done_at: { toDate: () => new Date(2024, 0, 1, 10, 0, 0), toMillis: () => 1000 },
        }),
      },
    ]);
    expect(screen.getByText(/Passages par heure/i)).toBeInTheDocument();
  });

  it('does not show hourly chart when events lack done_at.toDate', async () => {
    const { fire } = setupSnapshot();
    render(<ScreenStats onClose={() => {}} />);
    await fire([{ id: '1', data: () => ({ exit_reason: 'completed' }) }]);
    expect(screen.queryByText(/Passages par heure/i)).not.toBeInTheDocument();
  });
});
