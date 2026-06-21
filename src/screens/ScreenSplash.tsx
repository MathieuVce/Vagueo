import type { CSSProperties } from 'react';
import VagueoLogo from '../components/VagueoLogo.tsx';
import VgButton from '../components/VgButton.tsx';
import { PALETTE, FONT_SERIF, FONT } from '../tokens.ts';

interface ScreenSplashProps {
  onJoin: () => void;
  estimatedMin?: number;
  standName?: string;
  logoUrl?: string;
  isOpen?: boolean;
  isPaused?: boolean;
  isFull?: boolean;
}

const p = PALETTE;

const s = {
  root: {
    width: '100%',
    height: '100%',
    background: p.paper,
    color: p.ink,
    fontFamily: FONT,
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
    animation: 'vagueoFadeIn 0.4s ease',
  } satisfies CSSProperties,
  deco: {
    position: 'absolute',
    inset: 0,
    opacity: 0.4,
  } satisfies CSSProperties,
  decoSvg: {
    width: '100%',
    height: '100%',
  } satisfies CSSProperties,
  center: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 32px',
    position: 'relative',
  } satisfies CSSProperties,
  logo: {
    width: 88,
    height: 88,
    borderRadius: 22,
    objectFit: 'cover',
    boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
  } satisfies CSSProperties,
  standName: {
    marginTop: 16,
    fontFamily: FONT_SERIF,
    fontStyle: 'italic',
    fontSize: 28,
    letterSpacing: '-0.02em',
    textAlign: 'center',
  } satisfies CSSProperties,
  tagline: {
    marginTop: 4,
    fontSize: 11,
    color: p.mute,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
  } satisfies CSSProperties,
  taglineNoName: {
    marginTop: 12,
    fontSize: 12,
    color: p.mute,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
  } satisfies CSSProperties,
  closedBlock: {
    marginTop: 48,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  } satisfies CSSProperties,
  closedBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 16px',
    borderRadius: 99,
    background: p.line,
    color: p.mute,
    fontSize: 13,
    fontWeight: 500,
  } satisfies CSSProperties,
  closedHint: {
    fontSize: 13,
    color: p.mute,
    lineHeight: 1.6,
    maxWidth: 260,
  } satisfies CSSProperties,
  waitBlock: {
    marginTop: 48,
    textAlign: 'center',
  } satisfies CSSProperties,
  waitLabel: {
    fontSize: 12,
    color: p.mute,
    textTransform: 'uppercase',
    letterSpacing: '0.14em',
  } satisfies CSSProperties,
  waitTime: {
    marginTop: 8,
    fontFamily: FONT_SERIF,
    fontStyle: 'italic',
    fontSize: 56,
    lineHeight: 1,
  } satisfies CSSProperties,
  waitUnit: {
    fontSize: 22,
    color: p.mute,
    marginLeft: 6,
  } satisfies CSSProperties,
  bottom: {
    padding: '0 22px 40px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    position: 'relative',
  } satisfies CSSProperties,
  footnote: {
    fontSize: 11,
    color: p.mute,
    textAlign: 'center',
    lineHeight: 1.5,
  } satisfies CSSProperties,
  poweredBy: {
    fontSize: 11,
    color: p.mute,
    textAlign: 'center',
    lineHeight: 1.5,
  } satisfies CSSProperties,
};

export default function ScreenSplash({
  onJoin,
  estimatedMin = 15,
  standName,
  logoUrl,
  isOpen = true,
  isPaused = false,
  isFull = false,
}: ScreenSplashProps) {
  const isUnavailable = !isOpen || isPaused || isFull;

  return (
    <div style={s.root}>
      {/* Decorative wave lines */}
      <div style={s.deco}>
        <svg viewBox="0 0 400 800" preserveAspectRatio="none" style={s.decoSvg}>
          {[0, 1, 2].map((i) => (
            <path
              key={i}
              d={`M-50 ${600 + i * 40} Q 100 ${540 + i * 40} 200 ${600 + i * 40} T 450 ${600 + i * 40}`}
              stroke={p.line}
              strokeWidth="1"
              fill="none"
            />
          ))}
        </svg>
      </div>

      {/* Center content */}
      <div style={s.center}>
        {logoUrl ? (
          <img src={logoUrl} alt={standName ?? ''} style={s.logo} />
        ) : (
          <VagueoLogo size={64} color={p.ink} accent={p.wait} />
        )}

        {standName ? (
          <>
            <div style={s.standName}>{standName}</div>
            <div style={s.tagline}>File d'attente · sans inscription</div>
          </>
        ) : (
          <div style={s.taglineNoName}>File d'attente · sans inscription</div>
        )}

        {isUnavailable ? (
          <div style={s.closedBlock}>
            <div style={s.closedBadge}>
              <span style={{ fontSize: 15 }}>{isPaused ? '❚❚' : isFull ? '◉' : '×'}</span>
              {isPaused ? 'Stand en pause' : isFull ? 'File complète' : 'La file est fermée'}
            </div>
            <div style={s.closedHint}>
              {isPaused ? (
                <>
                  Le vendeur a momentanément suspendu la file.
                  <br />
                  Revenez dans quelques instants.
                </>
              ) : isFull ? (
                <>
                  La file a atteint sa capacité maximale.
                  <br />
                  Revenez dans quelques instants.
                </>
              ) : (
                <>
                  Le stand n'est pas encore disponible.
                  <br />
                  Revenez dans quelques instants.
                </>
              )}
            </div>
          </div>
        ) : (
          <div style={s.waitBlock}>
            <div style={s.waitLabel}>Temps d'attente estimé</div>
            <div style={s.waitTime}>
              {estimatedMin}
              <span style={s.waitUnit}>min</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom */}
      <div style={s.bottom}>
        {!isUnavailable ? (
          <>
            <VgButton onClick={onJoin}>
              Rejoindre la file
              <span style={{ opacity: 0.6 }}>→</span>
            </VgButton>
            <div style={s.footnote}>
              Pas d'inscription, pas de compte.
              <br />
              Votre place est conservée dans ce navigateur.
            </div>
          </>
        ) : (
          <div style={s.poweredBy}>
            Powered by <span style={{ fontStyle: 'italic' }}>Vaguéo</span>
          </div>
        )}
      </div>
    </div>
  );
}
