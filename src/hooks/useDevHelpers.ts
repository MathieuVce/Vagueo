import {
  getDocs, collection, query, where, writeBatch,
  deleteDoc, doc, runTransaction, serverTimestamp, limit,
} from 'firebase/firestore';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { db, auth } from '../firebase.ts';
import { STAND_ID } from '../tokens.ts';

// Dev-only Firestore helpers — extracted from VendorApp to keep it lean.
// Fix #4: decomposed out of VendorApp.
export function useDevHelpers() {
  async function devAddClient() {
    const fakeUid  = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const standRef = doc(db, 'stands', STAND_ID);
    await runTransaction(db, async (tx) => {
      const standSnap = await tx.get(standRef);
      const position  = ((standSnap.data()?.queue_counter ?? 0) as number) + 1;
      tx.update(standRef, { queue_counter: position });
      tx.set(doc(db, 'queue', fakeUid), {
        uid: fakeUid, stand_id: STAND_ID,
        queue_position: position,
        status: 'waiting',
        has_confirmed_presence: false, delay_used: false,
        timestamp: serverTimestamp(), _dev: true,
      });
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
      )
    );
    if (!devSnap.empty) { await deleteDoc(devSnap.docs[0].ref); return; }

    const anySnap = await getDocs(
      query(
        collection(db, 'queue'),
        where('stand_id', '==', STAND_ID),
        where('status', '==', 'waiting'),
        limit(1),
      )
    );
    if (!anySnap.empty) await deleteDoc(anySnap.docs[0].ref);
  }

  async function devClearQueue() {
    const qSnap = await getDocs(
      query(
        collection(db, 'queue'),
        where('stand_id', '==', STAND_ID),
        where('status', 'in', ['waiting', 'orange', 'claimed']),
      )
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

  return { devAddClient, devRemoveClient, devClearQueue, devResetStore };
}
