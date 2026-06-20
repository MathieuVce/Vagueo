import { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase.ts';
import { useStand } from '../hooks/useStand.ts';
import { useClientSession } from '../hooks/useClientSession.ts';
import { useClock } from '../hooks/useClock.ts';
import { usePush } from '../hooks/usePush.ts';
import {
  SECURE_COLORS,
  ORANGE_PROMPT_MS,
  ORANGE_RESPONSE_MS,
  calcServicePromptMs,
  SERVICE_RESPONSE_MS,
  WAVE_SIZE,
  PALETTE,
  FONT,
  FONT_SERIF,
  STAND_ID,
} from '../tokens.ts';

import ScreenSplash from '../screens/ScreenSplash.tsx';
import ScreenAttente from '../screens/ScreenAttente.tsx';
import ScreenCheckin from '../screens/ScreenCheckin.tsx';
import ScreenValidation from '../screens/ScreenValidation.tsx';
import ScreenMerci from '../screens/ScreenMerci.tsx';
import ModalDialog from '../components/ModalDialog.tsx';
import ModalRating from '../components/ModalRating.tsx';

export default function ClientApp() {
  const [stand] = useStand();
  const [client, step, derived, actions] = useClientSession(stand);
  const clock = useClock();
  const { requestPermission, notify } = usePush();
  const prevStep = useRef<string | null>(null);

  const [orangeModal, setOrangeModal] = useState(false);
  const [serviceModal, setServiceModal] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [showMerci, setShowMerci] = useState(false);
  const [presentCount, setPresentCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);

  const orangePromptRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const orangeRespRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const servicePromptRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serviceRespRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Notification triggers
  useEffect(() => {
    if (step === 'waiting' && prevStep.current === 'splash') void requestPermission();
    if (step === 'checkin' && prevStep.current === 'waiting') {
      void notify("C'est votre tour !", 'Approchez-vous du stand Vaguéo.');
    }
    prevStep.current = step;
  }, [step]);

  // People physically at the stand (status claimed)
  useEffect(() => {
    const q = query(
      collection(db, 'queue'),
      where('stand_id', '==', STAND_ID),
      where('status', '==', 'claimed'),
    );
    return onSnapshot(q, (snap) => setPresentCount(snap.size));
  }, []);

  // Total active queue (for splash screen estimate before joining)
  useEffect(() => {
    const q = query(
      collection(db, 'queue'),
      where('stand_id', '==', STAND_ID),
      where('status', 'in', ['waiting', 'orange', 'claimed']),
    );
    return onSnapshot(q, (snap) => setActiveCount(snap.size));
  }, []);

  // Orange timeout: scales with how many people are still ahead in the wave.
  // Prompt = max(ORANGE_PROMPT_MS, positionAhead × min_per_person).
  // Resets whenever positionAhead drops (someone is served) — always accurate.
  // Paused: timers cut. On resume: full delay restarts from zero.
  const orangePromptMs = Math.max(
    ORANGE_PROMPT_MS,
    derived.positionAhead * (stand?.min_per_person ?? 3) * 60_000,
  );
  useEffect(() => {
    if (orangePromptRef.current) clearTimeout(orangePromptRef.current);
    if (orangeRespRef.current) clearTimeout(orangeRespRef.current);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrangeModal(false);

    if (step !== 'checkin' || !client?.called_at || stand?.is_paused) return;

    orangePromptRef.current = setTimeout(() => {
      setOrangeModal(true);
      orangeRespRef.current = setTimeout(() => {
        setOrangeModal(false);
        void actions.leave('timeout_checkin');
      }, ORANGE_RESPONSE_MS);
    }, orangePromptMs);

    return () => {
      if (orangePromptRef.current) clearTimeout(orangePromptRef.current);
      if (orangeRespRef.current) clearTimeout(orangeRespRef.current);
    };
  }, [step, client?.called_at?.toMillis(), stand?.is_paused, orangePromptMs]);

  // Service timeout: modal after a delay proportional to min_per_person.
  // Paused: timers cut. On resume: full delay restarts from zero.
  useEffect(() => {
    if (servicePromptRef.current) clearTimeout(servicePromptRef.current);
    if (serviceRespRef.current) clearTimeout(serviceRespRef.current);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setServiceModal(false);

    if (step !== 'validation' || !client?.claimed_at || stand?.is_paused) return;

    const promptMs = calcServicePromptMs(stand?.min_per_person ?? 3);
    servicePromptRef.current = setTimeout(() => {
      setServiceModal(true);
      serviceRespRef.current = setTimeout(() => {
        setServiceModal(false);
        void actions.done('timeout_service');
      }, SERVICE_RESPONSE_MS);
    }, promptMs);

    return () => {
      if (servicePromptRef.current) clearTimeout(servicePromptRef.current);
      if (serviceRespRef.current) clearTimeout(serviceRespRef.current);
    };
  }, [step, client?.claimed_at?.toMillis(), stand?.is_paused, stand?.min_per_person]);

  const secureColor = stand?.secure_color ?? '#FF6B9D';
  const colorName = SECURE_COLORS.find((c) => c.hex === secureColor)?.name ?? 'Rose';

  // Estimated wait before joining: active queue size × time per person
  const splashEstMin = stand
    ? Math.max(1, Math.round(activeCount * (stand.min_per_person ?? 2.5)))
    : 10;

  const isQueueFull = stand?.max_queue_size != null && activeCount >= stand.max_queue_size;

  // Delay = one full wave behind (WAVE_SIZE slots × min_per_person)
  const delayMin = Math.round(WAVE_SIZE * (stand?.min_per_person ?? 3));

  if (!STAND_ID) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fbfaf7',
          fontFamily: FONT,
          padding: '0 32px',
          gap: 12,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 32, opacity: 0.3 }}>〜</div>
        <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em', color: '#1a1a1a' }}>
          Lien invalide
        </div>
        <div style={{ fontSize: 13, color: '#a0988a', lineHeight: 1.6, maxWidth: 260 }}>
          Ce lien ne correspond à aucun stand.
          <br />
          Scannez à nouveau le QR code du stand.
        </div>
      </div>
    );
  }

  if (step === 'loading') {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fbfaf7',
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'oklch(0.46 0.13 250)',
            animation: 'vagueoPulse 1s ease-in-out infinite',
          }}
        />
      </div>
    );
  }

  if (step === 'splash') {
    return (
      <ScreenSplash
        onJoin={actions.join}
        estimatedMin={splashEstMin}
        standName={stand?.name || undefined}
        logoUrl={stand?.logo_url || undefined}
        isOpen={stand?.is_open ?? false}
        isPaused={stand?.is_paused ?? false}
        isFull={isQueueFull}
      />
    );
  }

  if (step === 'waiting') {
    return (
      <>
        <ScreenAttente
          estimatedMin={derived.estimatedMin}
          waitingStatus={derived.waitingStatus}
          presentCount={presentCount}
          onLeave={() => actions.leave('left_waiting')}
        />
        {stand?.is_paused && <PauseOverlay />}
      </>
    );
  }

  if (step === 'checkin') {
    return (
      <>
        <ScreenCheckin
          onConfirm={actions.confirmPresence}
          onDelay={actions.requestDelay}
          delayUsed={!!client?.delay_used}
          delayMin={delayMin}
        />
        {stand?.is_paused && <PauseOverlay />}
        {orangeModal && (
          <ModalDialog
            title="Vous êtes encore là ?"
            message={
              client?.delay_used
                ? "Vous n'avez pas confirmé votre présence. Souhaitez-vous quitter la file ?"
                : `Vous pouvez décaler votre passage d'environ ${delayMin} min, ou quitter la file.`
            }
            primary={
              client?.delay_used
                ? {
                    label: 'Quitter la file',
                    onPress: () => {
                      if (orangeRespRef.current) clearTimeout(orangeRespRef.current);
                      setOrangeModal(false);
                      void actions.leave('left_checkin');
                    },
                  }
                : {
                    label: `Décaler d'environ ${delayMin} min`,
                    onPress: () => {
                      if (orangeRespRef.current) clearTimeout(orangeRespRef.current);
                      setOrangeModal(false);
                      void actions.requestDelay();
                    },
                  }
            }
            secondary={
              client?.delay_used
                ? null
                : {
                    label: 'Quitter la file',
                    onPress: () => {
                      if (orangeRespRef.current) clearTimeout(orangeRespRef.current);
                      setOrangeModal(false);
                      void actions.leave('left_checkin');
                    },
                  }
            }
            autoCloseMs={ORANGE_RESPONSE_MS}
          />
        )}
      </>
    );
  }

  if (step === 'validation') {
    return (
      <>
        <ScreenValidation
          secureColor={secureColor}
          colorName={colorName}
          clock={clock}
          onDone={() => setShowRating(true)}
        />
        {stand?.is_paused && <PauseOverlay />}
        {serviceModal && (
          <ModalDialog
            title="Toujours en cours ?"
            message="Êtes-vous encore en train d'être servi au stand ?"
            primary={{
              label: 'Prolonger',
              onPress: () => {
                if (serviceRespRef.current) clearTimeout(serviceRespRef.current);
                setServiceModal(false);
                void actions.extend();
              },
            }}
            secondary={{
              label: "J'ai fini, merci",
              onPress: () => {
                if (serviceRespRef.current) clearTimeout(serviceRespRef.current);
                setServiceModal(false);
                setShowRating(true);
              },
            }}
            autoCloseMs={SERVICE_RESPONSE_MS}
          />
        )}
        {showRating && (
          <ModalRating
            onSubmit={(rating, feedback) => {
              setShowRating(false);
              setShowMerci(true);
              void actions.done('completed', { rating, feedback });
            }}
            onSkip={() => {
              setShowRating(false);
              setShowMerci(true);
              void actions.done('completed');
            }}
          />
        )}
      </>
    );
  }

  if (step === 'splash' && showMerci) {
    return (
      <ScreenMerci
        onRestart={() => {
          setShowMerci(false);
          void actions.restart();
        }}
      />
    );
  }

  return null;
}

function PauseOverlay() {
  const p = PALETTE;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(251,250,247,0.94)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: FONT,
        animation: 'vagueoFadeIn 0.25s ease',
        pointerEvents: 'all',
      }}
    >
      <div style={{ fontSize: 28, opacity: 0.4 }}>❚❚</div>
      <div
        style={{
          marginTop: 18,
          fontFamily: FONT_SERIF,
          fontStyle: 'italic',
          fontSize: 34,
          letterSpacing: '-0.02em',
          color: p.ink,
        }}
      >
        En pause
      </div>
      <div
        style={{
          marginTop: 10,
          fontSize: 13,
          color: p.mute,
          textAlign: 'center',
          maxWidth: 260,
          lineHeight: 1.6,
        }}
      >
        Le vendeur a suspendu la file.
        <br />
        Votre place est conservée.
      </div>
    </div>
  );
}
