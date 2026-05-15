import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useVendorStandLookup } from './useVendorStandLookup';
import { getDocs } from 'firebase/firestore';

vi.mock('../tokens', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../tokens')>();
  return { ...actual, STAND_ID: '' };
});

// STAND_ID = '' — hook must look up Firestore by vendor_uid
describe('useVendorStandLookup — STAND_ID vide', () => {
  const googleUser: any = { uid: 'v1', email: 'v@test.com', isAnonymous: false };
  let locationReplace: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    locationReplace = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, replace: locationReplace },
      writable: true,
      configurable: true,
    });
  });

  it('returns "none" when user is null', async () => {
    const { result } = renderHook(() => useVendorStandLookup(null));
    await act(async () => {});
    expect(result.current).toBe('none');
    expect(getDocs).not.toHaveBeenCalled();
  });

  it('returns "none" when user is anonymous', async () => {
    const { result } = renderHook(() =>
      useVendorStandLookup({ uid: 'anon', isAnonymous: true } as any),
    );
    await act(async () => {});
    expect(result.current).toBe('none');
    expect(getDocs).not.toHaveBeenCalled();
  });

  it('returns "none" when no stand found for this vendor_uid', async () => {
    (getDocs as any).mockResolvedValueOnce({ empty: true, docs: [] });
    const { result } = renderHook(() => useVendorStandLookup(googleUser));
    await act(async () => {});
    expect(result.current).toBe('none');
    expect(getDocs).toHaveBeenCalled();
  });

  it('redirects and returns "redirecting" when a stand is found', async () => {
    (getDocs as any).mockResolvedValueOnce({
      empty: false,
      docs: [{ id: 's_existingstand' }],
    });
    const { result } = renderHook(() => useVendorStandLookup(googleUser));
    await act(async () => {});
    expect(result.current).toBe('redirecting');
    expect(locationReplace).toHaveBeenCalledWith('/vendor?stand=s_existingstand');
  });

  it('returns "none" when getDocs throws', async () => {
    (getDocs as any).mockRejectedValueOnce(new Error('Firestore error'));
    const { result } = renderHook(() => useVendorStandLookup(googleUser));
    await act(async () => {});
    expect(result.current).toBe('none');
  });

  it('re-runs when user changes from null to authenticated', async () => {
    (getDocs as any).mockResolvedValue({ empty: true, docs: [] });
    const { result, rerender } = renderHook(
      ({ user }: { user: any }) => useVendorStandLookup(user),
      { initialProps: { user: null } },
    );
    await act(async () => {});
    expect(getDocs).not.toHaveBeenCalled();

    rerender({ user: googleUser });
    await act(async () => {});
    expect(getDocs).toHaveBeenCalledTimes(1);
    expect(result.current).toBe('none');
  });
});
