import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase.ts';
import { STAND_ID } from '../tokens.ts';

interface UseQueueCountsReturn {
  presentCount: number;
  waitingCount: number;
  // Plus petite vague parmi les clients actifs (Infinity si file vide). Sert à
  // l'avance « on clear » : si minActiveWave > current_wave, la vague en cours
  // est écoulée → on avance tout de suite (cf. VendorApp).
  minActiveWave: number;
}

// Fix #1: both queries are scoped to STAND_ID for multi-stand correctness.
// Fix #4: extracted from VendorApp to keep the page component lean.
export function useQueueCounts(enabled: boolean): UseQueueCountsReturn {
  const [presentCount, setPresentCount] = useState(0);
  const [waitingCount, setWaitingCount] = useState(0);
  const [minActiveWave, setMinActiveWave] = useState(Number.POSITIVE_INFINITY);

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
    const unsubW = onSnapshot(qWaiting, (s) => {
      setWaitingCount(s.size);
      let min = Number.POSITIVE_INFINITY;
      s.forEach((d) => {
        const w = d.data().wave_number as number | undefined;
        if (typeof w === 'number' && w < min) min = w;
      });
      setMinActiveWave(min);
    });
    return () => {
      unsubP();
      unsubW();
    };
  }, [enabled]);

  return { presentCount, waitingCount, minActiveWave };
}
