import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDevHelpers } from './useDevHelpers';
import {
  runTransaction,
  getDocs,
  writeBatch,
  deleteDoc,
  updateDoc,
  increment,
} from 'firebase/firestore';

describe('useDevHelpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devAddClient calls runTransaction', async () => {
    const { result } = renderHook(() => useDevHelpers());
    await act(async () => {
      await result.current.devAddClient();
    });
    expect(runTransaction).toHaveBeenCalled();
  });

  it('devRemoveClient deletes the first matching doc', async () => {
    (getDocs as any).mockResolvedValue({
      empty: false,
      docs: [{ ref: 'mockRef' }],
    });

    const { result } = renderHook(() => useDevHelpers());
    await act(async () => {
      await result.current.devRemoveClient();
    });
    expect(deleteDoc).toHaveBeenCalledWith('mockRef');
  });

  it('devLessWait avance la vague (current_wave +1)', async () => {
    const { result } = renderHook(() => useDevHelpers());
    await act(async () => {
      await result.current.devLessWait();
    });
    expect(increment).toHaveBeenCalledWith(1);
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ current_wave: expect.anything() }),
    );
  });

  it('devMoreWait recule la vague sans descendre sous 0', async () => {
    // tx.get renvoie current_wave: 0 → max(0, -1) = 0
    const captured: { current_wave?: number } = {};
    (runTransaction as any).mockImplementation(async (_db: unknown, cb: any) => {
      const tx = {
        get: vi.fn().mockResolvedValue({ data: () => ({ current_wave: 0 }) }),
        update: vi.fn((_ref: unknown, d: { current_wave: number }) => {
          captured.current_wave = d.current_wave;
        }),
        set: vi.fn(),
        delete: vi.fn(),
      };
      return cb(tx);
    });
    const { result } = renderHook(() => useDevHelpers());
    await act(async () => {
      await result.current.devMoreWait();
    });
    expect(captured.current_wave).toBe(0);
  });

  it('devClearQueue deletes all active docs via batch', async () => {
    const mockBatch = writeBatch(vi.fn() as any);
    (writeBatch as any).mockReturnValue(mockBatch);

    (getDocs as any).mockResolvedValue({
      empty: false,
      docs: [{ ref: 'ref1' }, { ref: 'ref2' }],
    });

    const { result } = renderHook(() => useDevHelpers());
    await act(async () => {
      await result.current.devClearQueue();
    });
    expect(mockBatch.delete).toHaveBeenCalledTimes(2);
    expect(mockBatch.commit).toHaveBeenCalled();
  });

  it('devResetStore deletes queue and stand', async () => {
    const mockBatch = writeBatch(vi.fn() as any);
    (writeBatch as any).mockReturnValue(mockBatch);

    (getDocs as any).mockResolvedValue({
      empty: false,
      docs: [{ ref: 'ref1' }],
    });
    const onDone = vi.fn();

    const { result } = renderHook(() => useDevHelpers());
    await act(async () => {
      await result.current.devResetStore(onDone);
    });

    expect(mockBatch.delete).toHaveBeenCalled();
    expect(deleteDoc).toHaveBeenCalled();
    expect(onDone).toHaveBeenCalled();
  });
});
