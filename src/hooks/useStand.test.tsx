import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useStand } from './useStand';
import { onSnapshot, updateDoc, setDoc, increment, deleteField } from 'firebase/firestore';

describe('useStand', () => {
  // Boots the hook, optionally fires a snapshot with stand data
  function boot(standData?: Record<string, unknown>) {
    let snapCb: ((snap: any) => void) | undefined;
    (onSnapshot as any).mockImplementation((_ref: any, cb: any) => {
      snapCb = cb;
      return () => {};
    });
    const { result } = renderHook(() => useStand());
    if (standData !== undefined) {
      act(() => { snapCb?.({ exists: () => true, data: () => standData }); });
    }
    return result;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Snapshot ─────────────────────────────────────────────────

  it('stand is null before snapshot fires', () => {
    const result = boot();
    expect(result.current[0]).toBeNull();
  });

  it('sets stand data with secure_color from snapshot', () => {
    const result = boot({ current_wave: 5, is_open: true });
    expect(result.current[0]).toMatchObject({
      current_wave: 5,
      is_open: true,
      secure_color: expect.any(String),
    });
  });

  it('auto-creates stand when not exists and autoCreate=true', async () => {
    let snapCb: any;
    (onSnapshot as any).mockImplementation((_ref: any, cb: any) => { snapCb = cb; return () => {}; });
    renderHook(() => useStand({ autoCreate: true }));
    await act(async () => { await snapCb({ exists: () => false }); });
    expect(setDoc).toHaveBeenCalled();
  });

  it('does not create stand when not exists and autoCreate=false', async () => {
    let snapCb: any;
    (onSnapshot as any).mockImplementation((_ref: any, cb: any) => { snapCb = cb; return () => {}; });
    renderHook(() => useStand());
    await act(async () => { await snapCb({ exists: () => false }); });
    expect(setDoc).not.toHaveBeenCalled();
  });

  // ─── advance ──────────────────────────────────────────────────

  it('advance calls updateDoc with increment(1)', async () => {
    const result = boot({ current_wave: 0 });
    await act(async () => { await result.current[1].advance(); });
    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), { current_wave: increment(1) });
  });

  // ─── togglePause ──────────────────────────────────────────────

  it('togglePause flips is_paused', async () => {
    const result = boot({ is_paused: false });
    await act(async () => { await result.current[1].togglePause(); });
    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), { is_paused: true });
  });

  it('togglePause is no-op when stand is null', async () => {
    const result = boot();
    await act(async () => { await result.current[1].togglePause(); });
    expect(updateDoc).not.toHaveBeenCalled();
  });

  // ─── toggleOpen ───────────────────────────────────────────────

  it('toggleOpen flips is_open', async () => {
    const result = boot({ is_open: true });
    await act(async () => { await result.current[1].toggleOpen(); });
    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), { is_open: false });
  });

  it('toggleOpen is no-op when stand is null', async () => {
    const result = boot();
    await act(async () => { await result.current[1].toggleOpen(); });
    expect(updateDoc).not.toHaveBeenCalled();
  });

  // ─── setFlowRate ──────────────────────────────────────────────

  it('setFlowRate updates flow_rate and min_per_person', async () => {
    const result = boot({ flow_rate: 3, flow_slow: 5, flow_sprint: 1 });
    await act(async () => { await result.current[1].setFlowRate(1); }); // 3+1=4
    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      flow_rate: 4,
      min_per_person: expect.any(Number),
    }));
  });

  it('setFlowRate clamps at max 5', async () => {
    const result = boot({ flow_rate: 5, flow_slow: 5, flow_sprint: 1 });
    await act(async () => { await result.current[1].setFlowRate(2); });
    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ flow_rate: 5 }));
  });

  it('setFlowRate clamps at min 1', async () => {
    const result = boot({ flow_rate: 1, flow_slow: 5, flow_sprint: 1 });
    await act(async () => { await result.current[1].setFlowRate(-2); });
    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ flow_rate: 1 }));
  });

  it('setFlowRate is no-op when stand is null', async () => {
    const result = boot();
    await act(async () => { await result.current[1].setFlowRate(1); });
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it('setFlowRate resets EMA: deleteField sur service_ms_ema et service_count à 0', async () => {
    const result = boot({ flow_rate: 3, flow_slow: 5, flow_sprint: 1, service_ms_ema: 120_000, service_count: 10 });
    await act(async () => { await result.current[1].setFlowRate(1); });
    expect(deleteField).toHaveBeenCalled();
    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      service_count: 0,
      flow_rate: 4,
    }));
  });

  // ─── configure ────────────────────────────────────────────────

  it('configure calls updateDoc with all params (trimming names)', async () => {
    const result = boot({ flow_rate: 3 });
    await act(async () => {
      await result.current[1].configure({
        name: ' Mon Stand ', logoUrl: 'https://img.com/logo.png',
        address: 'B12 ', isOpen: true,
        flowSlow: 5, flowSprint: 1,
        maxQueueSize: 20, maxDelayed: 3, callAheadMin: 8,
      });
    });
    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      name: 'Mon Stand',
      address: 'B12',
      is_open: true,
      max_queue_size: 20,
      max_delayed: 3,
    }));
  });

  it('configure passes null limits through', async () => {
    const result = boot({ flow_rate: 3 });
    await act(async () => {
      await result.current[1].configure({
        name: 'Stand', logoUrl: '', address: '', isOpen: false,
        flowSlow: 5, flowSprint: 1,
        maxQueueSize: null, maxDelayed: null, callAheadMin: 8,
      });
    });
    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      max_queue_size: null,
      max_delayed: null,
    }));
  });

  it('configure falls back to FLOW defaults when flowSlow/flowSprint are 0', async () => {
    const result = boot({ flow_rate: 3 });
    await act(async () => {
      await result.current[1].configure({
        name: 'Stand', logoUrl: '', address: '', isOpen: false,
        flowSlow: 0, flowSprint: 0,
        maxQueueSize: null, maxDelayed: null, callAheadMin: 8,
      });
    });
    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      flow_slow:   expect.any(Number),
      flow_sprint: expect.any(Number),
    }));
  });

  // ─── claimStand ───────────────────────────────────────────────

  it('claimStand calls updateDoc with uid and email', async () => {
    const result = boot({ current_wave: 0 }); // no vendor_uid
    await act(async () => {
      await result.current[1].claimStand('uid123', 'vendor@test.com');
    });
    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), {
      vendor_uid:   'uid123',
      vendor_email: 'vendor@test.com',
    });
  });

  it('claimStand uses empty string when email is null', async () => {
    const result = boot({ current_wave: 0 });
    await act(async () => {
      await result.current[1].claimStand('uid123', null);
    });
    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), {
      vendor_uid:   'uid123',
      vendor_email: '',
    });
  });

  it('claimStand is no-op when stand already has vendor_uid', async () => {
    const result = boot({ vendor_uid: 'existing-owner' });
    await act(async () => {
      await result.current[1].claimStand('uid123', 'v@test.com');
    });
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it('claimStand is no-op when stand is null', async () => {
    const result = boot();
    await act(async () => {
      await result.current[1].claimStand('uid123', 'v@test.com');
    });
    expect(updateDoc).not.toHaveBeenCalled();
  });
});
