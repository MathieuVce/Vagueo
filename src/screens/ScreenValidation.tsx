import type { CSSProperties } from 'react';
import SecureColorBg from '../components/SecureColorBg.tsx';
import VagueoLogo from '../components/VagueoLogo.tsx';
import { FONT, FONT_MONO } from '../tokens.ts';

interface ScreenValidationProps {
  secureColor?: string;
  colorName?: string;
  clock: Date;
  onDone: () => void;
}

const ink = '#0a0a0a';

const s = {
  root: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: FONT,
    color: ink,
    display: 'flex',
    flexDirection: 'column',
    animation: 'vagueoFadeIn 0.3s ease',
  } satisfies CSSProperties,
  topBar: {
    position: 'relative',
    zIndex: 2,
    padding: '14px 22px 0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  } satisfies CSSProperties,
  badge: {
    padding: '5px 10px',
    borderRadius: 99,
    background: 'rgba(0,0,0,0.8)',
    color: '#fff',
    fontSize: 11,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    fontWeight: 600,
  } satisfies CSSProperties,
  content: {
    position: 'relative',
    zIndex: 2,
    flex: 1,
    padding: '24px 22px 0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies CSSProperties,
  instruction: {
    fontSize: 11,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    fontWeight: 600,
    opacity: 0.85,
  } satisfies CSSProperties,
  clock: {
    marginTop: 16,
    fontFamily: FONT_MONO,
    fontWeight: 600,
    fontSize: 80,
    lineHeight: 1,
    letterSpacing: '-0.05em',
    fontVariantNumeric: 'tabular-nums',
    display: 'flex',
    alignItems: 'baseline',
  } satisfies CSSProperties,
  clockSep: {
    opacity: 0.35,
    animation: 'vagueoSlowPulse 1s ease-in-out infinite',
  } satisfies CSSProperties,
  clockSec: {
    opacity: 0.35,
    fontSize: 46,
    marginLeft: 3,
  } satisfies CSSProperties,
  hint: {
    marginTop: 20,
    fontSize: 12,
    lineHeight: 1.5,
    textAlign: 'center',
    maxWidth: 280,
    color: 'rgba(0,0,0,0.55)',
  } satisfies CSSProperties,
  footer: {
    position: 'relative',
    zIndex: 2,
    padding: '0 22px 38px',
  } satisfies CSSProperties,
  doneBtn: {
    width: '100%',
    minHeight: 56,
    border: 0,
    outline: 0,
    cursor: 'pointer',
    background: 'rgba(0,0,0,0.85)',
    color: '#fff',
    borderRadius: 16,
    fontFamily: FONT,
    fontSize: 17,
    fontWeight: 500,
  } satisfies CSSProperties,
};

export default function ScreenValidation({
  secureColor = '#FF6B9D',
  colorName: _colorName = 'Rose',
  clock,
  onDone,
}: ScreenValidationProps) {
  const hh = String(clock.getHours()).padStart(2, '0');
  const mm = String(clock.getMinutes()).padStart(2, '0');
  const ss = String(clock.getSeconds()).padStart(2, '0');

  return (
    <div style={s.root}>
      {/* Animated colored background */}
      <SecureColorBg bg={secureColor} />

      {/* Top bar */}
      <div style={s.topBar}>
        <VagueoLogo size={20} color={ink} accent={ink} />
        <div style={s.badge}>Présence validée</div>
      </div>

      {/* Main content */}
      <div style={s.content}>
        <div style={s.instruction}>Montrez cet écran au vendeur</div>

        {/* Live clock — proves it's not a screenshot */}
        <div style={s.clock}>
          <span>{hh}</span>
          <span style={s.clockSep}>:</span>
          <span>{mm}</span>
          <span style={s.clockSec}>:{ss}</span>
        </div>

        <div style={s.hint}>
          La couleur de fond et l'heure changent en direct.
          <br />
          Une capture d'écran ne fonctionnera pas.
        </div>
      </div>

      {/* Done button */}
      <div style={s.footer}>
        <button onClick={onDone} style={s.doneBtn}>
          C'est fait, merci ! ✓
        </button>
      </div>
    </div>
  );
}
