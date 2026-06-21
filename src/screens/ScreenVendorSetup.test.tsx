import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ScreenVendorSetup from './ScreenVendorSetup';

describe('ScreenVendorSetup', () => {
  const mockStand: any = {
    name: 'Test Stand',
    logo_url: 'https://example.com/logo.png',
    address: 'B12',
    is_open: true,
    flow_slow: 5,
    flow_sprint: 1,
    max_queue_size: 30,
    max_delayed: 5,
  };

  const standNoLimits: any = {
    name: 'Minimal Stand',
    is_open: false,
    flow_slow: 5,
    flow_sprint: 1,
    // no max_queue_size / max_delayed → limitQueue=false, limitDelay=false
  };

  // ─── Rendering ────────────────────────────────────────────────

  it('renders existing stand data', () => {
    render(<ScreenVendorSetup stand={mockStand} onSave={() => {}} isEditing={true} />);
    expect(screen.getByDisplayValue('Test Stand')).toBeInTheDocument();
    expect(screen.getByDisplayValue('B12')).toBeInTheDocument();
  });

  it('shows creation title when not editing', () => {
    render(<ScreenVendorSetup stand={standNoLimits} onSave={() => {}} isEditing={false} />);
    expect(screen.getByText(/Créez/i)).toBeInTheDocument();
    expect(screen.getByText(/Créer mon stand/i)).toBeInTheDocument();
  });

  it('shows editing title when isEditing is true', () => {
    render(<ScreenVendorSetup stand={mockStand} onSave={() => {}} isEditing={true} />);
    expect(screen.getByText(/Paramètres/i)).toBeInTheDocument();
    expect(screen.getByText(/Sauvegarder/i)).toBeInTheDocument();
  });

  it('shows Annuler button in editing mode and calls onSave(null)', () => {
    const onSave = vi.fn();
    render(<ScreenVendorSetup stand={mockStand} onSave={onSave} isEditing={true} />);
    fireEvent.click(screen.getByText('Annuler'));
    expect(onSave).toHaveBeenCalledWith(null);
  });

  it('shows required message when name is empty', () => {
    render(<ScreenVendorSetup stand={{ ...mockStand, name: '' }} onSave={() => {}} />);
    expect(screen.getByText(/Le nom du stand est requis/i)).toBeInTheDocument();
  });

  it('save button is disabled when name is empty', () => {
    render(<ScreenVendorSetup stand={{ ...mockStand, name: '' }} onSave={() => {}} />);
    expect(screen.getByRole('button', { name: /Créer mon stand/i })).toBeDisabled();
  });

  // ─── Logo ─────────────────────────────────────────────────────

  it('shows error if logo fails to load', () => {
    render(<ScreenVendorSetup stand={mockStand} onSave={() => {}} isEditing={true} />);
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByText(/Image inaccessible/i)).toBeInTheDocument();
  });

  it('clears logo error when URL is changed', () => {
    render(<ScreenVendorSetup stand={mockStand} onSave={() => {}} isEditing={true} />);
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByText(/Image inaccessible/i)).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/https:\/\//i), {
      target: { value: 'https://new.com/img.png' },
    });
    expect(screen.queryByText(/Image inaccessible/i)).not.toBeInTheDocument();
  });

  it('extracts direct URL from Google Images redirect URL', () => {
    render(<ScreenVendorSetup stand={{ ...mockStand, logo_url: '' }} onSave={() => {}} />);
    const input = screen.getByPlaceholderText(/https:\/\//i);
    const encoded = encodeURIComponent('https://real-image.com/photo.jpg');
    fireEvent.change(input, {
      target: { value: `https://www.google.com/imgres?imgurl=${encoded}` },
    });
    expect((input as HTMLInputElement).value).toBe('https://real-image.com/photo.jpg');
  });

  // ─── Capacity & delays ─────────────────────────────────────────

  it('shows queue NumberField when limitQueue is true', () => {
    render(<ScreenVendorSetup stand={mockStand} onSave={() => {}} />);
    expect(screen.getByText(/personnes max/i)).toBeInTheDocument();
  });

  it('hides queue NumberField after clicking Illimitée', () => {
    render(<ScreenVendorSetup stand={mockStand} onSave={() => {}} />);
    fireEvent.click(screen.getByText('Illimitée'));
    expect(screen.queryByText(/personnes max/i)).not.toBeInTheDocument();
  });

  it('shows delay NumberField when limitDelay is true', () => {
    render(<ScreenVendorSetup stand={mockStand} onSave={() => {}} />);
    expect(screen.getByText(/délais max/i)).toBeInTheDocument();
  });

  it('shows queue NumberField after clicking Limitée (from unlim state)', () => {
    render(<ScreenVendorSetup stand={standNoLimits} onSave={() => {}} />);
    expect(screen.queryByText(/personnes max/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Limitée'));
    expect(screen.getByText(/personnes max/i)).toBeInTheDocument();
  });

  it('shows delay NumberField after clicking Limité (from unlim state)', () => {
    render(<ScreenVendorSetup stand={standNoLimits} onSave={() => {}} />);
    expect(screen.queryByText(/délais max/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Limité'));
    expect(screen.getByText(/délais max/i)).toBeInTheDocument();
  });

  // ─── is_open toggle ────────────────────────────────────────────

  it('shows "Ouverte" label when is_open is true', () => {
    render(<ScreenVendorSetup stand={mockStand} onSave={() => {}} />);
    expect(screen.getByText(/Ouverte · les clients peuvent rejoindre/i)).toBeInTheDocument();
  });

  it('shows "Fermée" label when is_open is false', () => {
    render(<ScreenVendorSetup stand={standNoLimits} onSave={() => {}} />);
    expect(screen.getByText(/Fermée · QR code inactif/i)).toBeInTheDocument();
  });

  it('toggles is_open state when Toggle is clicked', () => {
    render(<ScreenVendorSetup stand={mockStand} onSave={() => {}} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(screen.getByText(/Fermée · QR code inactif/i)).toBeInTheDocument();
  });

  // ─── Flow rate ─────────────────────────────────────────────────

  it('renders flow rate table with 5 rows', () => {
    render(<ScreenVendorSetup stand={mockStand} onSave={() => {}} />);
    expect(screen.getAllByText(/Forte affluence/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Faible affluence/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Flux normal/i)).toBeInTheDocument();
  });

  // ─── Save ─────────────────────────────────────────────────────

  it('calls onSave with form data when submitted', async () => {
    const handleSave = vi.fn();
    render(<ScreenVendorSetup stand={mockStand} onSave={handleSave} isEditing={true} />);
    await act(async () => {
      fireEvent.click(screen.getByText(/Sauvegarder/i));
    });
    expect(handleSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test Stand',
        address: 'B12',
        isOpen: true,
      }),
    );
  });

  it('passes null limits when unlimited is selected', async () => {
    const handleSave = vi.fn();
    render(<ScreenVendorSetup stand={standNoLimits} onSave={handleSave} isEditing={false} />);
    await act(async () => {
      fireEvent.click(screen.getByText(/Créer mon stand/i));
    });
    expect(handleSave).toHaveBeenCalledWith(
      expect.objectContaining({
        maxQueueSize: null,
        maxDelayed: null,
      }),
    );
  });

  // ─── Flow rate clamping ────────────────────────────────────────

  it('flowSlow clamps at flowSprint + 0.5 when set too low', () => {
    render(<ScreenVendorSetup stand={mockStand} onSave={() => {}} />);
    // mockStand: flow_sprint=1 → min flowSlow = 1.5
    const input = screen.getByLabelText(/Forte affluence/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '0.5' } });
    expect(input.value).toBe('1.5');
  });

  it('flowSprint clamps at flowSlow - 0.5 when set too high', () => {
    render(<ScreenVendorSetup stand={mockStand} onSave={() => {}} />);
    // mockStand: flow_slow=5 → max flowSprint = 4.5
    const input = screen.getByLabelText(/Faible affluence/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '10' } });
    expect(input.value).toBe('4.5');
  });

  it('maxQueueSize clamps at minimum 1 when set to 0', () => {
    render(<ScreenVendorSetup stand={mockStand} onSave={() => {}} />);
    // mockStand has max_queue_size: 30 → limitQueue=true (spinbutton[2])
    const input = screen.getAllByRole('spinbutton')[2] as HTMLInputElement;
    fireEvent.change(input, { target: { value: '0' } });
    expect(input.value).toBe('1');
  });

  it('maxDelayed clamps at minimum 0 when set to negative', () => {
    render(<ScreenVendorSetup stand={mockStand} onSave={() => {}} />);
    // mockStand has max_delayed: 5 → limitDelay=true (spinbutton[3])
    const input = screen.getAllByRole('spinbutton')[3] as HTMLInputElement;
    fireEvent.change(input, { target: { value: '-1' } });
    expect(input.value).toBe('0');
  });
});
