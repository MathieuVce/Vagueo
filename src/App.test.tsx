import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from './App';

vi.mock('./pages/AdminApp',  () => ({ default: () => <div>Admin App</div> }));
vi.mock('./pages/VendorApp', () => ({ default: () => <div>Vendor App</div> }));
vi.mock('./pages/ClientApp', () => ({ default: () => <div>Client App</div> }));

describe('App', () => {
  it('renders ClientApp by default', async () => {
    vi.stubGlobal('location', { search: '', pathname: '/' });
    await act(async () => { render(<App />); });
    expect(screen.getByText(/Client App/i)).toBeInTheDocument();
  });

  it('renders VendorApp if path starts with /vendor', async () => {
    vi.stubGlobal('location', { search: '', pathname: '/vendor' });
    await act(async () => { render(<App />); });
    expect(screen.getByText(/Vendor App/i)).toBeInTheDocument();
  });

  it('renders AdminApp if path starts with /admin', async () => {
    vi.stubGlobal('location', { search: '', pathname: '/admin' });
    await act(async () => { render(<App />); });
    expect(screen.getByText(/Admin App/i)).toBeInTheDocument();
  });
});
