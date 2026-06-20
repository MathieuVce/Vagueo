/**
 * VendorApp tests when no ?stand= param is present (STAND_ID = '').
 * In this context the app must guide the vendor through login then stand creation.
 */
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VendorApp from './VendorApp';
import * as useStandHook from '../hooks/useStand';
import * as useVendorAuthHook from '../hooks/useVendorAuth';
import * as useQueueCountsHook from '../hooks/useQueueCounts';
import * as useVendorStandLookupHook from '../hooks/useVendorStandLookup';

vi.mock('../tokens', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../tokens')>();
  return { ...actual, STAND_ID: '' };
});

vi.mock('../hooks/useStand');
vi.mock('../hooks/useVendorAuth');
vi.mock('../hooks/useQueueCounts');
vi.mock('../hooks/useVendorStandLookup');
vi.mock('../hooks/useDevHelpers', () => ({
  useDevHelpers: () => ({
    devAddClient: vi.fn(),
    devRemoveClient: vi.fn(),
    devClearQueue: vi.fn(),
    devResetStore: vi.fn(),
  }),
}));

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

vi.mock('../screens/ScreenVendorCreate', () => ({
  default: ({ user, onCreated }: any) => (
    <div data-testid="screen-vendor-create">
      <span data-testid="create-user-email">{user.email}</span>
      <button onClick={() => onCreated('s_newstandid123')}>Créer (mock)</button>
    </div>
  ),
}));

describe('VendorApp — sans STAND_ID', () => {
  const mockActions = {
    advance: vi.fn(),
    togglePause: vi.fn(),
    toggleOpen: vi.fn(),
    setFlowRate: vi.fn(),
    configure: vi.fn().mockResolvedValue({}),
    claimStand: vi.fn(),
  };

  const googleUser = { uid: 'v1', email: 'vendor@test.com', isAnonymous: false };

  const baseAuth: any = {
    user: googleUser,
    loading: false,
    isAuthorized: false,
    isOwner: false,
    isUnclaimed: false,
    signIn: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    error: null,
  };

  let locationReplace: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    (useStandHook.useStand as any).mockReturnValue([null, mockActions]);
    (useVendorAuthHook.useVendorAuth as any).mockReturnValue(baseAuth);
    (useQueueCountsHook.useQueueCounts as any).mockReturnValue({
      presentCount: 0,
      waitingCount: 0,
    });
    // Default: lookup done, no existing stand → show create form
    (useVendorStandLookupHook.useVendorStandLookup as any).mockReturnValue('none');

    locationReplace = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, replace: locationReplace },
      writable: true,
      configurable: true,
    });
  });

  // ─── États initiaux ───────────────────────────────────────────

  it('shows loading spinner when auth is loading', () => {
    (useVendorAuthHook.useVendorAuth as any).mockReturnValue({ ...baseAuth, loading: true });
    const { container } = render(<VendorApp />);
    expect(container.firstChild).toBeTruthy();
    expect(screen.queryByText(/Se connecter/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('screen-vendor-create')).not.toBeInTheDocument();
  });

  it('shows loading spinner while stand lookup is in progress', () => {
    (useVendorStandLookupHook.useVendorStandLookup as any).mockReturnValue('loading');
    const { container } = render(<VendorApp />);
    expect(container.firstChild).toBeTruthy();
    expect(screen.queryByTestId('screen-vendor-create')).not.toBeInTheDocument();
  });

  it('shows loading spinner while redirecting to existing stand', () => {
    (useVendorStandLookupHook.useVendorStandLookup as any).mockReturnValue('redirecting');
    const { container } = render(<VendorApp />);
    expect(container.firstChild).toBeTruthy();
    expect(screen.queryByTestId('screen-vendor-create')).not.toBeInTheDocument();
  });

  it('shows login screen when user is null', () => {
    (useVendorAuthHook.useVendorAuth as any).mockReturnValue({ ...baseAuth, user: null });
    render(<VendorApp />);
    expect(screen.getByText('Se connecter avec Google')).toBeInTheDocument();
    expect(screen.queryByTestId('screen-vendor-create')).not.toBeInTheDocument();
  });

  it('shows login screen when user is anonymous', () => {
    (useVendorAuthHook.useVendorAuth as any).mockReturnValue({
      ...baseAuth,
      user: { uid: 'anon', isAnonymous: true },
    });
    render(<VendorApp />);
    expect(screen.getByText('Se connecter avec Google')).toBeInTheDocument();
  });

  it('shows ScreenVendorCreate when authenticated Google user has no stand', () => {
    render(<VendorApp />);
    expect(screen.getByTestId('screen-vendor-create')).toBeInTheDocument();
    expect(screen.getByTestId('create-user-email')).toHaveTextContent('vendor@test.com');
  });

  it('does not show login screen when Google user is authenticated', () => {
    render(<VendorApp />);
    expect(screen.queryByText('Se connecter avec Google')).not.toBeInTheDocument();
  });

  // ─── Redirection après création ───────────────────────────────

  it('redirects to /vendor?stand=<id> when onCreated is called', () => {
    render(<VendorApp />);
    fireEvent.click(screen.getByText('Créer (mock)'));
    expect(locationReplace).toHaveBeenCalledWith('/vendor?stand=s_newstandid123');
  });

  // ─── Flux complet ─────────────────────────────────────────────

  it('chargement → login → connexion → ScreenVendorCreate → création → redirection', async () => {
    // Chargement
    (useVendorAuthHook.useVendorAuth as any).mockReturnValue({ ...baseAuth, loading: true });
    const { rerender } = render(<VendorApp />);
    expect(screen.queryByText(/Se connecter/i)).not.toBeInTheDocument();

    // Page de login
    const signIn = vi.fn().mockResolvedValue(undefined);
    (useVendorAuthHook.useVendorAuth as any).mockReturnValue({
      ...baseAuth,
      user: null,
      loading: false,
      signIn,
    });
    rerender(<VendorApp />);
    expect(screen.getByText('Se connecter avec Google')).toBeInTheDocument();

    // Connexion
    await act(async () => {
      fireEvent.click(screen.getByText('Se connecter avec Google'));
    });
    expect(signIn).toHaveBeenCalled();

    // Après connexion : ScreenVendorCreate
    (useVendorAuthHook.useVendorAuth as any).mockReturnValue(baseAuth);
    rerender(<VendorApp />);
    expect(screen.getByTestId('screen-vendor-create')).toBeInTheDocument();

    // Création → redirection
    fireEvent.click(screen.getByText('Créer (mock)'));
    expect(locationReplace).toHaveBeenCalledWith('/vendor?stand=s_newstandid123');
  });
});
