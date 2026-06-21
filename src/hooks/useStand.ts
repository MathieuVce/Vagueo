import { useState, useEffect, useCallback } from 'react';
import {
  doc,
  onSnapshot,
  updateDoc,
  setDoc,
  serverTimestamp,
  increment,
  deleteField,
} from 'firebase/firestore';
import { db } from '../firebase.ts';
import type { Stand } from '../types.ts';
import {
  STAND_ID,
  SECURE_COLORS,
  FLOW_RATE_DEFAULT,
  FLOW_SLOW_DEFAULT,
  FLOW_SPRINT_DEFAULT,
  calcMinPerPerson,
} from '../tokens.ts';

const DEFAULT_STAND: Omit<Stand, 'secure_color'> = {
  current_wave: 0,
  queue_counter: 0,
  fill_wave: 0,
  fill_count: 0,
  is_paused: false,
  is_open: false,
  flow_rate: FLOW_RATE_DEFAULT,
  flow_slow: FLOW_SLOW_DEFAULT,
  flow_sprint: FLOW_SPRINT_DEFAULT,
  min_per_person: calcMinPerPerson(FLOW_RATE_DEFAULT),
  name: '',
  logo_url: '',
};

export interface ConfigureParams {
  name: string;
  logoUrl: string;
  address: string;
  isOpen: boolean;
  flowSlow: number;
  flowSprint: number;
  maxQueueSize: number | null;
  maxDelayed: number | null;
  callAheadMin: number;
}

interface StandActions {
  advance: () => Promise<void>;
  setFlowRate: (delta: number) => Promise<void>;
  togglePause: () => Promise<void>;
  toggleOpen: () => Promise<void>;
  configure: (params: ConfigureParams) => Promise<void>;
  claimStand: (uid: string, email: string | null) => Promise<void>;
}

interface UseStandOptions {
  // Guard: set true only in vendor context. Anonymous clients must not auto-create the stand.
  autoCreate?: boolean;
}

export function useStand(options?: UseStandOptions): [Stand | null, StandActions] {
  const autoCreate = options?.autoCreate ?? false;
  const [stand, setStand] = useState<Stand | null>(null);
  const standRef = doc(db, 'stands', STAND_ID || '__no_stand__');

  useEffect(() => {
    if (!STAND_ID) return;
    const unsub = onSnapshot(standRef, async (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Omit<Stand, 'secure_color'>;
        const secure_color = SECURE_COLORS[(data.current_wave ?? 0) % SECURE_COLORS.length].hex;
        setStand({ ...data, secure_color });
      } else if (autoCreate) {
        await setDoc(standRef, {
          ...DEFAULT_STAND,
          status: 'pending_approval',
          createdAt: serverTimestamp(),
        });
      }
    });
    return unsub;
  }, [autoCreate]);

  const advance = useCallback(async () => {
    await updateDoc(standRef, { current_wave: increment(1) });
  }, []);

  const setFlowRate = useCallback(
    async (delta: number) => {
      if (!stand) return;
      const next = Math.min(5, Math.max(1, (stand.flow_rate ?? FLOW_RATE_DEFAULT) + delta));
      // Reset EMA so the slider base takes full immediate effect; learning resumes from scratch.
      await updateDoc(standRef, {
        flow_rate: next,
        min_per_person: calcMinPerPerson(next, stand.flow_slow, stand.flow_sprint),
        service_ms_ema: deleteField(),
        service_count: 0,
      });
    },
    [stand],
  );

  const togglePause = useCallback(async () => {
    if (!stand) return;
    await updateDoc(standRef, { is_paused: !stand.is_paused });
  }, [stand]);

  const toggleOpen = useCallback(async () => {
    if (!stand) return;
    await updateDoc(standRef, { is_open: !stand.is_open });
  }, [stand]);

  // First-time setup or settings edit
  const configure = useCallback(
    async ({
      name,
      logoUrl,
      address,
      isOpen,
      flowSlow,
      flowSprint,
      maxQueueSize,
      maxDelayed,
      callAheadMin,
    }: ConfigureParams) => {
      const slow = Number(flowSlow) || FLOW_SLOW_DEFAULT;
      const sprint = Number(flowSprint) || FLOW_SPRINT_DEFAULT;
      const rate = stand?.flow_rate ?? FLOW_RATE_DEFAULT;
      await updateDoc(standRef, {
        name: name.trim(),
        logo_url: logoUrl.trim(),
        address: address.trim(),
        is_open: isOpen,
        flow_slow: slow,
        flow_sprint: sprint,
        min_per_person: calcMinPerPerson(rate, slow, sprint),
        max_queue_size: maxQueueSize,
        max_delayed: maxDelayed,
        call_ahead_min: callAheadMin,
      });
    },
    [stand],
  );

  // Links this stand to a Google-authenticated vendor UID + email (called once, on first login)
  const claimStand = useCallback(
    async (uid: string, email: string | null) => {
      if (!stand || stand.vendor_uid) return;
      await updateDoc(standRef, { vendor_uid: uid, vendor_email: email ?? '' });
    },
    [stand],
  );

  return [stand, { advance, setFlowRate, togglePause, toggleOpen, configure, claimStand }];
}
