import { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase.ts';
import { STAND_ID } from '../tokens.ts';

export type StandLookupResult = 'loading' | 'redirecting' | 'none';

// When STAND_ID is already set in the URL, returns 'none' immediately (no-op).
// When STAND_ID is empty and the user is a Google-authenticated vendor,
// queries Firestore for a stand owned by that uid.
// Found → redirect to /vendor?stand=<id> and return 'redirecting'.
// Not found → return 'none' so the caller can show the creation form.
export function useVendorStandLookup(user: User | null | undefined): StandLookupResult {
  const [result, setResult] = useState<StandLookupResult>('loading');

  useEffect(() => {
    if (STAND_ID) { setResult('none'); return; }
    if (!user || user.isAnonymous) { setResult('none'); return; }

    setResult('loading');
    getDocs(
      query(collection(db, 'stands'), where('vendor_uid', '==', user.uid), limit(1)),
    ).then((snap) => {
      if (!snap.empty) {
        window.location.replace(`/vendor?stand=${snap.docs[0].id}`);
        setResult('redirecting');
      } else {
        setResult('none');
      }
    }).catch(() => setResult('none'));
  }, [user?.uid, user?.isAnonymous]);

  return result;
}
