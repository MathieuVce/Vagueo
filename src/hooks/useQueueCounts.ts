import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase.ts';
import { STAND_ID } from '../tokens.ts';

interface UseQueueCountsReturn {
  presentCount: number;
  waitingCount: number;
}

// Fix #1: both queries are scoped to STAND_ID for multi-stand correctness.
// Fix #4: extracted from VendorApp to keep the page component lean.
export function useQueueCounts(enabled: boolean): UseQueueCountsReturn {
  const [presentCount, setPresentCount] = useState(0);
  const [waitingCount, setWaitingCount] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const qPresent = query(
      collection(db, 'queue'),
      where('stand_id', '==', STAND_ID),
      where('status', '==', 'claimed'),
    );
    const qWaiting = query(
      collection(db, 'queue'),
      where('stand_id', '==', STAND_ID),
      where('status', 'in', ['waiting', 'orange', 'claimed']),
    );
    const unsubP = onSnapshot(qPresent, (s) => setPresentCount(s.size));
    const unsubW = onSnapshot(qWaiting, (s) => setWaitingCount(s.size));
    return () => { unsubP(); unsubW(); };
  }, [enabled]);

  return { presentCount, waitingCount };
}
