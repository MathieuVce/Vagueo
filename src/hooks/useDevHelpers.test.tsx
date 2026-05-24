import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDevHelpers } from './useDevHelpers';
import { runTransaction, getDocs, writeBatch, deleteDoc } from 'firebase/firestore';

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
