import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ScreenVendorCreate from './ScreenVendorCreate';
import { setDoc } from 'firebase/firestore';

describe('ScreenVendorCreate', () => {
  const mockUser: any = {
    uid: 'user-123',
    email: 'vendor@test.com',
    isAnonymous: false,
  };

  const mockOnCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(
      'abcdef1234567890abcdef1234567890' as ReturnType<typeof crypto.randomUUID>,
    );
  });

  // ─── Rendering ───────────────────────────────────────────────

  it('renders name and address fields', () => {
    render(<ScreenVendorCreate user={mockUser} onCreated={mockOnCreated} />);
    expect(screen.getByPlaceholderText(/Ex : Chez Marie/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ex : Marché central/i)).toBeInTheDocument();
  });

  it('shows the vendor email', () => {
    render(<ScreenVendorCreate user={mockUser} onCreated={mockOnCreated} />);
    expect(screen.getByText(/vendor@test\.com/i)).toBeInTheDocument();
  });

  // ─── Button state ─────────────────────────────────────────────

  it('submit button is disabled when name is empty', () => {
    render(<ScreenVendorCreate user={mockUser} onCreated={mockOnCreated} />);
    expect(screen.getByRole('button', { name: /Créer mon stand/i })).toBeDisabled();
  });

  it('submit button is disabled for whitespace-only name', () => {
    render(<ScreenVendorCreate user={mockUser} onCreated={mockOnCreated} />);
    fireEvent.change(screen.getByPlaceholderText(/Ex : Chez Marie/i), {
      target: { value: '   ' },
    });
    expect(screen.getByRole('button', { name: /Créer mon stand/i })).toBeDisabled();
  });

  it('submit button is enabled when name has content', () => {
    render(<ScreenVendorCreate user={mockUser} onCreated={mockOnCreated} />);
    fireEvent.change(screen.getByPlaceholderText(/Ex : Chez Marie/i), {
      target: { value: 'Mon Stand' },
    });
    expect(screen.getByRole('button', { name: /Créer mon stand/i })).not.toBeDisabled();
  });

  // ─── Submission ───────────────────────────────────────────────

  it('calls setDoc with trimmed name, address and correct metadata', async () => {
    render(<ScreenVendorCreate user={mockUser} onCreated={mockOnCreated} />);
    fireEvent.change(screen.getByPlaceholderText(/Ex : Chez Marie/i), {
      target: { value: '  Mon Stand  ' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Ex : Marché central/i), {
      target: { value: '  Allée B  ' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Créer mon stand/i }));
    });
    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        name: 'Mon Stand',
        address: 'Allée B',
        status: 'pending_approval',
        vendor_uid: 'user-123',
        vendor_email: 'vendor@test.com',
        is_open: false,
        is_paused: false,
      }),
    );
  });

  it('calls onCreated with a stand ID starting with "s_"', async () => {
    render(<ScreenVendorCreate user={mockUser} onCreated={mockOnCreated} />);
    fireEvent.change(screen.getByPlaceholderText(/Ex : Chez Marie/i), {
      target: { value: 'Mon Stand' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Créer mon stand/i }));
    });
    expect(mockOnCreated).toHaveBeenCalledWith(expect.stringMatching(/^s_/));
  });

  it('uses empty string for vendor_email when user.email is null', async () => {
    const userNoEmail = { ...mockUser, email: null };
    render(<ScreenVendorCreate user={userNoEmail} onCreated={mockOnCreated} />);
    fireEvent.change(screen.getByPlaceholderText(/Ex : Chez Marie/i), {
      target: { value: 'Mon Stand' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Créer mon stand/i }));
    });
    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ vendor_email: '' }),
    );
  });

  // ─── Loading state ────────────────────────────────────────────

  it('shows "Création…" while setDoc is pending', async () => {
    let resolveSetDoc!: () => void;
    (setDoc as any).mockReturnValueOnce(
      new Promise<void>((r) => {
        resolveSetDoc = r;
      }),
    );

    render(<ScreenVendorCreate user={mockUser} onCreated={mockOnCreated} />);
    fireEvent.change(screen.getByPlaceholderText(/Ex : Chez Marie/i), {
      target: { value: 'Mon Stand' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Créer mon stand/i }));

    expect(screen.getByText(/Création…/i)).toBeInTheDocument();
    await act(async () => {
      resolveSetDoc();
    });
  });

  // ─── Error handling ───────────────────────────────────────────

  it('shows error message when setDoc throws', async () => {
    (setDoc as any).mockRejectedValueOnce(new Error('Network error'));

    render(<ScreenVendorCreate user={mockUser} onCreated={mockOnCreated} />);
    fireEvent.change(screen.getByPlaceholderText(/Ex : Chez Marie/i), {
      target: { value: 'Mon Stand' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Créer mon stand/i }));
    });

    expect(screen.getByText(/Impossible de créer le stand/i)).toBeInTheDocument();
    expect(mockOnCreated).not.toHaveBeenCalled();
  });

  it('re-enables the form after an error', async () => {
    (setDoc as any).mockRejectedValueOnce(new Error('fail'));

    render(<ScreenVendorCreate user={mockUser} onCreated={mockOnCreated} />);
    fireEvent.change(screen.getByPlaceholderText(/Ex : Chez Marie/i), {
      target: { value: 'Mon Stand' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Créer mon stand/i }));
    });

    expect(screen.getByRole('button', { name: /Créer mon stand/i })).not.toBeDisabled();
  });
});
