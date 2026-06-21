import {
  getDocs,
  collection,
  query,
  where,
  writeBatch,
  deleteDoc,
  doc,
  updateDoc,
  increment,
  runTransaction,
  serverTimestamp,
  limit,
} from 'firebase/firestore';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { db, auth } from '../firebase.ts';
import { STAND_ID, WAVE_SIZE, WAVE_LEAD } from '../tokens.ts';

// Dev-only Firestore helpers — extracted from VendorApp to keep it lean.
// Fix #4: decomposed out of VendorApp.
export function useDevHelpers() {
  async function devAddClient() {
    const fakeUid = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const standRef = doc(db, 'stands', STAND_ID);
    await runTransaction(db, async (tx) => {
      const s = (await tx.get(standRef)).data() ?? {};
      const cw = (s.current_wave as number | undefined) ?? 0;
      const base = cw + WAVE_LEAD;
      let fillWave = (s.fill_wave as number | undefined) ?? 0;
      let fillCount = (s.fill_count as number | undefined) ?? 0;
      if (fillWave < base) {
        fillWave = base;
        fillCount = 0;
      }
      if (fillCount >= WAVE_SIZE) {
        fillWave += 1;
        fillCount = 0;
      }
      fillCount += 1;
      tx.update(standRef, { fill_wave: fillWave, fill_count: fillCount });
      tx.set(doc(db, 'queue', fakeUid), {
        uid: fakeUid,
        stand_id: STAND_ID,
        wave_number: fillWave,
        status: 'waiting',
        has_confirmed_presence: false,
        delay_used: false,
        timestamp: serverTimestamp(),
        _dev: true,
      });
    });
  }

  // « − attente » : avance la vague servie (current_wave +1) → les clients se
  // rapprochent du stand (bleu → orange → validation).
  async function devLessWait() {
    await updateDoc(doc(db, 'stands', STAND_ID), { current_wave: increment(1) });
  }

  // « + attente » : recule la vague servie (min 0) → les clients reculent
  // (validation → orange → bleu). Transaction car increment ne plancherait pas à 0.
  async function devMoreWait() {
    const standRef = doc(db, 'stands', STAND_ID);
    await runTransaction(db, async (tx) => {
      const cw = ((await tx.get(standRef)).data()?.current_wave ?? 0) as number;
      tx.update(standRef, { current_wave: Math.max(0, cw - 1) });
    });
  }

  async function devRemoveClient() {
    // Prefer removing a _dev doc first; fall back to any waiting entry.
    const devSnap = await getDocs(
      query(
        collection(db, 'queue'),
        where('stand_id', '==', STAND_ID),
        where('_dev', '==', true),
        where('status', 'in', ['waiting', 'orange', 'claimed']),
        limit(1),
      ),
    );
    if (!devSnap.empty) {
      await deleteDoc(devSnap.docs[0].ref);
      return;
    }

    const anySnap = await getDocs(
      query(
        collection(db, 'queue'),
        where('stand_id', '==', STAND_ID),
        where('status', '==', 'waiting'),
        limit(1),
      ),
    );
    if (!anySnap.empty) await deleteDoc(anySnap.docs[0].ref);
  }

  async function devClearQueue() {
    const qSnap = await getDocs(
      query(
        collection(db, 'queue'),
        where('stand_id', '==', STAND_ID),
        where('status', 'in', ['waiting', 'orange', 'claimed']),
      ),
    );
    if (qSnap.empty) return;
    const batch = writeBatch(db);
    qSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  async function devResetStore(onDone: () => void) {
    const qSnap = await getDocs(collection(db, 'queue'));
    if (!qSnap.empty) {
      const batch = writeBatch(db);
      qSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
    await deleteDoc(doc(db, 'stands', STAND_ID));
    await firebaseSignOut(auth);
    onDone();
  }

  return {
    devAddClient,
    devRemoveClient,
    devLessWait,
    devMoreWait,
    devClearQueue,
    devResetStore,
  };
}
