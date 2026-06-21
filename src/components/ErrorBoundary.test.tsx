import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ErrorBoundary from './ErrorBoundary';

const ProblemChild = () => {
  throw new Error('Test error');
};

// React 18 dev mode re-throws errors through the event system; jsdom writes
// these directly to stderr bypassing console.error. Suppress via the window event.
function suppressWindowError(e: ErrorEvent) {
  e.preventDefault();
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    window.addEventListener('error', suppressWindowError, { capture: true });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    window.removeEventListener('error', suppressWindowError, { capture: true });
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Safe Content</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText('Safe Content')).toBeInTheDocument();
  });

  it('renders error UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/Une erreur est survenue/i)).toBeInTheDocument();
    expect(screen.getByText(/Test error/i)).toBeInTheDocument();
  });
});
