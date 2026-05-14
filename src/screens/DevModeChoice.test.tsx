import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DevModeChoice from './DevModeChoice';

describe('DevModeChoice', () => {
  it('renders login options', () => {
    render(<DevModeChoice onTestMode={() => {}} onGoogleMode={() => {}} />);
    expect(screen.getByText(/Se connecter avec Google/i)).toBeInTheDocument();
    expect(screen.getByText(/Continuer en mode test/i)).toBeInTheDocument();
  });

  it('calls onGoogleMode when Google button is clicked', () => {
    const onGoogleMode = vi.fn();
    render(<DevModeChoice onTestMode={() => {}} onGoogleMode={onGoogleMode} />);
    fireEvent.click(screen.getByText(/Se connecter avec Google/i));
    expect(onGoogleMode).toHaveBeenCalledOnce();
  });

  it('calls onTestMode when test button is clicked', () => {
    const onTestMode = vi.fn();
    render(<DevModeChoice onTestMode={onTestMode} onGoogleMode={() => {}} />);
    fireEvent.click(screen.getByText(/Continuer en mode test/i));
    expect(onTestMode).toHaveBeenCalledOnce();
  });

  it('disables buttons while signing in', () => {
    render(<DevModeChoice onTestMode={() => {}} onGoogleMode={() => {}} signingIn />);
    expect(screen.getByText(/Connexion en cours/i).closest('button')).toBeDisabled();
  });

  it('shows error message when provided', () => {
    render(<DevModeChoice onTestMode={() => {}} onGoogleMode={() => {}} error="Connexion impossible." />);
    expect(screen.getByText(/Connexion impossible/i)).toBeInTheDocument();
  });
});
