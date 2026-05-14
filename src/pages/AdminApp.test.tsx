import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminApp from './AdminApp';
import * as useVendorAuthHook from '../hooks/useVendorAuth';
import { onSnapshot, updateDoc, deleteDoc } from 'firebase/firestore';

vi.mock('../hooks/useVendorAuth');
vi.mock('qrcode.react', () => ({ QRCodeSVG: () => <svg data-testid="qrcode" /> }));

// Shared stand fixture
const stand1 = { id: 's1', data: () => ({ name: 'Stand Alpha', is_open: true, is_paused: false, queue_counter: 3, flow_rate: 3 }) };
const stand2 = { id: 's2', data: () => ({ name: 'Stand Beta',  is_open: false, is_paused: false, queue_counter: 0, flow_rate: 3 }) };
const claimedStand = { id: 'sc', data: () => ({ name: 'Stand Revendiqué', vendor_uid: 'uid123', vendor_email: 'v@test.com', is_open: false, is_paused: false, queue_counter: 0, flow_rate: 3 }) };

function mockSnapshotWith(docs: any[]) {
  (onSnapshot as any).mockImplementation((_ref: any, cb: any) => {
    cb({ docs, size: docs.length });
    return () => {};
  });
}

describe('AdminApp', () => {
  const mockAuth: any = {
    user: { uid: 'a1', email: 'admin@vagueo.com', isAnonymous: false },
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    error: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useVendorAuthHook.useVendorAuth as any).mockReturnValue(mockAuth);
    vi.stubEnv('VITE_ADMIN_EMAIL', 'admin@vagueo.com');
    mockSnapshotWith([]);
  });

  // ─── Auth states ───────────────────────────────────────────────

  it('shows loading spinner when auth is loading', () => {
    (useVendorAuthHook.useVendorAuth as any).mockReturnValue({ ...mockAuth, loading: true, user: null });
    const { container } = render(<AdminApp />);
    expect(container.firstChild).toBeTruthy();
    expect(screen.queryByText(/Stands/i)).not.toBeInTheDocument();
  });

  it('shows AdminLogin when user is null', () => {
    (useVendorAuthHook.useVendorAuth as any).mockReturnValue({ ...mockAuth, user: null });
    render(<AdminApp />);
    expect(screen.getByText(/Connexion avec Google/i)).toBeInTheDocument();
  });

  it('shows AdminLogin for anonymous user', () => {
    (useVendorAuthHook.useVendorAuth as any).mockReturnValue({ ...mockAuth, user: { isAnonymous: true } });
    render(<AdminApp />);
    expect(screen.getByText(/Connexion avec Google/i)).toBeInTheDocument();
  });

  it('calls signIn when Google button clicked in AdminLogin', () => {
    (useVendorAuthHook.useVendorAuth as any).mockReturnValue({ ...mockAuth, user: null });
    render(<AdminApp />);
    fireEvent.click(screen.getByText(/Connexion avec Google/i));
    expect(mockAuth.signIn).toHaveBeenCalled();
  });

  it('shows error message in AdminLogin', () => {
    (useVendorAuthHook.useVendorAuth as any).mockReturnValue({ ...mockAuth, user: null, error: 'Connexion refusée.' });
    render(<AdminApp />);
    expect(screen.getByText(/Connexion refusée/i)).toBeInTheDocument();
  });

  it('shows access denied when email does not match VITE_ADMIN_EMAIL', () => {
    (useVendorAuthHook.useVendorAuth as any).mockReturnValue({
      ...mockAuth, user: { uid: 'x', email: 'other@example.com', isAnonymous: false },
    });
    render(<AdminApp />);
    expect(screen.getByText(/Accès refusé/i)).toBeInTheDocument();
  });

  it('calls signOut from access denied screen', () => {
    (useVendorAuthHook.useVendorAuth as any).mockReturnValue({
      ...mockAuth, user: { uid: 'x', email: 'other@example.com', isAnonymous: false },
    });
    render(<AdminApp />);
    fireEvent.click(screen.getByText(/Se déconnecter/i));
    expect(mockAuth.signOut).toHaveBeenCalled();
  });

  it('calls signOut from the dashboard header', () => {
    render(<AdminApp />);
    fireEvent.click(screen.getByText(/Déconnexion/i));
    expect(mockAuth.signOut).toHaveBeenCalled();
  });

  // ─── Stand list ────────────────────────────────────────────────

  it('shows "Aucun stand créé" when stand list is empty', () => {
    render(<AdminApp />);
    expect(screen.getByText(/Aucun stand créé/i)).toBeInTheDocument();
  });

  it('renders stand list', async () => {
    let callback: any;
    (onSnapshot as any).mockImplementation((_ref: any, cb: any) => { callback = cb; return () => {}; });
    render(<AdminApp />);
    await act(async () => { callback({ docs: [stand1, stand2] }); });
    expect(screen.getByText('Stand Alpha')).toBeInTheDocument();
    expect(screen.getByText('Stand Beta')).toBeInTheDocument();
  });

  it('shows search box when more than 3 stands', async () => {
    const manyStands = [1, 2, 3, 4].map(i => ({
      id: `s${i}`, data: () => ({ name: `Stand ${i}`, is_open: false, is_paused: false, flow_rate: 3 }),
    }));
    let callback: any;
    (onSnapshot as any).mockImplementation((_ref: any, cb: any) => { callback = cb; return () => {}; });
    render(<AdminApp />);
    await act(async () => { callback({ docs: manyStands }); });
    expect(screen.getByPlaceholderText(/Rechercher/i)).toBeInTheDocument();
  });

  it('filters stands by search query', async () => {
    const manyStands = [1, 2, 3, 4].map(i => ({
      id: `s${i}`, data: () => ({ name: `Stand ${i}`, is_open: false, is_paused: false, flow_rate: 3 }),
    }));
    let callback: any;
    (onSnapshot as any).mockImplementation((_ref: any, cb: any) => { callback = cb; return () => {}; });
    render(<AdminApp />);
    await act(async () => { callback({ docs: manyStands }); });
    fireEvent.change(screen.getByPlaceholderText(/Rechercher/i), { target: { value: 'Stand 2' } });
    expect(screen.getByText('Stand 2')).toBeInTheDocument();
    expect(screen.queryByText('Stand 1')).not.toBeInTheDocument();
  });

  it('shows "Aucun résultat" when search has no match', async () => {
    const manyStands = [1, 2, 3, 4].map(i => ({
      id: `s${i}`, data: () => ({ name: `Stand ${i}`, is_open: false, is_paused: false, flow_rate: 3 }),
    }));
    let callback: any;
    (onSnapshot as any).mockImplementation((_ref: any, cb: any) => { callback = cb; return () => {}; });
    render(<AdminApp />);
    await act(async () => { callback({ docs: manyStands }); });
    fireEvent.change(screen.getByPlaceholderText(/Rechercher/i), { target: { value: 'zzznomatch' } });
    expect(screen.getByText(/Aucun résultat/i)).toBeInTheDocument();
  });

  // ─── Create stand modal ────────────────────────────────────────

  it('opens create stand modal', () => {
    render(<AdminApp />);
    fireEvent.click(screen.getByRole('button', { name: /\+ Nouveau stand/i }));
    expect(screen.getByPlaceholderText(/Churros Mathieu/i)).toBeInTheDocument();
  });

  it('create button is disabled without a name', () => {
    render(<AdminApp />);
    fireEvent.click(screen.getByRole('button', { name: /\+ Nouveau stand/i }));
    expect(screen.getByRole('button', { name: /Créer le stand/i })).toBeDisabled();
  });

  it('create button is enabled after typing a name', () => {
    render(<AdminApp />);
    fireEvent.click(screen.getByRole('button', { name: /\+ Nouveau stand/i }));
    fireEvent.change(screen.getByPlaceholderText(/Churros Mathieu/i), { target: { value: 'Mon Stand' } });
    expect(screen.getByRole('button', { name: /Créer le stand/i })).not.toBeDisabled();
  });

  it('calls addDoc and shows toast after creating stand', async () => {
    render(<AdminApp />);
    fireEvent.click(screen.getByRole('button', { name: /\+ Nouveau stand/i }));
    fireEvent.change(screen.getByPlaceholderText(/Churros Mathieu/i), { target: { value: 'Nouveau' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Créer le stand/i })); });
    expect(screen.getByText('mock-id')).toBeInTheDocument();
  });

  it('dismisses new stand toast', async () => {
    render(<AdminApp />);
    fireEvent.click(screen.getByRole('button', { name: /\+ Nouveau stand/i }));
    fireEvent.change(screen.getByPlaceholderText(/Churros Mathieu/i), { target: { value: 'Nouveau' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Créer le stand/i })); });
    fireEvent.click(screen.getByRole('button', { name: '×' }));
    expect(screen.queryByText('mock-id')).not.toBeInTheDocument();
  });

  it('closes create modal on Annuler', () => {
    render(<AdminApp />);
    fireEvent.click(screen.getByRole('button', { name: /\+ Nouveau stand/i }));
    fireEvent.click(screen.getByRole('button', { name: /Annuler/i }));
    expect(screen.queryByPlaceholderText(/Churros Mathieu/i)).not.toBeInTheDocument();
  });

  // ─── Stand editor ──────────────────────────────────────────────

  async function renderWithStand(standDoc = stand1) {
    let callback: any;
    (onSnapshot as any).mockImplementation((_ref: any, cb: any) => { callback = cb; return () => {}; });
    render(<AdminApp />);
    await act(async () => { callback({ docs: [standDoc] }); });
    fireEvent.click(screen.getByRole('button', { name: /Modifier/i }));
  }

  it('opens StandEditor when clicking Modifier', async () => {
    await renderWithStand();
    expect(screen.getByText(/Modifier le stand/i)).toBeInTheDocument();
    expect(screen.getByTestId('qrcode')).toBeInTheDocument();
  });

  it('closes StandEditor on Annuler', async () => {
    await renderWithStand();
    fireEvent.click(screen.getAllByRole('button', { name: /Annuler/i })[0]);
    expect(screen.queryByText(/Modifier le stand/i)).not.toBeInTheDocument();
  });

  it('calls updateDoc when saving from StandEditor', async () => {
    await renderWithStand();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Sauvegarder/i })); });
    expect(updateDoc).toHaveBeenCalled();
  });

  it('shows delete confirm then calls deleteDoc', async () => {
    await renderWithStand();
    fireEvent.click(screen.getByText(/Supprimer ce stand/i));
    expect(screen.getByText(/Confirmer la suppression/i)).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^Supprimer$/i })); });
    expect(deleteDoc).toHaveBeenCalled();
  });

  it('cancels delete on Non', async () => {
    await renderWithStand();
    fireEvent.click(screen.getByText(/Supprimer ce stand/i));
    fireEvent.click(screen.getAllByRole('button', { name: /Non/i })[0]);
    expect(screen.queryByText(/Confirmer la suppression/i)).not.toBeInTheDocument();
  });

  it('shows unlink confirm for claimed stand then calls updateDoc', async () => {
    await renderWithStand(claimedStand);
    fireEvent.click(screen.getByText('Délier'));
    expect(screen.getByRole('button', { name: /Confirmer/i })).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Confirmer/i })); });
    expect(updateDoc).toHaveBeenCalled();
  });

  it('cancels unlink on Non', async () => {
    await renderWithStand(claimedStand);
    fireEvent.click(screen.getByText('Délier'));
    fireEvent.click(screen.getByRole('button', { name: /Non/i }));
    expect(screen.queryByRole('button', { name: /Confirmer/i })).not.toBeInTheDocument();
  });

  it('shows vendor email field for unclaimed stand', async () => {
    await renderWithStand(stand1);
    expect(screen.getByLabelText(/Email Google du vendeur/i)).toBeInTheDocument();
  });

  it('shows claimed vendor info for claimed stand', async () => {
    await renderWithStand(claimedStand);
    expect(screen.getByText('v@test.com')).toBeInTheDocument();
    expect(screen.getByText('Délier')).toBeInTheDocument();
  });

  it('shows live queue count pills in StandEditor', async () => {
    let callCount = 0;
    (onSnapshot as any).mockImplementation((_ref: any, cb: any) => {
      callCount++;
      cb(callCount === 1
        ? { docs: [stand1], size: 1 } // stands list
        : { docs: [], size: 3 },      // queue: 3 people
      );
      return () => {};
    });
    render(<AdminApp />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Modifier/i })); });
    expect(screen.getByText(/en file/i)).toBeInTheDocument();
  });

  it('shows limitQueue NumberField after clicking Limitée in StandEditor', async () => {
    await renderWithStand();
    const limitedBtns = screen.getAllByText('Limitée');
    fireEvent.click(limitedBtns[0]);
    expect(screen.getAllByText(/personnes max/i).length).toBeGreaterThan(0);
  });

  it('shows limitDelay NumberField after clicking Limité in StandEditor', async () => {
    await renderWithStand();
    const limitedBtns = screen.getAllByText('Limité');
    fireEvent.click(limitedBtns[0]);
    expect(screen.getAllByText(/délais max/i).length).toBeGreaterThan(0);
  });

  it('copies client link to clipboard', async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    await renderWithStand();
    await act(async () => { fireEvent.click(screen.getByText(/Copier lien client/i)); });
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  it('shows toast when save throws an error', async () => {
    (updateDoc as any).mockRejectedValueOnce(new Error('Network error'));
    await renderWithStand();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Sauvegarder/i })); });
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  // ─── StandCard extras ──────────────────────────────────────────

  it('shows address on StandCard when present', async () => {
    const standWithAddr = { id: 'sa', data: () => ({ name: 'Stand A', is_open: false, is_paused: false, flow_rate: 3, address: 'Stand B12' }) };
    let callback: any;
    (onSnapshot as any).mockImplementation((_ref: any, cb: any) => { callback = cb; return () => {}; });
    render(<AdminApp />);
    await act(async () => { callback({ docs: [standWithAddr] }); });
    expect(screen.getByText(/Stand B12/)).toBeInTheDocument();
  });

  it('shows max queue badge on StandCard when max_queue_size is set', async () => {
    const standWithMax = { id: 'sm', data: () => ({ name: 'Stand M', is_open: false, is_paused: false, flow_rate: 3, max_queue_size: 25 }) };
    let callback: any;
    (onSnapshot as any).mockImplementation((_ref: any, cb: any) => { callback = cb; return () => {}; });
    render(<AdminApp />);
    await act(async () => { callback({ docs: [standWithMax] }); });
    expect(screen.getByText('max 25')).toBeInTheDocument();
  });

  // ─── CreateStandModal capacity toggles ────────────────────────

  it('shows personnes max NumberField after clicking Limitée in CreateStandModal', () => {
    render(<AdminApp />);
    fireEvent.click(screen.getByRole('button', { name: /\+ Nouveau stand/i }));
    const limitedBtns = screen.getAllByText('Limitée');
    fireEvent.click(limitedBtns[0]);
    expect(screen.getAllByText(/personnes max/i).length).toBeGreaterThan(0);
  });

  it('shows délais max NumberField after clicking Limité in CreateStandModal', () => {
    render(<AdminApp />);
    fireEvent.click(screen.getByRole('button', { name: /\+ Nouveau stand/i }));
    const limitedBtns = screen.getAllByText('Limité');
    fireEvent.click(limitedBtns[0]);
    expect(screen.getAllByText(/délais max/i).length).toBeGreaterThan(0);
  });
});
