import type { CSSProperties } from 'react';
import VagueoLogo     from '../components/VagueoLogo.tsx';
import WaveBackground from '../components/WaveBackground.tsx';
import VgButton       from '../components/VgButton.tsx';
import { PALETTE, FONT_SERIF, FONT, FONT_MONO } from '../tokens.ts';

interface ScreenAttenteProps {
  estimatedMin: number;
  waitingStatus: 'red' | 'orange';
  presentCount: number;
  onLeave: () => void;
}

const p = PALETTE;

const s = {
  root: {
    width: '100%', height: '100%',
    background: p.paper, color: p.ink,
    fontFamily: FONT, position: 'relative', overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
    animation: 'vagueoFadeIn 0.4s ease',
  } satisfies CSSProperties,
  topBar: {
    position: 'relative', zIndex: 2,
    padding: '14px 22px 0',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  } satisfies CSSProperties,
  content: {
    position: 'relative', zIndex: 2,
    flex: 1, padding: '48px 24px 0',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
  } satisfies CSSProperties,
  estLabel: {
    fontSize: 12, color: p.mute,
    letterSpacing: '0.16em', textTransform: 'uppercase',
  } satisfies CSSProperties,
  bigMin: {
    marginTop: 6,
    fontFamily: FONT_SERIF, fontStyle: 'italic',
    fontSize: 108, lineHeight: 1, letterSpacing: '-0.04em',
  } satisfies CSSProperties,
  bigMinUnit: {
    fontSize: 40, letterSpacing: '-0.02em', marginLeft: 6, color: p.mute,
  } satisfies CSSProperties,
  presenceBox: {
    marginTop: 32,
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '12px 20px',
    border: `1px solid ${p.line}`, borderRadius: 14,
  } satisfies CSSProperties,
  presenceDot: {
    width: 8, height: 8, borderRadius: '50%',
    background: 'oklch(0.55 0.18 142)',
    animation: 'vagueoSlowPulse 2s ease-in-out infinite',
  } satisfies CSSProperties,
  presenceCount: {
    fontFamily: FONT_MONO, fontSize: 18, fontVariantNumeric: 'tabular-nums',
  } satisfies CSSProperties,
  presenceLabel: {
    fontSize: 13, color: p.mute,
  } satisfies CSSProperties,
  hint: {
    marginTop: 24, fontSize: 12, color: p.mute,
    textAlign: 'center', lineHeight: 1.6, maxWidth: 260,
  } satisfies CSSProperties,
  footer: {
    position: 'relative', zIndex: 2, padding: '0 22px 38px',
  } satisfies CSSProperties,
  leaveBtn: {
    fontSize: 14, fontWeight: 600,
    color: '#c0392b',
    border: '1.5px solid rgba(192,57,43,0.3)',
    boxShadow: '0 2px 12px rgba(192,57,43,0.12)',
  } satisfies CSSProperties,
};

export default function ScreenAttente({ estimatedMin, waitingStatus, presentCount, onLeave }: ScreenAttenteProps) {
  const isOrange   = waitingStatus === 'orange';
  const accent     = isOrange ? p.call     : p.wait;
  const accentSoft = isOrange ? p.callSoft : p.waitSoft;

  // Progress: capped so the wave is always partially visible
  const progress = isOrange ? 0.82 : 0.35;

  const badgeStyle: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '5px 10px 5px 8px', borderRadius: 99,
    background: isOrange ? p.call : 'transparent',
    color: isOrange ? '#fff' : p.mute,
    border: isOrange ? 'none' : `1px solid ${p.line}`,
    fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase',
  };

  const badgeDotStyle: CSSProperties = {
    width: 7, height: 7, borderRadius: 99,
    background: isOrange ? '#fff' : accent,
    animation: isOrange ? 'vagueoSlowPulse 1.2s ease-in-out infinite' : undefined,
  };

  return (
    <div style={s.root}>
      <WaveBackground progress={progress} color={accent} soft={accentSoft} />

      {/* Top bar */}
      <div style={s.topBar}>
        <VagueoLogo size={20} color={p.ink} accent={accent} />
        <div style={badgeStyle}>
          <span style={badgeDotStyle} />
          {isOrange ? 'Préparez-vous' : 'En attente'}
        </div>
      </div>

      {/* Main content */}
      <div style={s.content}>
        <div style={s.estLabel}>Attente estimée</div>
        <div style={s.bigMin}>
          ~{estimatedMin}
          <span style={s.bigMinUnit}>min</span>
        </div>

        {/* People at stand */}
        <div style={s.presenceBox}>
          <div style={s.presenceDot} />
          <span style={s.presenceCount}>{presentCount}</span>
          <span style={s.presenceLabel}>
            {presentCount === 1 ? 'personne au stand' : 'personnes au stand'}
          </span>
        </div>

        <div style={s.hint}>
          Vous pouvez verrouiller votre téléphone.<br />
          Nous vous préviendrons quand c'est votre tour.
        </div>
      </div>

      {/* Bottom */}
      <div style={s.footer}>
        <VgButton onClick={onLeave} variant="ghost" style={s.leaveBtn}>
          Quitter la file
        </VgButton>
      </div>
    </div>
  );
}
