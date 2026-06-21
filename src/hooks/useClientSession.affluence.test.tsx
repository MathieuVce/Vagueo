import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useClientSession } from './useClientSession';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { onSnapshot, updateDoc, getDocs, deleteDoc, runTransaction } from 'firebase/firestore';
import { WAVE_SIZE, DELAY_WAVES } from '../tokens.ts';

// Parcours utilisateur de bout en bout (Firestore mocké) sur le modèle PAR VAGUES :
// pas de numéro individuel. Le client appartient à une vague (wave_number) ; il
// passe en orange « une vague à l'avance », c'est-à-dire quand
//   wave_number − current_wave ≤ CALL_AHEAD_WAVES (= 1)
// current_wave vient du stand (prop) ; wave_number du doc queue du client.

// Démarre le hook (auth anonyme, uid fixe) ; rerender permet de faire avancer
// la vague courante du stand.
async function boot(stand: Record<string, unknown>) {
  let authCb: (u: { uid: string } | null) => void = () => {};
  (onAuthStateChanged as any).mockImplementation((_: unknown, cb: typeof authCb) => {
    authCb = cb;
    return () => {};
  });
  const { result, rerender } = renderHook(
    ({ s }: { s: Record<string, unknown> }) => useClientSession(s as any),
    { initialProps: { s: stand } },
  );
  await act(async () => {
    authCb({ uid: 'uid1' });
  });
  return { result, rerender };
}

// Émet un snapshot sur le doc queue/uid1 du client (son propre état).
function fireOwnDoc(data: Record<string, unknown> | null) {
  const snap = data
    ? { exists: () => true, data: () => data }
    : { exists: () => false, data: () => null };
  for (const [ref, cb] of (onSnapshot as any).mock.calls) {
    if (ref && ref.path === 'queue' && ref.id === 'uid1') cb(snap);
  }
}

function orangeTriggered(): boolean {
  return (updateDoc as any).mock.calls.some(
    ([, data]: [unknown, Record<string, unknown>]) => data && data.status === 'orange',
  );
}

// Entre en file (waiting) dans la vague donnée.
async function enterWave(waveNumber: number, extra: Record<string, unknown> = {}) {
  await act(async () => {
    fireOwnDoc({ status: 'waiting', wave_number: waveNumber, delay_used: false, ...extra });
  });
}

// Pilote un service « completed » avec un état stand donné et un temps de service
// fixé, et capture l'objet écrit sur le stand par la transaction d'apprentissage.
async function captureEmaUpdate(
  standData: Record<string, unknown>,
  serviceMs: number,
): Promise<Record<string, unknown>> {
  const NOW = 1_700_000_000_000;
  const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(NOW);
  let captured: Record<string, unknown> = {};
  (runTransaction as any).mockImplementation(async (_db: unknown, cb: any) => {
    const tx = {
      get: vi.fn().mockResolvedValue({ exists: () => true, data: () => standData }),
      set: vi.fn(),
      update: vi.fn((_ref: unknown, data: Record<string, unknown>) => {
        captured = data;
      }),
      delete: vi.fn(),
    };
    return cb(tx);
  });
  const { result } = await boot({ is_open: true, min_per_person: 3 });
  await act(async () => {
    fireOwnDoc({
      status: 'claimed',
      wave_number: 1,
      delay_used: false,
      claimed_at: { toMillis: () => NOW - serviceMs },
    });
  });
  await act(async () => {
    await result.current[3].done('completed');
  });
  nowSpy.mockRestore();
  return captured;
}

// Pilote un join et capture le doc queue écrit (wave_number) + l'update du stand.
async function captureJoin(
  stand: Record<string, unknown>,
): Promise<{ set: Record<string, unknown>; update: Record<string, unknown> }> {
  let set: Record<string, unknown> = {};
  let update: Record<string, unknown> = {};
  (runTransaction as any).mockImplementation(async (_db: unknown, cb: any) => {
    const tx = {
      get: vi.fn().mockResolvedValue({ exists: () => true, data: () => stand }),
      set: vi.fn((_ref: unknown, d: Record<string, unknown>) => {
        set = d;
      }),
      update: vi.fn((_ref: unknown, d: Record<string, unknown>) => {
        update = d;
      }),
      delete: vi.fn(),
    };
    return cb(tx);
  });
  const { result } = await boot(stand);
  await act(async () => {
    await result.current[3].join();
  });
  return { set, update };
}

beforeEach(() => {
  vi.clearAllMocks();
  (signInAnonymously as any).mockResolvedValue({ user: { uid: 'anon' } });
  (getDocs as any).mockResolvedValue({ size: 0, docs: [] });
});

