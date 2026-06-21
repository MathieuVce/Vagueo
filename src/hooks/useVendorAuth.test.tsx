import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useVendorAuth } from './useVendorAuth';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
} from 'firebase/auth';

describe('useVendorAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets user when auth state changes', () => {
    let callback: any;
    (onAuthStateChanged as any).mockImplementation((auth: any, cb: any) => {
      callback = cb;
      return () => {};
    });

    const { result } = renderHook(() => useVendorAuth(null));

    expect(result.current.loading).toBe(true);

    act(() => {
      callback({ uid: '123', email: 'test@example.com', isAnonymous: false });
    });

    expect(result.current.user).toMatchObject({ uid: '123' });
    expect(result.current.loading).toBe(false);
  });

  it('calls signInWithPopup when signIn is called', async () => {
    const { result } = renderHook(() => useVendorAuth(null));
    await act(async () => {
      await result.current.signIn();
    });
    expect(signInWithPopup).toHaveBeenCalled();
  });

  it('calls signOut when signOut is called', async () => {
    const { result } = renderHook(() => useVendorAuth(null));
    await act(async () => {
      await result.current.signOut();
    });
    expect(signOut).toHaveBeenCalled();
  });

  // ─── getRedirectResult on mount ───────────────────────────────

  it('calls getRedirectResult on mount', () => {
    renderHook(() => useVendorAuth(null));
    expect(getRedirectResult).toHaveBeenCalled();
  });

  // ─── signIn fallbacks ─────────────────────────────────────────

  it('falls back to signInWithRedirect when popup is blocked', async () => {
    (signInWithPopup as any).mockRejectedValueOnce({ code: 'auth/popup-blocked' });
    const { result } = renderHook(() => useVendorAuth(null));
    await act(async () => {
      await result.current.signIn();
    });
    expect(signInWithRedirect).toHaveBeenCalled();
  });

  it('falls back to signInWithRedirect when popup request is cancelled', async () => {
    (signInWithPopup as any).mockRejectedValueOnce({ code: 'auth/cancelled-popup-request' });
    const { result } = renderHook(() => useVendorAuth(null));
    await act(async () => {
      await result.current.signIn();
    });
    expect(signInWithRedirect).toHaveBeenCalled();
  });

  it('sets error for unhandled auth failures', async () => {
    (signInWithPopup as any).mockRejectedValueOnce({ code: 'auth/network-request-failed' });
    const { result } = renderHook(() => useVendorAuth(null));
    await act(async () => {
      await result.current.signIn();
    });
    expect(result.current.error).toBe('Connexion impossible. Réessayez.');
  });

  it('sets no error when popup closed by user', async () => {
    (signInWithPopup as any).mockRejectedValueOnce({ code: 'auth/popup-closed-by-user' });
    const { result } = renderHook(() => useVendorAuth(null));
    await act(async () => {
      await result.current.signIn();
    });
    expect(result.current.error).toBeNull();
    expect(signInWithRedirect).not.toHaveBeenCalled();
  });

  // ─── isOwner / isUnclaimed ────────────────────────────────────

  function bootWithUser(stand: any, user: any) {
    let authCb: any;
    (onAuthStateChanged as any).mockImplementation((_auth: any, cb: any) => {
      authCb = cb;
      return () => {};
    });
    const { result } = renderHook(() => useVendorAuth(stand));
    act(() => {
      authCb(user);
    });
    return result;
  }

  it('isOwner and isAuthorized are true when uid matches stand.vendor_uid', () => {
    const stand: any = { vendor_uid: 'u1', vendor_email: 'v@test.com' };
    const user = { uid: 'u1', email: 'v@test.com', isAnonymous: false };
    const result = bootWithUser(stand, user);
    expect(result.current.isOwner).toBe(true);
    expect(result.current.isAuthorized).toBe(true);
  });

  it('isUnclaimed is true when stand has no vendor_uid and email matches', () => {
    const stand: any = { vendor_uid: undefined, vendor_email: 'v@test.com' };
    const user = { uid: 'u1', email: 'v@test.com', isAnonymous: false };
    const result = bootWithUser(stand, user);
    expect(result.current.isUnclaimed).toBe(true);
    expect(result.current.isAuthorized).toBe(true);
  });

  it('isUnclaimed is false when vendor_email does not match user email', () => {
    const stand: any = { vendor_uid: undefined, vendor_email: 'other@test.com' };
    const user = { uid: 'u1', email: 'v@test.com', isAnonymous: false };
    const result = bootWithUser(stand, user);
    expect(result.current.isUnclaimed).toBe(false);
    expect(result.current.isAuthorized).toBe(false);
  });
});
