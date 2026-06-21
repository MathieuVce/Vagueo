import { useEffect } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase.ts';
import {
  STAND_ID,
  REAPER_INTERVAL_MS,
  ORANGE_STALE_MS,
  WAITING_STALE_MS,
  HEARTBEAT_STALE_MS,
  calcServiceStaleMs,
} from '../tokens.ts';
import type { ExitReason } from '../types.ts';

// Champs lus sur un doc queue à purger (timestamps Firestore minimaux).
interface ReapDoc {
  status?: string;
  timestamp?: { toMillis(): number } | null;
  called_at?: { toMillis(): number } | null;
  claimed_at?: { toMillis(): number } | null;
  last_seen?: { toMillis(): number } | null;
  delay_used?: boolean;
}

// Filet de sécurité côté vendeur (aucun backend requis).
//
// Le self-timeout du client ([ClientApp]) ne se déclenche que si SON onglet est
// ouvert. Si le client ferme l'onglet sans confirmer sa présence ou sans cliquer
// « terminé », son doc queue resterait indéfiniment et fausserait l'estimation
// d'attente des suivants. Ce reaper, exécuté dans la session vendeur (compte
// Google : droits de suppression queue + écriture historique), purge ces
// fantômes. Priorité au heartbeat last_seen quand il est présent :
//   - un onglet vif (last_seen frais) n'est JAMAIS purgé, quel que soit le statut
//     (protège même un service long) ;
//   - un « claimed » dont le heartbeat est périmé est purgé en quelques minutes
//     (HEARTBEAT_STALE_MS) → l'écran de validation fermé est détecté vite.
// Repli, pour les clients sans heartbeat (ancienne version) ou en arrière-plan :
//   - « claimed » depuis calcServiceStaleMs(min_per_person)
//   - « orange » sans réponse depuis ORANGE_STALE_MS
//   - « waiting » abandonné depuis WAITING_STALE_MS (délai très long)
//
// Les seuils coarse dépassent le self-timeout client (cf. tokens), donc on ne
// court-circuite jamais le parcours normal. Un timeout n'alimente pas l'EMA
// (réservée aux services « completed »).
export function useQueueReaper(enabled: boolean, minPerPerson = 3, paused = false): void {
  useEffect(() => {
    if (!enabled || paused || !STAND_ID) return;
    const serviceStaleMs = calcServiceStaleMs(minPerPerson);

    async function sweep(): Promise<void> {
      const snap = await getDocs(
        query(
          collection(db, 'queue'),
          where('stand_id', '==', STAND_ID),
          where('status', 'in', ['waiting', 'orange', 'claimed']),
        ),
      );
      const now = Date.now();
      for (const d of snap.docs) {
        const data = d.data() as ReapDoc;

        // Onglet vif récemment : on n'y touche jamais, quel que soit le statut.
        // Protège aussi les services longs tant que l'écran de validation bat.
        if (data.last_seen && now - data.last_seen.toMillis() <= HEARTBEAT_STALE_MS) continue;

        let reason: ExitReason | null = null;
        if (data.status === 'claimed') {
          // Heartbeat présent mais périmé → onglet fermé : purge directe.
          // Sinon (client sans heartbeat) → repli sur l'ancienneté de claimed_at.
          if (
            data.last_seen ||
            (data.claimed_at && now - data.claimed_at.toMillis() > serviceStaleMs)
          )
            reason = 'timeout_service';
        } else if (
          // orange/waiting : seuils coarse (tolèrent un téléphone verrouillé).
          data.status === 'orange' &&
          data.called_at &&
          now - data.called_at.toMillis() > ORANGE_STALE_MS
        ) {
          reason = 'timeout_checkin';
        } else if (
          data.status === 'waiting' &&
          data.timestamp &&
          now - data.timestamp.toMillis() > WAITING_STALE_MS
        ) {
          reason = 'timeout_waiting';
        }
        if (reason) await reap(d.id, data, reason);
      }
    }

    void sweep(); // premier passage immédiat
    const id = setInterval(() => void sweep(), REAPER_INTERVAL_MS);
    return () => clearInterval(id);
  }, [enabled, paused, minPerPerson]);
}

// Archive l'entrée (historique pour les stats) puis supprime le doc queue, en un
// batch atomique. Pas d'EMA : un timeout n'est pas un service mesuré propre.
async function reap(uid: string, data: ReapDoc, reason: ExitReason): Promise<void> {
  const record: Record<string, unknown> = {
    uid,
    exit_reason: reason,
    joined_at: data.timestamp ?? null,
    called_at: data.called_at ?? null,
    claimed_at: data.claimed_at ?? null,
    done_at: serverTimestamp(),
    delay_used: data.delay_used ?? false,
  };
  try {
    if (data.called_at && data.timestamp)
      record.wait_ms = data.called_at.toMillis() - data.timestamp.toMillis();
    if (data.claimed_at) record.service_ms = Date.now() - data.claimed_at.toMillis();
  } catch (_) {}

  const batch = writeBatch(db);
  batch.set(doc(collection(db, 'stands', STAND_ID, 'history')), record);
  batch.delete(doc(db, 'queue', uid));
  await batch.commit();
}