describe('useClientSession — première vague & affectation hybride', () => {
  it('le tout premier client est affecté à la vague courante (0), pas la vague 1', async () => {
    const { set, update } = await captureJoin({
      is_open: true,
      min_per_person: 3,
      current_wave: 0,
      fill_wave: 0,
      fill_count: 0,
    });
    expect(set.wave_number).toBe(0); // WAVE_LEAD=0 → groupe servi = current_wave
    expect(update.fill_wave).toBe(0);
    expect(update.fill_count).toBe(1);
  });

  it('le premier client passe orange immédiatement (wavesAhead 0)', async () => {
    await boot({ is_open: true, min_per_person: 3, current_wave: 0 });
    await enterWave(0);
    expect(orangeTriggered()).toBe(true);
  });

  it('pas d’inflation d’estimation : le 6e client (vague suivante) attend une seule vague', async () => {
    // 6e arrivant = vague 1 (la 0 est pleine), current_wave 0 → wavesAhead 1
    const { result } = await boot({ is_open: true, min_per_person: 3, current_wave: 0 });
    await enterWave(1);
    expect(result.current[2].wavesAhead).toBe(1);
    expect(result.current[2].estimatedMin).toBe(1 * WAVE_SIZE * 3); // 15 min, pas 30
  });

  it('plafond WAVE_SIZE : le 6e client déborde sur la vague suivante', async () => {
    const { set } = await captureJoin({
      is_open: true,
      min_per_person: 3,
      current_wave: 0,
      fill_wave: 0,
      fill_count: WAVE_SIZE,
    });
    expect(set.wave_number).toBe(1);
  });

  it('nouvelle fenêtre de temps : repart de la vague courante quand elle a avancé', async () => {
    const { set } = await captureJoin({
      is_open: true,
      min_per_person: 3,
      current_wave: 4,
      fill_wave: 2, // ancienne vague d'assemblage, dépassée
      fill_count: 3,
    });
    expect(set.wave_number).toBe(4); // repart de current_wave
  });
});

describe("useClientSession — passage en orange (une vague à l'avance)", () => {
  it('orange quand la vague du client est à 1 de la vague courante', async () => {
    await boot({ is_open: true, min_per_person: 3, current_wave: 0 });
    await enterWave(1); // 1 − 0 = 1 ≤ 1
    expect(orangeTriggered()).toBe(true);
  });

  it('reste rouge quand la vague est à 2 ou plus', async () => {
    await boot({ is_open: true, min_per_person: 3, current_wave: 0 });
    await enterWave(2); // 2 − 0 = 2 > 1
    expect(orangeTriggered()).toBe(false);
  });

  it('indépendant du numéro de vague courant', async () => {
    await boot({ is_open: true, min_per_person: 3, current_wave: 5 });
    await enterWave(6); // 6 − 5 = 1 ≤ 1
    expect(orangeTriggered()).toBe(true);
  });

  it('ne redéclenche pas orange si le client est déjà appelé (called_at présent)', async () => {
    await boot({ is_open: true, min_per_person: 3, current_wave: 0 });
    await enterWave(0, { called_at: { toMillis: () => 1 } }); // sinon déclencherait
    expect(orangeTriggered()).toBe(false);
  });
});

describe('useClientSession — attente estimée selon affluence', () => {
  // estimatedMin = vagues devant × durée d'une vague (WAVE_SIZE × min/personne).
  const cases = [
    { aff: 'forte affluence', minPP: 5 },
    { aff: 'flux normal', minPP: 3 },
    { aff: 'faible affluence', minPP: 1 },
  ];

  it.each(cases)('$aff : estimation = vagues devant × (WAVE_SIZE × $minPP)', async ({ minPP }) => {
    const { result } = await boot({ is_open: true, min_per_person: minPP, current_wave: 0 });
    await enterWave(3); // 3 vagues devant (pas d'orange)
    expect(result.current[2].wavesAhead).toBe(3);
    expect(result.current[2].estimatedMin).toBe(3 * WAVE_SIZE * minPP);
    expect(result.current[2].waitingStatus).toBe('red');
  });

  it('plancher l’attente à 1 min quand la vague du client est la vague courante', async () => {
    const { result } = await boot({ is_open: true, min_per_person: 3, current_wave: 5 });
    await enterWave(5); // wavesAhead = 0
    expect(result.current[2].wavesAhead).toBe(0);
    expect(result.current[2].estimatedMin).toBe(1);
    expect(result.current[2].waitingStatus).toBe('orange');
  });
});

