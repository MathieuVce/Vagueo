import { useState, useEffect, useCallback } from 'react';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import {
  doc, onSnapshot, updateDoc, addDoc,
  serverTimestamp, collection, query, where,
  deleteField, runTransaction, getDocs,
} from 'firebase/firestore';
import { auth, db } from '../firebase.ts';
import { WAVE_SIZE, STAND_ID } from '../tokens.ts';
import type { Stand, QueueEntry, ExitReason } from '../types.ts';

export type ClientStep = 'loading' | 'splash' | 'waiting' | 'checkin' | 'validation';

export interface DerivedValues {
  estimatedMin: number;
  waitingStatus: 'red' | 'orange';
  positionAhead: number;
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
}

// Returns [client, step, derived, actions]
//
// step: 'loading' | 'splash' | 'waiting' | 'checkin' | 'validation'
// derived: { estimatedMin, waitingStatus: 'red'|'orange', positionAhead }
//
// Architecture:
//   Each client gets an atomic queue_position (counter on the stand doc).
//   positionAhead = number of active clients with a lower position.
//   → Updates automatically whenever someone leaves (status→done drops out of the query).
//   → Concurrent joins get unique positions via Firestore transaction.
export function useClientSession(
  stand: Stand | null,
): [QueueEntry | null, ClientStep, DerivedValues, ClientActions] {
  const [uid,           setUid]           = useState<string | null>(null);
  const [client,        setClient]        = useState<QueueEntry | null>(null);
  const [authReady,     setReady]         = useState(false);
  const [positionAhead, setPositionAhead] = useState(0);

  const standRef   = doc(db, 'stands', STAND_ID);
  const historyCol = collection(db, 'stands', STAND_ID, 'history');

  // ─── Anonymous auth ────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) { setUid(user.uid); }
      else      { const c = await signInAnonymously(auth); setUid(c.user.uid); }
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

  // ─── Live position: active clients ahead of me ────────────────
  useEffect(() => {
    if (!uid || !client?.queue_position) { setPositionAhead(0); return; }
    const myPos = client.queue_position;
    // Fix #1: filter by stand_id to support multi-stand deployments
    const q = query(
      collection(db, 'queue'),
      where('stand_id', '==', STAND_ID),
      where('status', 'in', ['waiting', 'orange', 'claimed']),
    );
    return onSnapshot(q, (snap) => {
      const ahead = snap.docs.filter(
        d => d.id !== uid && (d.data().queue_position ?? 0) < myPos
      ).length;
      setPositionAhead(ahead);
    });
  }, [uid, client?.queue_position]);

  // ─── Auto-call when client enters the first wave batch ────────
  // Guard: skip if already called (prevents re-calling after delay re-entry)
  useEffect(() => {
    if (!uid || !client || client.status !== 'waiting' || client.called_at) return;
    if (positionAhead < WAVE_SIZE) {
      updateDoc(doc(db, 'queue', uid), {
        status:    'orange',
        called_at: serverTimestamp(),
      });
    }
  }, [positionAhead, client?.status, uid]);

  // ─── History write ─────────────────────────────────────────────
  async function writeHistory(reason: ExitReason, currentClient: QueueEntry | null, ratingData?: RatingData) {
    const c = currentClient || client;
    if (!uid || !c) return;
    const nowMs = Date.now();
    const record: Record<string, unknown> = {
      uid,
      exit_reason:  reason,
      joined_at:    c.timestamp  ?? null,
      called_at:    c.called_at  ?? null,
      claimed_at:   c.claimed_at ?? null,
      done_at:      serverTimestamp(),
      delay_used:   c.delay_used ?? false,
    };
    if (ratingData) {
      record.rating   = ratingData.rating;
      record.feedback = ratingData.feedback ?? '';
    }
    try {
      if (c.called_at && c.timestamp)
        record.wait_ms = c.called_at.toMillis() - c.timestamp.toMillis();
      if (c.claimed_at)
        record.service_ms = nowMs - c.claimed_at.toMillis();
    } catch (_) {}
    await addDoc(historyCol, record);
  }

  // ─── Actions ───────────────────────────────────────────────────

  // Atomic transaction: increments the stand counter and creates the queue doc
  // in one operation → no collision on concurrent joins.
  const join = useCallback(async () => {
    if (!uid || !stand || !stand.is_open || stand.is_paused) return;
    if (stand.max_queue_size != null && stand.max_queue_size > 0) {
      const snap = await getDocs(
        query(collection(db, 'queue'), where('stand_id', '==', STAND_ID), where('status', 'in', ['waiting', 'orange', 'claimed']))
      );
      if (snap.size >= stand.max_queue_size) return;
    }
    await runTransaction(db, async (tx) => {
      const standSnap = await tx.get(standRef);
      const position  = ((standSnap.data()?.queue_counter ?? 0) as number) + 1;
      tx.update(standRef, { queue_counter: position });
      tx.set(doc(db, 'queue', uid), {
        uid,
        stand_id:               STAND_ID,
        queue_position:         position,
        status:                 'waiting',
        has_confirmed_presence: false,
        delay_used:             false,
        timestamp:              serverTimestamp(),
      });
    });
  }, [uid, stand]);

  // Pushes the client to the back of the queue (behind everyone currently active)
  const requestDelay = useCallback(async () => {
    if (!uid || !client || client.delay_used) return;
    if (stand?.max_delayed != null && stand.max_delayed > 0) {
      const delaySnap = await getDocs(
        query(collection(db, 'queue'), where('stand_id', '==', STAND_ID), where('delay_used', '==', true), where('status', 'in', ['waiting', 'orange', 'claimed']))
      );
      if (delaySnap.size >= stand.max_delayed) return;
    }
    // Fix #1: filter by stand_id
    const qSnap = await getDocs(
      query(
        collection(db, 'queue'),
        where('stand_id', '==', STAND_ID),
        where('status', 'in', ['waiting', 'orange', 'claimed']),
      )
    );
    const maxPos = qSnap.docs.reduce((m, d) => Math.max(m, d.data().queue_position ?? 0), 0);
    await updateDoc(doc(db, 'queue', uid), {
      queue_position: maxPos + WAVE_SIZE,
      delay_used:     true,
      status:         'waiting',
      called_at:      deleteField(),
    });
  }, [uid, client, stand]);

  const leave = useCallback(async (reason: ExitReason = 'left_voluntarily') => {
    if (!uid) return;
    try { await writeHistory(reason, client); } catch (e) { console.warn('writeHistory:', e); }
    await updateDoc(doc(db, 'queue', uid), { status: 'done' });
  }, [uid, client]);

  const confirmPresence = useCallback(async () => {
    if (!uid) return;
    await updateDoc(doc(db, 'queue', uid), {
      has_confirmed_presence: true,
      status:                 'claimed',
      claimed_at:             serverTimestamp(),
    });
  }, [uid]);

  const done = useCallback(async (reason: ExitReason = 'completed', ratingData?: RatingData) => {
    if (!uid) return;
    try { await writeHistory(reason, client, ratingData); } catch (e) { console.warn('writeHistory:', e); }
    await updateDoc(doc(db, 'queue', uid), { status: 'done' });
  }, [uid, client]);

  const extend = useCallback(async () => {
    if (!uid) return;
    await updateDoc(doc(db, 'queue', uid), { claimed_at: serverTimestamp() });
  }, [uid]);

  const restart = useCallback(async () => {
    if (!uid) return;
    await updateDoc(doc(db, 'queue', uid), { status: 'done' });
    setClient(null);
  }, [uid]);

  // ─── Derived values ────────────────────────────────────────────
  const step         = deriveStep(client, authReady);
  const minPerPerson = stand?.min_per_person ?? 2.5;
  // Wait = people ahead × time per person (updates in real time)
  const estimatedMin  = Math.max(1, Math.round(positionAhead * minPerPerson));
  const waitingStatus: 'red' | 'orange' = estimatedMin < 5 ? 'orange' : 'red';

  return [
    client,
    step,
    { estimatedMin, waitingStatus, positionAhead },
    { join, requestDelay, leave, confirmPresence, done, extend, restart },
  ];
}

function deriveStep(client: QueueEntry | null, authReady: boolean): ClientStep {
  if (!authReady)                          return 'loading';
  if (!client || client.status === 'done') return 'splash';
  if (client.status === 'claimed')         return 'validation';
  if (client.status === 'orange')          return 'checkin';
  return 'waiting';
}
