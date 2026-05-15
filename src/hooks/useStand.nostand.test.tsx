/**
 * useStand tests when STAND_ID is empty (no ?stand= param).
 * The hook must not subscribe to Firestore or create any document.
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useStand } from './useStand';
import { onSnapshot, setDoc, updateDoc } from 'firebase/firestore';

vi.mock('../tokens', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../tokens')>();
  return { ...actual, STAND_ID: '' };
});

describe('useStand — sans STAND_ID', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (onSnapshot as any).mockImplementation(() => () => {});
  });

  it('returns null stand immediately', () => {
    const { result } = renderHook(() => useStand());
    expect(result.current[0]).toBeNull();
  });

  it('does not call onSnapshot', () => {
    renderHook(() => useStand());
    expect(onSnapshot).not.toHaveBeenCalled();
  });

  it('does not call setDoc even when autoCreate is true', async () => {
    renderHook(() => useStand({ autoCreate: true }));
    await act(async () => {});
    expect(setDoc).not.toHaveBeenCalled();
  });

  it('togglePause is a no-op (stand is null)', async () => {
    const { result } = renderHook(() => useStand());
    await act(async () => { await result.current[1].togglePause(); });
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it('toggleOpen is a no-op (stand is null)', async () => {
    const { result } = renderHook(() => useStand());
    await act(async () => { await result.current[1].toggleOpen(); });
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it('setFlowRate is a no-op (stand is null)', async () => {
    const { result } = renderHook(() => useStand());
    await act(async () => { await result.current[1].setFlowRate(1); });
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it('claimStand is a no-op (stand is null)', async () => {
    const { result } = renderHook(() => useStand());
    await act(async () => { await result.current[1].claimStand('uid', 'email@test.com'); });
    expect(updateDoc).not.toHaveBeenCalled();
  });
});
