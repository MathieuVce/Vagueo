import { useState, useEffect, useCallback } from 'react';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import {
  doc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  collection,
  query,
  where,
  deleteField,
  runTransaction,
  getDocs,
  writeBatch,
  increment,
} from 'firebase/firestore';
import { auth, db } from '../firebase.ts';
import {
  WAVE_SIZE,
  WAVE_LEAD,
  CALL_AHEAD_WAVES,
  DELAY_WAVES,
  STAND_ID,
  EMA_ALPHA,
  EMA_OUTLIER_FACTOR,
  HEARTBEAT_INTERVAL_MS,
  FLOW_RATE_DEFAULT,
  FLOW_SLOW_DEFAULT,
  FLOW_SPRINT_DEFAULT,
  calcMinPerPerson,
} from '../tokens.ts';
import type { Stand, QueueEntry, ExitReason } from '../types.ts';

export type ClientStep = 'loading' | 'splash' | 'waiting' | 'checkin' | 'validation';

export interface DerivedValues {
  estimatedMin: number;
  waitingStatus: 'red' | 'orange';
  wavesAhead: number;
}

export interface RatingData {
  rating: number;
  feedback?: string;
}

export interface ClientActions {
  join: () => Promise<void>;
  requestDelay: () => Promise<void>;
  leave: (reason?: ExitReason) => Promise<void>;
  confirmPresence: () => Promise<void>;
  done: (reason?: ExitReason, ratingData?: RatingData) => Promise<void>;
  extend: () => Promise<void>;
  restart: () => Promise<void>;
  // Dev uniquement : force le statut de SA propre session pour atteindre un écran.
  devSet: (target: 'waiting' | 'orange' | 'claimed') => Promise<void>;
}

