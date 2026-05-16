import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useClientSession } from './useClientSession';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { onSnapshot, runTransaction, updateDoc, deleteDoc, getDocs, writeBatch } from 'firebase/firestore';

describe('useClientSession', () => {
  const mockStand: any = { is_open: true, is_paused: false, min_per_person: 2 };

  // Helper: boots the hook and fires auth, returns the result
  async function boot(stand = mockStand) {
    let authCb: any;
    (onAuthStateChanged as any).mockImplementation((_: any, cb: any) => { authCb = cb; return () => {}; });
    const { result } = renderHook(() => useClientSession(stand));
    await act(async () => { authCb({ uid: 'uid1' }); });
    return result;
  }

  // Helper: fires a client snapshot on the hook
  function fireClientSnapshot(result: any, data: Record<string, unknown> | null) {
    const snap = data
      ? { exists: () => true,  data: () => data }
      : { exists: () => false, data: () => null };
    // onSnapshot was called for the queue/uid1 doc — find its callback
    const calls = (onSnapshot as any).mock.calls;
    for (const [, cb] of calls) {
      try { cb(snap); } catch (_) {}
    }
  }

  beforeEach(() => {
    vi.clearAllMocks();
    (signInAnonymously as any).mockResolvedValue({ user: { uid: 'anon' } });
    (getDocs as any).mockResolvedValue({ size: 0, docs: [] });
  });

  // ─── Auth & step derivation ────────────────────────────────────

  it('starts as loading then moves to splash when no client', async () => {
    const result = await boot();
    expect(result.current[1]).toBe('splash');
  });

  it('deriveStep: waiting status when client.status is waiting', async () => {
    const result = await boot();
    await act(async () => {
      fireClientSnapshot(result, { status: 'waiting', queue_position: 5 });
    });
    expect(result.current[1]).toBe('waiting');
  });

  it('deriveStep: checkin when client.status is orange', async () => {
    const result = await boot();
    await act(async () => {
      fireClientSnapshot(result, { status: 'orange', queue_position: 1 });
    });
    expect(result.current[1]).toBe('checkin');
  });

  it('deriveStep: validation when client.status is claimed', async () => {
    const result = await boot();
    await act(async () => {
      fireClientSnapshot(result, { status: 'claimed', queue_position: 1 });
    });
    expect(result.current[1]).toBe('validation');
  });

  it('deriveStep: splash when client.status is done', async () => {
    const result = await boot();
    await act(async () => {
      fireClientSnapshot(result, { status: 'done', queue_position: 1 });
    });
    expect(result.current[1]).toBe('splash');
  });

  it('signs in anonymously when no existing user', async () => {
    let authCb: any;
    (onAuthStateChanged as any).mockImplementation((_: any, cb: any) => { authCb = cb; return () => {}; });
    renderHook(() => useClientSession(mockStand));
    await act(async () => { authCb(null); });
    expect(signInAnonymously).toHaveBeenCalled();
  });

  // ─── Derived values ────────────────────────────────────────────

  it('computes estimatedMin and waitingStatus', async () => {
    const result = await boot({ ...mockStand, min_per_person: 3 });
    // positionAhead defaults to 0 → estimatedMin = max(1,0) = 1 → orange
    expect(result.current[2].estimatedMin).toBe(1);
    expect(result.current[2].waitingStatus).toBe('orange');
  });

  // ─── Actions ──────────────────────────────────────────────────

  it('join calls runTransaction', async () => {
    const result = await boot();
    await act(async () => { await result.current[3].join(); });
    expect(runTransaction).toHaveBeenCalled();
  });

  it('join is no-op when stand is closed', async () => {
    const result = await boot({ ...mockStand, is_open: false });
    await act(async () => { await result.current[3].join(); });
    expect(runTransaction).not.toHaveBeenCalled();
  });

  it('join respects max_queue_size when full', async () => {
    (getDocs as any).mockResolvedValue({ size: 10, docs: [] });
    const result = await boot({ ...mockStand, max_queue_size: 10 });
    await act(async () => { await result.current[3].join(); });
    expect(runTransaction).not.toHaveBeenCalled();
  });

  it('confirmPresence calls updateDoc with claimed status', async () => {
    const result = await boot();
    await act(async () => { await result.current[3].confirmPresence(); });
    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ status: 'claimed' }));
  });

  it('extend calls updateDoc with claimed_at', async () => {
    const result = await boot();
    await act(async () => { await result.current[3].extend(); });
    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ claimed_at: expect.anything() }));
  });

  it('done deletes the queue doc', async () => {
    const result = await boot();
    await act(async () => { await result.current[3].done('completed'); });
    expect(deleteDoc).toHaveBeenCalled();
  });

  it('restart deletes the queue doc', async () => {
    const result = await boot();
    await act(async () => { fireClientSnapshot(result, { status: 'waiting', queue_position: 3 }); });
    await act(async () => { await result.current[3].restart(); });
    expect(deleteDoc).toHaveBeenCalled();
  });

  it('leave deletes the queue doc', async () => {
    const result = await boot();
    await act(async () => { await result.current[3].leave(); });
    expect(deleteDoc).toHaveBeenCalled();
  });

  it('requestDelay calls updateDoc with new position', async () => {
    (getDocs as any).mockResolvedValue({
      size: 1,
      docs: [{ data: () => ({ queue_position: 5 }), id: 'other' }],
    });
    const result = await boot();
    await act(async () => {
      fireClientSnapshot(result, { status: 'waiting', queue_position: 1, delay_used: false });
    });
    await act(async () => { await result.current[3].requestDelay(); });
    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ delay_used: true }));
  });

  it('requestDelay is no-op when delay already used', async () => {
    const result = await boot();
    await act(async () => {
      // Use 'orange' status to avoid the auto-call effect also triggering updateDoc
      fireClientSnapshot(result, { status: 'orange', queue_position: 1, delay_used: true });
    });
    vi.mocked(updateDoc).mockClear();
    await act(async () => { await result.current[3].requestDelay(); });
    expect(updateDoc).not.toHaveBeenCalled();
  });

  // ─── writeHistory ──────────────────────────────────────────────

  it('writeHistory adds history doc on leave when client exists', async () => {
    const mockBatch = { set: vi.fn(), update: vi.fn(), delete: vi.fn(), commit: vi.fn().mockResolvedValue({}) };
    (writeBatch as any).mockReturnValue(mockBatch);
    const result = await boot();
    await act(async () => {
      fireClientSnapshot(result, {
        status: 'waiting', queue_position: 2,
        timestamp:  { toMillis: () => 1000 },
        called_at:  { toMillis: () => 2000 },
        claimed_at: { toMillis: () => 3000 },
        delay_used: false,
      });
    });
    await act(async () => { await result.current[3].leave('left_voluntarily'); });
    expect(mockBatch.set).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ exit_reason: 'left_voluntarily' }));
    expect(mockBatch.update).not.toHaveBeenCalled();
  });

  it('writeHistory includes rating data when done with rating', async () => {
    const mockBatch = { set: vi.fn(), update: vi.fn(), delete: vi.fn(), commit: vi.fn().mockResolvedValue({}) };
    (writeBatch as any).mockReturnValue(mockBatch);
    const result = await boot();
    await act(async () => {
      fireClientSnapshot(result, { status: 'claimed', queue_position: 1, delay_used: false });
    });
    await act(async () => {
      await result.current[3].done('completed', { rating: 4, feedback: 'Super !' });
    });
    expect(mockBatch.set).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ rating: 4, feedback: 'Super !' }));
    expect(mockBatch.update).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ rating_count: expect.anything(), rating_sum: expect.anything() }));
  });
});
