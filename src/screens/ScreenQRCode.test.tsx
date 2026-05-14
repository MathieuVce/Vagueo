import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ScreenQRCode from './ScreenQRCode';

// Render a real SVG so qrRef.current.querySelector('svg') works in handlePrint/handleDownload
vi.mock('qrcode.react', () => ({
  QRCodeSVG: () => <svg data-testid="qrsvg"><rect x="0" y="0" width="100" height="100" /></svg>,
}));

const mockWin = {
  document: { write: vi.fn(), close: vi.fn() },
  focus: vi.fn(),
  close: vi.fn(),
  print: vi.fn(),
  onafterprint: null as any,
};

const mockCtx = {
  fillStyle: '' as any,
  font: '' as any,
  textAlign: '' as any,
  fillRect: vi.fn(),
  drawImage: vi.fn(),
  fillText: vi.fn(),
};

describe('ScreenQRCode', () => {
  const mockStand: any = { name: 'Test Stand', is_open: true };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
      share: vi.fn().mockResolvedValue(undefined),
    });
    window.open = vi.fn(() => mockWin as any);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockCtx as any);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,mock');
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  // ─── Rendering ────────────────────────────────────────────────

  it('renders stand name and QR code', () => {
    render(<ScreenQRCode stand={mockStand} onClose={() => {}} />);
    expect(screen.getByText('Test Stand')).toBeInTheDocument();
    expect(screen.getByTestId('qrsvg')).toBeInTheDocument();
  });

  it('falls back to "File d\'attente" when stand has no name', () => {
    render(<ScreenQRCode stand={{ ...mockStand, name: '' }} onClose={() => {}} />);
    expect(screen.getByText("File d'attente")).toBeInTheDocument();
  });

  it('shows "File ouverte" badge when open', () => {
    render(<ScreenQRCode stand={mockStand} onClose={() => {}} />);
    expect(screen.getByText('File ouverte')).toBeInTheDocument();
  });

  it('shows "File fermée" badge and warning when closed', () => {
    render(<ScreenQRCode stand={{ ...mockStand, is_open: false }} onClose={() => {}} />);
    expect(screen.getByText('File fermée')).toBeInTheDocument();
    expect(screen.getByText(/La file est fermée/i)).toBeInTheDocument();
  });

  it('calls onClose when × is clicked', () => {
    const onClose = vi.fn();
    render(<ScreenQRCode stand={mockStand} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: '×' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('mail link has correct mailto href', () => {
    render(<ScreenQRCode stand={mockStand} onClose={() => {}} />);
    const link = screen.getByText(/Par mail/i).closest('a')!;
    expect(link.getAttribute('href')).toMatch(/^mailto:/);
    expect(link.getAttribute('href')).toContain('Test%20Stand');
  });

  // ─── Print ────────────────────────────────────────────────────

  it('opens print window with stand name in title', async () => {
    render(<ScreenQRCode stand={mockStand} onClose={() => {}} />);
    await act(async () => { fireEvent.click(screen.getByText(/Imprimer/i)); });
    expect(window.open).toHaveBeenCalledWith('', '_blank', expect.any(String));
    expect(mockWin.document.write).toHaveBeenCalledWith(expect.stringContaining('Test Stand'));
    expect(mockWin.document.close).toHaveBeenCalled();
    expect(mockWin.focus).toHaveBeenCalled();
  });

  it('shows alert when window.open returns null', async () => {
    window.open = vi.fn(() => null as any);
    window.alert = vi.fn();
    render(<ScreenQRCode stand={mockStand} onClose={() => {}} />);
    await act(async () => { fireEvent.click(screen.getByText(/Imprimer/i)); });
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('popup'));
  });

  // ─── Download ─────────────────────────────────────────────────

  it('triggers PNG download', async () => {
    // Make Image fire onload synchronously when src is assigned
    const OrigImage = globalThis.Image;
    class MockImage {
      onload: (() => void) | null = null;
      private _src = '';
      get src() { return this._src; }
      set src(v: string) {
        this._src = v;
        Promise.resolve().then(() => this.onload?.());
      }
    }
    vi.stubGlobal('Image', MockImage);

    render(<ScreenQRCode stand={mockStand} onClose={() => {}} />);
    await act(async () => { fireEvent.click(screen.getByText(/Télécharger/i)); });

    expect(mockCtx.fillRect).toHaveBeenCalled();
    expect(mockCtx.drawImage).toHaveBeenCalled();
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();

    vi.stubGlobal('Image', OrigImage);
  });

  // ─── Share ────────────────────────────────────────────────────

  it('calls navigator.share when available', async () => {
    render(<ScreenQRCode stand={mockStand} onClose={() => {}} />);
    await act(async () => { fireEvent.click(screen.getByText(/Partager le lien/i)); });
    expect(navigator.share).toHaveBeenCalledWith(expect.objectContaining({ url: expect.any(String) }));
  });

  it('shows "Partage…" state while sharing', async () => {
    let resolveShare!: () => void;
    (navigator.share as any) = vi.fn(() => new Promise<void>(r => { resolveShare = r; }));
    render(<ScreenQRCode stand={mockStand} onClose={() => {}} />);
    fireEvent.click(screen.getByText(/Partager le lien/i));
    expect(screen.getByText(/Partage…/i)).toBeInTheDocument();
    await act(async () => { resolveShare(); });
  });

  it('falls back to clipboard when navigator.share is undefined', async () => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    render(<ScreenQRCode stand={mockStand} onClose={() => {}} />);
    await act(async () => { fireEvent.click(screen.getByText(/Partager le lien/i)); });
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  it('does not copy to clipboard on AbortError', async () => {
    const err = Object.assign(new Error('aborted'), { name: 'AbortError' });
    (navigator.share as any) = vi.fn().mockRejectedValue(err);
    render(<ScreenQRCode stand={mockStand} onClose={() => {}} />);
    await act(async () => { fireEvent.click(screen.getByText(/Partager le lien/i)); });
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });

  it('copies to clipboard when share throws non-AbortError', async () => {
    (navigator.share as any) = vi.fn().mockRejectedValue(new Error('denied'));
    render(<ScreenQRCode stand={mockStand} onClose={() => {}} />);
    await act(async () => { fireEvent.click(screen.getByText(/Partager le lien/i)); });
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  it('shows "✓ Lien copié !" after clipboard write', async () => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    render(<ScreenQRCode stand={mockStand} onClose={() => {}} />);
    await act(async () => { fireEvent.click(screen.getByText(/Partager le lien/i)); });
    expect(screen.getByText(/Lien copié/i)).toBeInTheDocument();
  });
});
