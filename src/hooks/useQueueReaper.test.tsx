import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useQueueReaper } from './useQueueReaper';
import { getDocs, writeBatch } from 'firebase/firestore';
import {
  calcServiceStaleMs,
  ORANGE_STALE_MS,
  WAITING_STALE_MS,
  HEARTBEAT_STALE_MS,
  REAPER_INTERVAL_MS,
} from '../tokens.ts';

// Filet de sécurité vendeur : purge des clients « fantômes » (onglet fermé sans
// clic). Firestore mocké : on asserte les écritures (set historique + delete).
describe('useQueueReaper', () => {
  const NOW = 1_700_000_000_000;
  let mockBatch: { set: any; update: any; delete: any; commit: any };

  const ts = (ms: number) => ({ toMillis: () => ms });

  beforeEach(() => {
    vi.clearAllMocks();
    mockBatch = {
      set: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      commit: vi.fn().mockResolvedValue({}),
    };
    (writeBatch as any).mockReturnValue(mockBatch);
    (getDocs as any).mockResolvedValue({ docs: [] });
  });

  it('purge les fantômes (servi jamais terminé, appelé sans réponse) et garde les actifs', async () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(NOW);
    (getDocs as any).mockResolvedValue({
      docs: [
        // claimed depuis plus que le seuil de service → timeout_service
        {
          id: 'ghost-service',
          data: () => ({
            status: 'claimed',
            claimed_at: ts(NOW - calcServiceStaleMs(3) - 1000),
            timestamp: ts(NOW - 3_600_000),
            called_at: ts(NOW - 3_000_000),
          }),
        },
        // claimed récent → conservé
        { id: 'busy-service', data: () => ({ status: 'claimed', claimed_at: ts(NOW - 1000) }) },
        // orange appelé sans réponse depuis longtemps → timeout_checkin
        {
          id: 'ghost-orange',
          data: () => ({
            status: 'orange',
            called_at: ts(NOW - ORANGE_STALE_MS - 1000),
            timestamp: ts(NOW - 600_000),
          }),
        },
        // orange récent → conservé
        { id: 'fresh-orange', data: () => ({ status: 'orange', called_at: ts(NOW - 1000) }) },
      ],
    });

    renderHook(() => useQueueReaper(true, 3, false));
    await waitFor(() => expect(mockBatch.commit).toHaveBeenCalledTimes(2));

    expect(mockBatch.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ exit_reason: 'timeout_service' }),
    );
    expect(mockBatch.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ exit_reason: 'timeout_checkin' }),
    );
    expect(mockBatch.delete).toHaveBeenCalledTimes(2);
    nowSpy.mockRestore();
  });

  it('purge un « waiting » abandonné (onglet fermé) après un délai très long', async () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(NOW);
    (getDocs as any).mockResolvedValue({
      docs: [
        // inscrit il y a très longtemps, jamais appelé → abandon
        {
          id: 'ghost-waiting',
          data: () => ({ status: 'waiting', timestamp: ts(NOW - WAITING_STALE_MS - 1000) }),
        },
        // inscrit récemment → conservé
        { id: 'patient', data: () => ({ status: 'waiting', timestamp: ts(NOW - 60_000) }) },
      ],
    });
    renderHook(() => useQueueReaper(true, 3, false));
    await waitFor(() => expect(mockBatch.commit).toHaveBeenCalledTimes(1));
    expect(mockBatch.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ exit_reason: 'timeout_waiting' }),
    );
    expect(mockBatch.delete).toHaveBeenCalledTimes(1);
    nowSpy.mockRestore();
  });

  it('heartbeat: purge un « claimed » dont l’onglet ne bat plus (même claimed_at récent)', async () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(NOW);
    (getDocs as any).mockResolvedValue({
      docs: [
        {
          id: 'closed-tab',
          data: () => ({
            status: 'claimed',
            claimed_at: ts(NOW - 30_000), // service récent…
            last_seen: ts(NOW - HEARTBEAT_STALE_MS - 1000), // …mais onglet muet → fermé
          }),
        },
      ],
    });
    renderHook(() => useQueueReaper(true, 3, false));
    await waitFor(() => expect(mockBatch.commit).toHaveBeenCalledTimes(1));
    expect(mockBatch.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ exit_reason: 'timeout_service' }),
    );
    nowSpy.mockRestore();
  });

  it('heartbeat: protège un service long tant que l’onglet bat (claimed_at ancien)', async () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(NOW);
    (getDocs as any).mockResolvedValue({
      docs: [
        {
          id: 'long-but-alive',
          data: () => ({
            status: 'claimed',
            claimed_at: ts(NOW - calcServiceStaleMs(3) - 60_000), // au-delà du seuil coarse…
            last_seen: ts(NOW - 1000), // …mais onglet vif → conservé
          }),
        },
      ],
    });
    renderHook(() => useQueueReaper(true, 3, false));
    await waitFor(() => expect(getDocs).toHaveBeenCalled());
    await Promise.resolve();
    expect(mockBatch.commit).not.toHaveBeenCalled();
    nowSpy.mockRestore();
  });

  it('ne fait rien quand le reaper est désactivé', async () => {
    renderHook(() => useQueueReaper(false, 3, false));
    await Promise.resolve();
    expect(getDocs).not.toHaveBeenCalled();
  });

  it('ne purge pas pendant une pause', async () => {
    renderHook(() => useQueueReaper(true, 3, true));
    await Promise.resolve();
    expect(getDocs).not.toHaveBeenCalled();
  });

  it('ne purge pas les services / appels récents', async () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(NOW);
    (getDocs as any).mockResolvedValue({
      docs: [
        { id: 'busy', data: () => ({ status: 'claimed', claimed_at: ts(NOW - 1000) }) },
        { id: 'fresh', data: () => ({ status: 'orange', called_at: ts(NOW - 1000) }) },
      ],
    });
    renderHook(() => useQueueReaper(true, 3, false));
    await waitFor(() => expect(getDocs).toHaveBeenCalled());
    await Promise.resolve();
    expect(mockBatch.commit).not.toHaveBeenCalled();
    nowSpy.mockRestore();
  });

  it('rebalaye à chaque intervalle', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    (getDocs as any).mockResolvedValue({ docs: [] });
    renderHook(() => useQueueReaper(true, 3, false));
    await vi.advanceTimersByTimeAsync(0); // passage immédiat
    const first = (getDocs as any).mock.calls.length;
    await vi.advanceTimersByTimeAsync(REAPER_INTERVAL_MS);
    expect((getDocs as any).mock.calls.length).toBeGreaterThan(first);
    vi.useRealTimers();
  });
});
