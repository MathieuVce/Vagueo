import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ScreenVendorLogin from './ScreenVendorLogin';

describe('ScreenVendorLogin', () => {
  it('renders login prompt and button', () => {
    render(
      <ScreenVendorLogin 
        standName="My Stand" 
        onSignIn={() => {}} 
        error={null} 
        loading={false} 
      />
    );
    expect(screen.getByText(/Gérer My Stand/i)).toBeInTheDocument();
    expect(screen.getByText(/Se connecter avec Google/i)).toBeInTheDocument();
  });

  it('calls onSignIn when button is clicked', () => {
    const handleSignIn = vi.fn();
    render(
      <ScreenVendorLogin 
        standName="My Stand" 
        onSignIn={handleSignIn} 
        error={null} 
        loading={false} 
      />
    );
    fireEvent.click(screen.getByText(/Se connecter avec Google/i));
    expect(handleSignIn).toHaveBeenCalledTimes(1);
  });

  it('shows loading state', () => {
    render(
      <ScreenVendorLogin 
        standName="My Stand" 
        onSignIn={() => {}} 
        error={null} 
        loading={true} 
      />
    );
    expect(screen.getByText(/Connexion…/i)).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows error message if provided', () => {
    render(
      <ScreenVendorLogin 
        standName="My Stand" 
        onSignIn={() => {}} 
        error="Auth failed" 
        loading={false} 
      />
    );
    expect(screen.getByText('Auth failed')).toBeInTheDocument();
  });
});
