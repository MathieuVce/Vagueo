import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ScreenVendor from './ScreenVendor';

describe('ScreenVendor', () => {
  const mockStand: any = {
    secure_color: '#FF6B9D',
    is_paused: false,
    is_open: true,
    flow_rate: 3,
    name: 'Test Stand',
  };

  it('renders status and counts', () => {
    render(
      <ScreenVendor 
        stand={mockStand} 
        presentCount={5} 
        waitingCount={10} 
        clock={new Date()} 
        onTogglePause={() => {}} 
        onToggleOpen={() => {}} 
        onSetFlowRate={() => {}} 
        onOpenSettings={() => {}} 
        onOpenStats={() => {}} 
        onOpenQR={() => {}} 
        vendorEmail="test@example.com" 
        onSignOut={() => {}} 
        isDemoMode={false} 
        isDevMode={false} 
      />
    );
    expect(screen.getByText((_, node) => node?.textContent === 'En service')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('shows dev toolbar if isDevMode is true and fns provided', () => {
    const handleAdd = vi.fn();
    render(
      <ScreenVendor 
        stand={mockStand} 
        presentCount={5} 
        waitingCount={10} 
        clock={new Date()} 
        onTogglePause={() => {}} 
        onToggleOpen={() => {}} 
        onSetFlowRate={() => {}} 
        onOpenSettings={() => {}} 
        onOpenStats={() => {}} 
        onOpenQR={() => {}} 
        vendorEmail="test@example.com" 
        onSignOut={() => {}} 
        isDemoMode={false} 
        isDevMode={true} 
        onDevAddClient={handleAdd}
      />
    );
    expect(screen.getAllByText(/DEV/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /\+ client/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /\+ client/i }));
    expect(handleAdd).toHaveBeenCalled();
  });
});
