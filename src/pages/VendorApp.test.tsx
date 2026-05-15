import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VendorApp from './VendorApp';
import * as useStandHook from '../hooks/useStand';
import * as useVendorAuthHook from '../hooks/useVendorAuth';
import * as useQueueCountsHook from '../hooks/useQueueCounts';

vi.mock('../hooks/useStand');
vi.mock('../hooks/useVendorAuth');
vi.mock('../hooks/useQueueCounts');
vi.mock('../hooks/useVendorStandLookup', () => ({
  useVendorStandLookup: () => 'none',
}));
vi.mock('../hooks/useDevHelpers', () => ({
  useDevHelpers: () => ({
    devAddClient: vi.fn(), devRemoveClient: vi.fn(),
    devClearQueue: vi.fn(), devResetStore: vi.fn(),
  }),
}));

// Lightweight screen mocks so overlays are testable without complex child deps
vi.mock('../screens/ScreenVendorLogin', () => ({
  default: ({ onSignIn, error, loading }: any) => (
    <div>
      <button onClick={onSignIn} disabled={loading}>
        {loading ? 'Connexion…' : 'Se connecter avec Google'}
      </button>
      {error && <div role="alert">{error}</div>}
    </div>
  ),
}));

vi.mock('../screens/ScreenVendor', () => ({
  default: ({ stand, onOpenStats, onOpenQR, onOpenSettings, onSignOut }: any) => (
    <div>
      <span>{stand.name || '(no name)'}</span>
      <span>En service</span>
      <button onClick={onOpenStats} title="Statistiques">Stats</button>
      <button onClick={onOpenQR} title="QR Code">QR</button>
      <button onClick={onOpenSettings} title="Paramètres du stand">Paramètres</button>
      <button onClick={onSignOut}>Déconnexion</button>
    </div>
  ),
}));

vi.mock('../screens/ScreenVendorSetup', () => ({
  default: ({ onSave }: any) => (
    <div data-testid="screen-setup">
      <button onClick={() => onSave(null)}>Fermer Setup</button>
    </div>
  ),
}));

vi.mock('../screens/ScreenStats', () => ({
  default: ({ onClose }: any) => (
    <div data-testid="screen-stats">
      <button onClick={onClose}>Fermer Stats</button>
    </div>
  ),
}));

vi.mock('../screens/ScreenQRCode', () => ({
  default: ({ onClose }: any) => (
    <div data-testid="screen-qr">
      <button onClick={onClose}>Fermer QR</button>
    </div>
  ),
}));

