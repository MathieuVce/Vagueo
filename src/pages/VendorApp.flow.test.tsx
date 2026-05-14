import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VendorApp from './VendorApp';
import * as useStandHook from '../hooks/useStand';
import * as useVendorAuthHook from '../hooks/useVendorAuth';
import * as useQueueCountsHook from '../hooks/useQueueCounts';

vi.mock('../hooks/useStand');
vi.mock('../hooks/useVendorAuth');
vi.mock('../hooks/useQueueCounts');
vi.mock('../hooks/useDevHelpers', () => ({
  useDevHelpers: () => ({
    devAddClient: vi.fn(), devRemoveClient: vi.fn(),
    devClearQueue: vi.fn(), devResetStore: vi.fn(),
  }),
}));
// ScreenStats appelle Firebase directement — on l'isole
vi.mock('../screens/ScreenStats', () => ({
  default: ({ onClose }: any) => (
    <div data-testid="screen-stats"><button onClick={onClose}>Fermer Stats</button></div>
  ),
}));

describe('VendorApp — flux utilisateur', () => {
  const baseStand: any = {
    id: 'stand-1', name: 'Mon Stand', vendor_uid: 'v1',
    is_open: true, is_paused: false, min_per_person: 3,
    flow_rate: 3, flow_slow: 5, flow_sprint: 1,
    max_queue_size: null, max_delayed: null,
  };
  const baseActions = {
    advance: vi.fn(), togglePause: vi.fn(), toggleOpen: vi.fn(),
    setFlowRate: vi.fn(), configure: vi.fn().mockResolvedValue({}), claimStand: vi.fn(),
  };
  const baseAuth = {
    user: { uid: 'v1', email: 'vendor@test.com', isAnonymous: false },
    loading: false, isAuthorized: true, isOwner: true, isUnclaimed: false,
    signIn: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    error: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useStandHook.useStand as any).mockReturnValue([baseStand, baseActions]);
    (useVendorAuthHook.useVendorAuth as any).mockReturnValue(baseAuth);
    (useQueueCountsHook.useQueueCounts as any).mockReturnValue({ presentCount: 2, waitingCount: 5 });
  });

  // ─── Parcours connexion ───────────────────────────────────────

  it('chargement → login → clic connexion → tableau de bord', async () => {
    // Chargement
    (useVendorAuthHook.useVendorAuth as any).mockReturnValue({ ...baseAuth, loading: true });
    const { rerender } = render(<VendorApp />);
    expect(screen.queryByText(/Se connecter/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/En service/i)).not.toBeInTheDocument();

    // Login
    const signIn = vi.fn().mockResolvedValue(undefined);
    (useVendorAuthHook.useVendorAuth as any).mockReturnValue({
      ...baseAuth, user: null, loading: false, signIn,
    });
    rerender(<VendorApp />);
    expect(screen.getByText('Se connecter avec Google')).toBeInTheDocument();

    await act(async () => { fireEvent.click(screen.getByText('Se connecter avec Google')); });
    expect(signIn).toHaveBeenCalled();

    // Tableau de bord
    (useVendorAuthHook.useVendorAuth as any).mockReturnValue(baseAuth);
    rerender(<VendorApp />);
    expect(screen.getByText('Mon Stand')).toBeInTheDocument();
    expect(screen.getByText('En service')).toBeInTheDocument();
  });

  // ─── Parcours pause et reprise ────────────────────────────────

  it('tableau de bord → mettre en pause → reprendre', () => {
    const { rerender } = render(<VendorApp />);

    // Dashboard actif
    expect(screen.getByText('En service')).toBeInTheDocument();
    expect(screen.getByText(/Mettre en pause/i)).toBeInTheDocument();

    // Mise en pause
    fireEvent.click(screen.getByText(/Mettre en pause/i));
    expect(baseActions.togglePause).toHaveBeenCalled();

    // Simulate the hook reflecting the new state
    (useStandHook.useStand as any).mockReturnValue([
      { ...baseStand, is_paused: true }, baseActions,
    ]);
    rerender(<VendorApp />);
    expect(screen.getByText('En pause')).toBeInTheDocument();
    expect(screen.getByText(/Reprendre/i)).toBeInTheDocument();

    // Reprise
    fireEvent.click(screen.getByText(/Reprendre/i));
    expect(baseActions.togglePause).toHaveBeenCalledTimes(2);
  });

  // ─── Parcours fermer/ouvrir la file ───────────────────────────

  it('tableau de bord → fermer la file → ouvrir la file', () => {
    const { rerender } = render(<VendorApp />);

    fireEvent.click(screen.getByText(/Fermer la file/i));
    expect(baseActions.toggleOpen).toHaveBeenCalled();

    (useStandHook.useStand as any).mockReturnValue([
      { ...baseStand, is_open: false }, baseActions,
    ]);
    rerender(<VendorApp />);
    expect(screen.getByText(/Ouvrir la file/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Ouvrir la file/i));
    expect(baseActions.toggleOpen).toHaveBeenCalledTimes(2);
  });

  // ─── Settings flow ────────────────────────────────────────────

  it('tableau de bord → ouvrir paramètres → annuler → retour tableau de bord', () => {
    render(<VendorApp />);

    // Open settings
    fireEvent.click(screen.getByTitle('Paramètres du stand'));
    expect(screen.getByText(/Sauvegarder/i)).toBeInTheDocument();

    // Annuler → ferme l'overlay
    fireEvent.click(screen.getByText('Annuler'));
    expect(screen.queryByText(/Sauvegarder/i)).not.toBeInTheDocument();
    expect(screen.getByText('En service')).toBeInTheDocument();
  });

  // ─── Parcours QR code ─────────────────────────────────────────

  it('tableau de bord → ouvrir QR → fermer → retour tableau de bord', () => {
    render(<VendorApp />);

    fireEvent.click(screen.getByTitle('QR Code'));
    expect(screen.getByRole('button', { name: '×' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '×' }));
    expect(screen.queryByRole('button', { name: '×' })).not.toBeInTheDocument();
    expect(screen.getByText('En service')).toBeInTheDocument();
  });

  // ─── Parcours stats ───────────────────────────────────────────

  it('tableau de bord → ouvrir stats → fermer → retour tableau de bord', () => {
    render(<VendorApp />);

    fireEvent.click(screen.getByTitle('Statistiques'));
    expect(screen.getByTestId('screen-stats')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Fermer Stats'));
    expect(screen.queryByTestId('screen-stats')).not.toBeInTheDocument();
    expect(screen.getByText('En service')).toBeInTheDocument();
  });

  // ─── Parcours setup initial (nouveau stand) ───────────────────

  it('stand sans nom → setup auto-ouvert → sauvegarder → tableau de bord', async () => {
    (useStandHook.useStand as any).mockReturnValue([{ ...baseStand, name: '' }, baseActions]);
    const { rerender } = render(<VendorApp />);

    // Setup s'ouvre automatiquement
    expect(screen.getByText(/Créer mon stand/i)).toBeInTheDocument();

    // Remplir le nom et sauvegarder
    fireEvent.change(screen.getByPlaceholderText(/Churros Mathieu/i), {
      target: { value: 'Mon Nouveau Stand' },
    });
    await act(async () => { fireEvent.click(screen.getByText(/Créer mon stand/i)); });
    expect(baseActions.configure).toHaveBeenCalled();

    // Simulate the updated stand → setup closes, dashboard visible
    (useStandHook.useStand as any).mockReturnValue([
      { ...baseStand, name: 'Mon Nouveau Stand' }, baseActions,
    ]);
    rerender(<VendorApp />);
    expect(screen.queryByText(/Créer mon stand/i)).not.toBeInTheDocument();
    expect(screen.getByText('Mon Nouveau Stand')).toBeInTheDocument();
  });

  // ─── Sign-out flow ────────────────────────────────────────────

  it('tableau de bord → déconnexion', () => {
    const signOut = vi.fn();
    (useVendorAuthHook.useVendorAuth as any).mockReturnValue({ ...baseAuth, signOut });
    render(<VendorApp />);

    fireEvent.click(screen.getByRole('button', { name: /Déconnexion/i }));
    expect(signOut).toHaveBeenCalled();
  });
});
