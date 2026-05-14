import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ScreenAttente from './ScreenAttente';

describe('ScreenAttente', () => {
  it('renders estimated time and presence count', () => {
    render(
      <ScreenAttente 
        estimatedMin={12} 
        waitingStatus="red" 
        presentCount={3} 
        onLeave={() => {}} 
      />
    );
    expect(screen.getByText('~12')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/personnes au stand/i)).toBeInTheDocument();
  });

  it('renders "En attente" status for red', () => {
    render(
      <ScreenAttente 
        estimatedMin={12} 
        waitingStatus="red" 
        presentCount={3} 
        onLeave={() => {}} 
      />
    );
    expect(screen.getByText(/En attente/i)).toBeInTheDocument();
  });

  it('renders "Préparez-vous" status for orange', () => {
    render(
      <ScreenAttente 
        estimatedMin={4} 
        waitingStatus="orange" 
        presentCount={3} 
        onLeave={() => {}} 
      />
    );
    expect(screen.getByText(/Préparez-vous/i)).toBeInTheDocument();
  });

  it('calls onLeave when button is clicked', () => {
    const handleLeave = vi.fn();
    render(
      <ScreenAttente 
        estimatedMin={12} 
        waitingStatus="red" 
        presentCount={3} 
        onLeave={handleLeave} 
      />
    );
    fireEvent.click(screen.getByText(/Quitter la file/i));
    expect(handleLeave).toHaveBeenCalledTimes(1);
  });
});