describe('useClientSession — parcours complet en file', () => {
  it('rejoindre → attente → orange auto (la vague avance) → présent → terminé', async () => {
    const { result, rerender } = await boot({ is_open: true, min_per_person: 3, current_wave: 0 });

    // 1. Rejoindre (transaction atomique d'affectation à une vague)
    await act(async () => {
      await result.current[3].join();
    });
    expect(runTransaction).toHaveBeenCalled();

    // 2. En file, vague 2 alors que la courante est 0 → 2 d'écart → attente
    await enterWave(2);
    expect(result.current[1]).toBe('waiting');
    expect(orangeTriggered()).toBe(false);

    // 3. La vague avance (0 → 1) → 1 d'écart → passage automatique en orange
    await act(async () => {
      rerender({ s: { is_open: true, min_per_person: 3, current_wave: 1 } });
    });
    expect(orangeTriggered()).toBe(true);

    // 4. Firestore reflète l'orange → étape « checkin »
    await act(async () => {
      fireOwnDoc({ status: 'orange', wave_number: 2, called_at: { toMillis: () => 1 } });
    });
    expect(result.current[1]).toBe('checkin');

    // 5. Le client confirme sa présence
    await act(async () => {
      await result.current[3].confirmPresence();
    });
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'claimed' }),
    );

    // 6. claimed → étape « validation »
    await act(async () => {
      fireOwnDoc({ status: 'claimed', wave_number: 2, claimed_at: { toMillis: () => 1 } });
    });
    expect(result.current[1]).toBe('validation');

    // 7. Service terminé → suppression du doc queue
    await act(async () => {
      await result.current[3].done('completed');
    });
    expect(deleteDoc).toHaveBeenCalled();
  });

  it('file fermée : rejoindre est un no-op (pas de transaction)', async () => {
    const { result } = await boot({ is_open: false, min_per_person: 3, current_wave: 0 });
    await act(async () => {
      await result.current[3].join();
    });
    expect(runTransaction).not.toHaveBeenCalled();
  });
});

describe('useClientSession — décalage de vague & apprentissage EMA', () => {
  it('décaler repousse le client derrière la vague en assemblage (+ DELAY_WAVES)', async () => {
    const { result } = await boot({
      is_open: true,
      min_per_person: 3,
      current_wave: 0,
      fill_wave: 7,
    });
    await act(async () => {
      fireOwnDoc({ status: 'waiting', wave_number: 2, delay_used: false });
    });
    await act(async () => {
      await result.current[3].requestDelay();
    });
    // newWave = max(wave 2, fill_wave 7) + DELAY_WAVES
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ wave_number: 7 + DELAY_WAVES, delay_used: true }),
    );
  });

  it('apprentissage EMA : mélange le temps de service mesuré avec la base du slider', async () => {
    // EMA précédent = 3 min (180 000), service mesuré = 5 min (300 000)
    const captured = await captureEmaUpdate(
      { service_ms_ema: 180_000, service_count: 9, flow_rate: 3, flow_slow: 5, flow_sprint: 1 },
      300_000,
    );
    // newEma = 0,2×300000 + 0,8×180000 = 204000 ; count = 10 → poids 0,3333
    // min/personne = 0,3333×3,4 + 0,6667×3 = 3,13
    expect(captured.service_ms_ema).toBe(204_000);
    expect(captured.service_count).toBe(10);
    expect(captured.min_per_person).toBeCloseTo(3.13, 2);
  });

  it('plafonne un service aberrant (onglet laissé ouvert) avant l’apprentissage', async () => {
    // EMA en place = 3 min (180 000). Service mesuré = 2 h → plafonné à 3×180000 = 540000.
    const captured = await captureEmaUpdate(
      { service_ms_ema: 180_000, service_count: 9, flow_rate: 3, flow_slow: 5, flow_sprint: 1 },
      2 * 60 * 60 * 1000, // 2 h
    );
    // newEma = 0,2×540000 + 0,8×180000 = 252000 ; min/personne reste réaliste (≈ 3,4)
    expect(captured.service_ms_ema).toBe(252_000);
    expect(captured.min_per_person).toBeCloseTo(3.4, 2);
  });

  it('plafonne aussi le tout premier service (sans EMA) sur la base du slider', async () => {
    // Pas d'EMA encore : référence = base slider (3 min = 180000) → plafond 540000.
    const captured = await captureEmaUpdate(
      { flow_rate: 3, flow_slow: 5, flow_sprint: 1 }, // service_count absent → 0
      2 * 60 * 60 * 1000,
    );
    // learnMs = 540000, prevEma = 540000, count = 1 → newEma = 540000
    expect(captured.service_ms_ema).toBe(540_000);
    // poids = 1/30 ≈ 0,0333 → min/personne ≈ 0,0333×9 + 0,9667×3 = 3,2
    expect(captured.min_per_person).toBeCloseTo(3.2, 2);
  });
});