// Returns [client, step, derived, actions]
//
// step: 'loading' | 'splash' | 'waiting' | 'checkin' | 'validation'
// derived: { estimatedMin, waitingStatus: 'red'|'orange', positionAhead }
//
// Architecture:
//   Each client gets an atomic queue_position (counter on the stand doc).
//   positionAhead = number of active clients with a lower position.
//   → Updates automatically whenever someone leaves (their queue doc is deleted).
//   → Concurrent joins get unique positions via Firestore transaction.
export function useClientSession(
  stand: Stand | null,
): [QueueEntry | null, ClientStep, DerivedValues, ClientActions] {
  const [uid, setUid] = useState<string | null>(null);
  const [client, setClient] = useState<QueueEntry | null>(null);
  const [authReady, setReady] = useState(false);

  const standRef = doc(db, 'stands', STAND_ID || '__no_stand__');
  const historyCol = collection(db, 'stands', STAND_ID || '__no_stand__', 'history');

  // ─── Anonymous auth ────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUid(user.uid);
      } else {
        const c = await signInAnonymously(auth);
        setUid(c.user.uid);
      }
      setReady(true);
    });
    return unsub;
  }, []);

  // ─── Listen to own queue doc ───────────────────────────────────
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(doc(db, 'queue', uid), (snap) => {
      setClient(snap.exists() ? (snap.data() as QueueEntry) : null);
    });
  }, [uid]);

  // ─── Auto-call : passage en orange « une vague à l'avance » ────
  // Plus de seuil position × temps : le client passe en orange dès que sa vague
  // est à ≤ CALL_AHEAD_WAVES de la vague en cours (current_wave). La couleur
  // anti-fraude (live, dérivée de current_wave) se synchronise quand sa vague
  // devient courante.
  useEffect(() => {
    if (!uid || !client || client.status !== 'waiting' || client.called_at) return;
    if (client.wave_number == null) return;
    const cw = stand?.current_wave ?? 0;
    if (client.wave_number - cw <= CALL_AHEAD_WAVES) {
      void updateDoc(doc(db, 'queue', uid), {
        status: 'orange',
        called_at: serverTimestamp(),
      });
    }
  }, [stand?.current_wave, client?.status, client?.wave_number, uid]);

  // ─── Heartbeat de présence ─────────────────────────────────────
  // Tant que le client est en file (waiting/orange/claimed) et que l'onglet est
  // visible, on rafraîchit last_seen. Le reaper vendeur s'en sert pour purger
  // précisément les onglets fermés (cf. useQueueReaper). On ne bat pas en
  // arrière-plan : les navigateurs y bridant les timers, ce serait peu fiable.
  useEffect(() => {
    const status = client?.status;
    if (!uid || (status !== 'waiting' && status !== 'orange' && status !== 'claimed')) return;
    const beat = () => {
      if (document.hidden) return;
      void updateDoc(doc(db, 'queue', uid), { last_seen: serverTimestamp() });
    };
    beat(); // immédiat à l'entrée et à chaque changement de statut
    const id = setInterval(beat, HEARTBEAT_INTERVAL_MS);
    document.addEventListener('visibilitychange', beat);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', beat);
    };
  }, [uid, client?.status]);

  // ─── History write ─────────────────────────────────────────────
  // On completed service: uses a transaction to atomically read the current EMA,
  // compute the new blend, and write history + stand update together.
  // On other exits: simple batch (no stand update needed beyond optional rating).
  async function writeHistory(
    reason: ExitReason,
    currentClient: QueueEntry | null,
    ratingData?: RatingData,
  ) {
    const c = currentClient || client;
    if (!uid || !c) return;
    const nowMs = Date.now();
    const record: Record<string, unknown> = {
      uid,
      exit_reason: reason,
      joined_at: c.timestamp ?? null,
      called_at: c.called_at ?? null,
      claimed_at: c.claimed_at ?? null,
      done_at: serverTimestamp(),
      delay_used: c.delay_used ?? false,
    };
    if (ratingData) {
      record.rating = ratingData.rating;
      record.feedback = ratingData.feedback ?? '';
    }
    try {
      if (c.called_at && c.timestamp)
        record.wait_ms = c.called_at.toMillis() - c.timestamp.toMillis();
      if (c.claimed_at) record.service_ms = nowMs - c.claimed_at.toMillis();
    } catch (_) {}

    const serviceMsValue = record.service_ms as number | undefined;
    const shouldLearnEMA = reason === 'completed' && serviceMsValue != null && serviceMsValue > 0;

    if (shouldLearnEMA) {
      // Atomically read EMA state, blend with slider base, persist.
      const histRef = doc(historyCol);
      await runTransaction(db, async (tx) => {
        const standSnap = await tx.get(standRef);
        const d = standSnap.data() ?? {};
        const sliderBase = calcMinPerPerson(
          (d.flow_rate as number | undefined) ?? FLOW_RATE_DEFAULT,
          (d.flow_slow as number | undefined) ?? FLOW_SLOW_DEFAULT,
          (d.flow_sprint as number | undefined) ?? FLOW_SPRINT_DEFAULT,
        );
        // Plafond anti-aberration : un service ne pèse pas plus de EMA_OUTLIER_FACTOR×
        // la référence (EMA en place, ou base du slider pour les premiers services).
        // Neutralise un client qui laisse l'écran ouvert sans cliquer « terminé »
        // (service_ms gonflé à plusieurs heures).
        const reference = (d.service_ms_ema as number | undefined) ?? sliderBase * 60_000;
        const learnMs = Math.min(serviceMsValue!, EMA_OUTLIER_FACTOR * reference);
        const prevEma = (d.service_ms_ema as number | undefined) ?? learnMs;
        const count = ((d.service_count as number | undefined) ?? 0) + 1;
        const newEma = EMA_ALPHA * learnMs + (1 - EMA_ALPHA) * prevEma;
        const emaMins = newEma / 60_000;
        // Weight increases from 0 → 80 % over the first 30 services, then stays at 80 %.
        const weight = Math.min(0.8, count / 30);
        const newMinPerPerson = +(weight * emaMins + (1 - weight) * sliderBase).toFixed(2);
        tx.set(histRef, record);
        tx.update(standRef, {
          service_ms_ema: newEma,
          service_count: count,
          min_per_person: newMinPerPerson,
          ...(ratingData
            ? { rating_count: increment(1), rating_sum: increment(ratingData.rating) }
            : {}),
        });
      });
    } else {
      const batch = writeBatch(db);
      batch.set(doc(historyCol), record);
      if (ratingData) {
        batch.update(standRef, {
          rating_count: increment(1),
          rating_sum: increment(ratingData.rating),
        });
      }
      await batch.commit();
    }
  }

  // ─── Actions ───────────────────────────────────────────────────

  // Affectation hybride à une vague (transaction atomique) : la vague
  // d'assemblage suit current_wave (fenêtre de temps), plafonnée à WAVE_SIZE
  // (le surplus déborde sur la vague suivante). Pas de numéro individuel.
  const join = useCallback(async () => {
    if (!uid || !stand || !stand.is_open || stand.is_paused) return;
    if (stand.max_queue_size != null && stand.max_queue_size > 0) {
      const snap = await getDocs(
        query(
          collection(db, 'queue'),
          where('stand_id', '==', STAND_ID),
          where('status', 'in', ['waiting', 'orange', 'claimed']),
        ),
      );
      if (snap.size >= stand.max_queue_size) return;
    }
    await runTransaction(db, async (tx) => {
      const s = (await tx.get(standRef)).data() ?? {};
      const cw = (s.current_wave as number | undefined) ?? 0;
      const base = cw + WAVE_LEAD; // vague la plus tôt rejoignable
      let fillWave = (s.fill_wave as number | undefined) ?? 0;
      let fillCount = (s.fill_count as number | undefined) ?? 0;
      if (fillWave < base) {
        // la vague a avancé depuis le dernier ajout → nouvelle fenêtre de temps
        fillWave = base;
        fillCount = 0;
      }
      if (fillCount >= WAVE_SIZE) {
        // plafond hybride atteint → on ouvre la vague suivante
        fillWave += 1;
        fillCount = 0;
      }
      fillCount += 1;
      tx.update(standRef, { fill_wave: fillWave, fill_count: fillCount });
      tx.set(doc(db, 'queue', uid), {
        uid,
        stand_id: STAND_ID,
        wave_number: fillWave,
        status: 'waiting',
        has_confirmed_presence: false,
        delay_used: false,
        timestamp: serverTimestamp(),
      });
    });
  }, [uid, stand]);

  // Décale le client de DELAY_WAVES vague(s), derrière la vague en assemblage
  // (utilisable une seule fois).
  const requestDelay = useCallback(async () => {
    if (!uid || !client || client.delay_used) return;
    if (stand?.max_delayed != null && stand.max_delayed > 0) {
      const delaySnap = await getDocs(
        query(
          collection(db, 'queue'),
          where('stand_id', '==', STAND_ID),
          where('delay_used', '==', true),
          where('status', 'in', ['waiting', 'orange', 'claimed']),
        ),
      );
      if (delaySnap.size >= stand.max_delayed) return;
    }
    const cw = stand?.current_wave ?? 0;
    const fillWave = stand?.fill_wave ?? cw + WAVE_LEAD;
    const newWave = Math.max(client.wave_number ?? cw, fillWave) + DELAY_WAVES;
    await updateDoc(doc(db, 'queue', uid), {
      wave_number: newWave,
      delay_used: true,
      status: 'waiting',
      called_at: deleteField(),
    });
  }, [uid, client, stand]);

  const leave = useCallback(
    async (reason: ExitReason = 'left_voluntarily') => {
      if (!uid) return;
      try {
        await writeHistory(reason, client);
      } catch (e) {
        console.warn('writeHistory:', e);
      }
      await deleteDoc(doc(db, 'queue', uid));
    },
    [uid, client],
  );

  const confirmPresence = useCallback(async () => {
    if (!uid) return;
    await updateDoc(doc(db, 'queue', uid), {
      has_confirmed_presence: true,
      status: 'claimed',
      claimed_at: serverTimestamp(),
    });
  }, [uid]);

  const done = useCallback(
    async (reason: ExitReason = 'completed', ratingData?: RatingData) => {
      if (!uid) return;
      try {
        await writeHistory(reason, client, ratingData);
      } catch (e) {
        console.warn('writeHistory:', e);
      }
      await deleteDoc(doc(db, 'queue', uid));
    },
    [uid, client],
  );

  const extend = useCallback(async () => {
    if (!uid) return;
    await updateDoc(doc(db, 'queue', uid), { claimed_at: serverTimestamp() });
  }, [uid]);

  const restart = useCallback(async () => {
    if (!uid) return;
    await deleteDoc(doc(db, 'queue', uid));
  }, [uid]);

  // Dev : place sa propre session sur l'écran voulu en éditant son doc queue
  // (autorisé par les règles : un client peut écrire son propre doc). bleu =
  // 'waiting' (2 vagues d'écart), orange = 'orange', validation = 'claimed'.
  const devSet = useCallback(
    async (target: 'waiting' | 'orange' | 'claimed') => {
      if (!uid) return;
      const cw = stand?.current_wave ?? 0;
      const ref = doc(db, 'queue', uid);
      if (target === 'waiting') {
        await updateDoc(ref, { status: 'waiting', wave_number: cw + 2, called_at: deleteField() });
      } else if (target === 'orange') {
        await updateDoc(ref, {
          status: 'orange',
          wave_number: cw + 1,
          called_at: serverTimestamp(),
        });
      } else {
        await updateDoc(ref, { status: 'claimed', claimed_at: serverTimestamp() });
      }
    },
    [uid, stand?.current_wave],
  );

  // ─── Derived values ────────────────────────────────────────────
  const step = deriveStep(client, authReady);
  const oneWaveMin = WAVE_SIZE * (stand?.min_per_person ?? 3); // durée d'écoulement d'une vague (min)
  const currentWave = stand?.current_wave ?? 0;
  const wavesAhead =
    client?.wave_number != null ? Math.max(0, client.wave_number - currentWave) : 0;
  // Attente = vagues devant × durée d'une vague (mise à jour temps réel)
  const estimatedMin = Math.max(1, Math.round(wavesAhead * oneWaveMin));
  const waitingStatus: 'red' | 'orange' = wavesAhead <= CALL_AHEAD_WAVES ? 'orange' : 'red';

  return [
    client,
    step,
    { estimatedMin, waitingStatus, wavesAhead },
    { join, requestDelay, leave, confirmPresence, done, extend, restart, devSet },
  ];
}

function deriveStep(client: QueueEntry | null, authReady: boolean): ClientStep {
  if (!authReady) return 'loading';
  if (!client || client.status === 'done') return 'splash';
  if (client.status === 'claimed') return 'validation';
  if (client.status === 'orange') return 'checkin';
  return 'waiting';
}
