import { useState, useEffect, useRef } from 'react';
import { useStand }          from '../hooks/useStand.ts';
import { useVendorAuth }     from '../hooks/useVendorAuth.ts';
import { useClock }          from '../hooks/useClock.ts';
import { useQueueCounts }         from '../hooks/useQueueCounts.ts';
import { useDevHelpers }          from '../hooks/useDevHelpers.ts';
import { useVendorStandLookup }   from '../hooks/useVendorStandLookup.ts';
import { waveIntervalMs, PALETTE, FONT, STAND_ID } from '../tokens.ts';
import ScreenVendorLogin  from '../screens/ScreenVendorLogin.tsx';
import ScreenVendorCreate from '../screens/ScreenVendorCreate.tsx';
import ScreenVendor       from '../screens/ScreenVendor.tsx';
import ScreenVendorSetup  from '../screens/ScreenVendorSetup.tsx';
import ScreenStats        from '../screens/ScreenStats.tsx';
import ScreenQRCode       from '../screens/ScreenQRCode.tsx';
import type { ConfigureParams } from '../hooks/useStand.ts';

const DEV = import.meta.env.DEV;

export default function VendorApp() {
  const [stand, { advance, togglePause, toggleOpen, setFlowRate, configure, claimStand }] = useStand({ autoCreate: true });
  const { user, loading: authLoading, isAuthorized, isUnclaimed, signIn, signOut, error: authError } = useVendorAuth(stand);
  const clock = useClock();

  const [showSetup, setShowSetup] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showQR,    setShowQR]    = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  const { presentCount, waitingCount } = useQueueCounts(isAuthorized);
  const standLookup = useVendorStandLookup(user);
  const { devAddClient, devRemoveClient, devClearQueue, devResetStore } = useDevHelpers();

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waitingRef  = useRef(0);

  // Claim stand on first authorized login
  useEffect(() => {
    if (user && isUnclaimed) claimStand(user.uid, user.email);
  }, [user?.uid, isUnclaimed]);

  // Show setup when stand has no name yet after authorization
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stand && user && isAuthorized && !stand.name) setShowSetup(true);
  }, [stand?.name, isAuthorized]);

  useEffect(() => { waitingRef.current = waitingCount; }, [waitingCount]);

  // Auto-advance waves when queue is active
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!stand || stand.is_paused || !stand.is_open) return;
    const ms = waveIntervalMs(stand.min_per_person ?? 3);
    intervalRef.current = setInterval(() => {
      if (waitingRef.current > 0) advance();
    }, ms);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [stand?.min_per_person, stand?.is_paused, stand?.is_open]);

  async function handleSignIn() {
    setSigningIn(true);
    await signIn();
    setSigningIn(false);
  }

  async function handleSaveConfigure(data: ConfigureParams | null) {
    if (data) await configure(data);
    setShowSetup(false);
  }

  const p = PALETTE;

  const loadingSpinner = (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: p.paper }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'oklch(0.46 0.13 250)', animation: 'vagueoPulse 1s ease-in-out infinite' }} />
    </div>
  );

  // ─── No stand ID in URL ───────────────────────────────────────
  if (!STAND_ID) {
    if (authLoading || standLookup === 'loading' || standLookup === 'redirecting') return loadingSpinner;
    if (!user || user.isAnonymous) {
      return (
        <ScreenVendorLogin
          standName={null}
          onSignIn={handleSignIn}
          error={authError}
          loading={signingIn}
        />
      );
    }
    return (
      <ScreenVendorCreate
        user={user}
        onCreated={(id) => window.location.replace(`/vendor?stand=${id}`)}
      />
    );
  }

  // ─── Loading ──────────────────────────────────────────────────
  if (authLoading || !stand) return loadingSpinner;

  // ─── Not logged in ────────────────────────────────────────────
  if (!user || user.isAnonymous) {
    return (
      <ScreenVendorLogin
        standName={stand.name || null}
        onSignIn={handleSignIn}
        error={authError}
        loading={signingIn}
      />
    );
  }

  // ─── Wrong account ────────────────────────────────────────────
  if (!isAuthorized) {
    return (
      <div style={{ width: '100%', height: '100%', background: p.paper, fontFamily: FONT, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px', gap: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 32 }}>🔒</div>
        <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em' }}>Accès refusé</div>
        <div style={{ fontSize: 13, color: p.mute, lineHeight: 1.6, maxWidth: 280 }}>
          Ce stand appartient à un autre compte.<br />
          Connectez-vous avec le bon compte Google.
        </div>
        <div style={{ fontSize: 12, color: p.mute, marginTop: 4 }}>
          Connecté en tant que <strong>{user.email}</strong>
        </div>
        <button onClick={signOut} style={{ marginTop: 8, border: `1px solid ${p.line}`, borderRadius: 12, padding: '10px 20px', cursor: 'pointer', background: 'transparent', fontFamily: FONT, fontSize: 14, color: p.ink }}>
          Changer de compte
        </button>
      </div>
    );
  }

  // ─── Pending approval ─────────────────────────────────────────
  if (stand.status === 'pending_approval') {
    return (
      <div style={{ width: '100%', height: '100%', background: p.paper, fontFamily: FONT, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px', gap: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 40, opacity: 0.2 }}>〜</div>
        <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' }}>En attente d'approbation</div>
        <div style={{ fontSize: 13, color: p.mute, lineHeight: 1.7, maxWidth: 300 }}>
          Votre stand a été créé et est en cours de validation par l'administrateur.<br />
          Vous serez notifié dès qu'il est approuvé.
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: p.mute, fontFamily: 'monospace' }}>{STAND_ID}</div>
        <button onClick={signOut} style={{ marginTop: 16, border: `1px solid ${p.line}`, borderRadius: 12, padding: '10px 20px', cursor: 'pointer', background: 'transparent', fontFamily: FONT, fontSize: 14, color: p.ink }}>
          Se déconnecter
        </button>
      </div>
    );
  }

  // ─── Authorized ───────────────────────────────────────────────
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ScreenVendor
        stand={stand}
        presentCount={presentCount}
        waitingCount={waitingCount}
        clock={clock}
        onTogglePause={togglePause}
        onToggleOpen={toggleOpen}
        onSetFlowRate={setFlowRate}
        onOpenSettings={() => setShowSetup(true)}
        onOpenStats={() => setShowStats(true)}
        onOpenQR={() => setShowQR(true)}
        vendorEmail={user.email ?? null}
        onSignOut={signOut}
        isDemoMode={false}
        isDevMode={DEV}
        onDevAddClient={DEV ? devAddClient : undefined}
        onDevRemoveClient={DEV ? devRemoveClient : undefined}
        onDevClearQueue={DEV ? devClearQueue : undefined}
        onDevResetStore={DEV ? () => devResetStore(() => {}) : undefined}
      />
      {showSetup && (
        <ScreenVendorSetup stand={stand} onSave={handleSaveConfigure} isEditing={!!stand.name} />
      )}
      {showStats && <ScreenStats onClose={() => setShowStats(false)} />}
      {showQR    && <ScreenQRCode stand={stand} onClose={() => setShowQR(false)} />}
    </div>
  );
}