describe('VendorApp', () => {
  const mockStand: any = {
    id: 'stand-1', name: 'Mon Stand', vendor_uid: 'v1',
    is_open: true, is_paused: false, min_per_person: 3,
  };

  const mockActions = {
    advance: vi.fn(), togglePause: vi.fn(), toggleOpen: vi.fn(),
    setFlowRate: vi.fn(), configure: vi.fn().mockResolvedValue({}), claimStand: vi.fn(),
  };

  const mockAuth: any = {
    user: { uid: 'v1', email: 'vendor@test.com', isAnonymous: false },
    loading: false, isAuthorized: true, isOwner: true, isUnclaimed: false,
    signIn: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    error: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useStandHook.useStand as any).mockReturnValue([mockStand, mockActions]);
    (useVendorAuthHook.useVendorAuth as any).mockReturnValue(mockAuth);
    (useQueueCountsHook.useQueueCounts as any).mockReturnValue({ presentCount: 2, waitingCount: 5 });
  });

  // ─── Loading ──────────────────────────────────────────────────

  it('shows loading state when auth is loading', () => {
    (useVendorAuthHook.useVendorAuth as any).mockReturnValue({ ...mockAuth, loading: true });
    const { container } = render(<VendorApp />);
    expect(container.firstChild).toBeTruthy();
    expect(screen.queryByText(/Se connecter/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/En service/i)).not.toBeInTheDocument();
  });

  it('shows loading state when stand is null', () => {
    (useStandHook.useStand as any).mockReturnValue([null, mockActions]);
    const { container } = render(<VendorApp />);
    expect(container.firstChild).toBeTruthy();
    expect(screen.queryByText(/Se connecter/i)).not.toBeInTheDocument();
  });

  // ─── Login screen ─────────────────────────────────────────────

  it('shows login screen when user is null', () => {
    (useVendorAuthHook.useVendorAuth as any).mockReturnValue({ ...mockAuth, user: null });
    render(<VendorApp />);
    expect(screen.getByText('Se connecter avec Google')).toBeInTheDocument();
  });

  it('shows login screen for anonymous user', () => {
    (useVendorAuthHook.useVendorAuth as any).mockReturnValue({
      ...mockAuth,
      user: { uid: 'anon', isAnonymous: true },
    });
    render(<VendorApp />);
    expect(screen.getByText('Se connecter avec Google')).toBeInTheDocument();
  });

  it('calls signIn when login button clicked', async () => {
    const signIn = vi.fn().mockResolvedValue(undefined);
    (useVendorAuthHook.useVendorAuth as any).mockReturnValue({ ...mockAuth, user: null, signIn });
    render(<VendorApp />);
    await act(async () => { fireEvent.click(screen.getByText('Se connecter avec Google')); });
    expect(signIn).toHaveBeenCalled();
  });

  it('shows "Connexion…" while sign-in is in progress', async () => {
    let resolveSignIn!: () => void;
    const signIn = vi.fn(() => new Promise<void>(r => { resolveSignIn = r; }));
    (useVendorAuthHook.useVendorAuth as any).mockReturnValue({ ...mockAuth, user: null, signIn });
    render(<VendorApp />);
    fireEvent.click(screen.getByText('Se connecter avec Google'));
    expect(screen.getByText('Connexion…')).toBeInTheDocument();
    await act(async () => { resolveSignIn(); });
  });

  it('shows auth error in login screen', () => {
    (useVendorAuthHook.useVendorAuth as any).mockReturnValue({
      ...mockAuth, user: null, error: 'Connexion refusée',
    });
    render(<VendorApp />);
    expect(screen.getByRole('alert')).toHaveTextContent('Connexion refusée');
  });

  // ─── Access denied ────────────────────────────────────────────

  it('shows access denied when not authorized', () => {
    (useVendorAuthHook.useVendorAuth as any).mockReturnValue({
      ...mockAuth,
      isAuthorized: false,
      user: { uid: 'other', email: 'other@example.com', isAnonymous: false },
    });
    render(<VendorApp />);
    expect(screen.getByText(/Accès refusé/i)).toBeInTheDocument();
    expect(screen.getByText('other@example.com')).toBeInTheDocument();
  });

  it('calls signOut from access denied screen', () => {
    const signOut = vi.fn();
    (useVendorAuthHook.useVendorAuth as any).mockReturnValue({
      ...mockAuth, isAuthorized: false,
      user: { uid: 'other', email: 'other@test.com', isAnonymous: false },
      signOut,
    });
    render(<VendorApp />);
    fireEvent.click(screen.getByText(/Changer de compte/i));
    expect(signOut).toHaveBeenCalled();
  });

  // ─── Authorized dashboard ─────────────────────────────────────

  it('renders authorized dashboard with stand name', () => {
    render(<VendorApp />);
    expect(screen.getByText('Mon Stand')).toBeInTheDocument();
    expect(screen.getByText('En service')).toBeInTheDocument();
  });

  it('calls signOut from vendor dashboard', () => {
    const signOut = vi.fn();
    (useVendorAuthHook.useVendorAuth as any).mockReturnValue({ ...mockAuth, signOut });
    render(<VendorApp />);
    fireEvent.click(screen.getByText('Déconnexion'));
    expect(signOut).toHaveBeenCalled();
  });

  // ─── Auto-show setup (no name) ────────────────────────────────

  it('auto-shows ScreenVendorSetup when stand has no name', () => {
    (useStandHook.useStand as any).mockReturnValue([{ ...mockStand, name: '' }, mockActions]);
    render(<VendorApp />);
    expect(screen.getByTestId('screen-setup')).toBeInTheDocument();
  });

  // ─── Claim stand ──────────────────────────────────────────────

  it('calls claimStand when user logs in to unclaimed stand', () => {
    const claimStand = vi.fn();
    (useStandHook.useStand as any).mockReturnValue([mockStand, { ...mockActions, claimStand }]);
    (useVendorAuthHook.useVendorAuth as any).mockReturnValue({ ...mockAuth, isUnclaimed: true });
    render(<VendorApp />);
    expect(claimStand).toHaveBeenCalledWith('v1', 'vendor@test.com');
  });

  // ─── Pending approval ────────────────────────────────────────

  it('shows pending approval screen when stand status is pending_approval', () => {
    (useStandHook.useStand as any).mockReturnValue([{ ...mockStand, status: 'pending_approval' }, mockActions]);
    render(<VendorApp />);
    expect(screen.getByText(/En attente d'approbation/i)).toBeInTheDocument();
  });

  it('allows sign out from pending approval screen', () => {
    const signOut = vi.fn();
    (useStandHook.useStand as any).mockReturnValue([{ ...mockStand, status: 'pending_approval' }, mockActions]);
    (useVendorAuthHook.useVendorAuth as any).mockReturnValue({ ...mockAuth, signOut });
    render(<VendorApp />);
    fireEvent.click(screen.getByText(/Se déconnecter/i));
    expect(signOut).toHaveBeenCalled();
  });

  // ─── Overlays ─────────────────────────────────────────────────

  it('shows ScreenStats when stats button clicked', () => {
    render(<VendorApp />);
    fireEvent.click(screen.getByTitle('Statistiques'));
    expect(screen.getByTestId('screen-stats')).toBeInTheDocument();
  });

  it('hides ScreenStats when closed', () => {
    render(<VendorApp />);
    fireEvent.click(screen.getByTitle('Statistiques'));
    fireEvent.click(screen.getByText('Fermer Stats'));
    expect(screen.queryByTestId('screen-stats')).not.toBeInTheDocument();
  });

  it('shows ScreenQRCode when QR button clicked', () => {
    render(<VendorApp />);
    fireEvent.click(screen.getByTitle('QR Code'));
    expect(screen.getByTestId('screen-qr')).toBeInTheDocument();
  });

  it('hides ScreenQRCode when closed', () => {
    render(<VendorApp />);
    fireEvent.click(screen.getByTitle('QR Code'));
    fireEvent.click(screen.getByText('Fermer QR'));
    expect(screen.queryByTestId('screen-qr')).not.toBeInTheDocument();
  });

  it('shows ScreenVendorSetup when settings button clicked', () => {
    render(<VendorApp />);
    fireEvent.click(screen.getByTitle('Paramètres du stand'));
    expect(screen.getByTestId('screen-setup')).toBeInTheDocument();
  });

  it('hides ScreenVendorSetup when onSave(null) called', () => {
    render(<VendorApp />);
    fireEvent.click(screen.getByTitle('Paramètres du stand'));
    fireEvent.click(screen.getByText('Fermer Setup'));
    expect(screen.queryByTestId('screen-setup')).not.toBeInTheDocument();
  });
});
