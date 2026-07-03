import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useQueueCounts } from './useQueueCounts';
import { onSnapshot } from 'firebase/firestore';

describe('useQueueCounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets counts correctly when snapshots update', () => {
    let callback1: any;
    let callback2: any;

    (onSnapshot as any).mockImplementation((query: any, cb: any) => {
      if (!callback1) callback1 = cb;
      else callback2 = cb;
      return () => {};
    });

    const { result } = renderHook(() => useQueueCounts(true));

    // qWaiting expose forEach (QuerySnapshot) → sert à calculer minActiveWave.
    const waves = [4, 2, 7];
    const waitingSnap = {
      size: 12,
      forEach: (fn: any) => waves.forEach((w) => fn({ data: () => ({ wave_number: w }) })),
    };

    act(() => {
      callback1({ size: 5 });
      callback2(waitingSnap);
    });

    expect(result.current.presentCount).toBe(5);
    expect(result.current.waitingCount).toBe(12);
    expect(result.current.minActiveWave).toBe(2);
  });

  it('does nothing when disabled', () => {
    renderHook(() => useQueueCounts(false));
    expect(onSnapshot).not.toHaveBeenCalled();
  });
});
