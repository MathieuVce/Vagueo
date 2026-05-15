import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useVendorStandLookup } from './useVendorStandLookup';
import { getDocs } from 'firebase/firestore';

// STAND_ID = 'stand_01' from setup.ts — hook must be a no-op
describe('useVendorStandLookup — STAND_ID défini', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns "none" immediately without querying Firestore', async () => {
    const { result } = renderHook(() =>
      useVendorStandLookup({ uid: 'u1', isAnonymous: false } as any),
    );
    await act(async () => {});
    expect(result.current).toBe('none');
    expect(getDocs).not.toHaveBeenCalled();
  });
});
