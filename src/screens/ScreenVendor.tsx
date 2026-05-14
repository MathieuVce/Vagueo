import type { CSSProperties } from 'react';
import VagueoLogo from '../components/VagueoLogo.tsx';
import { PALETTE, FONT_SERIF, FONT, FONT_MONO, FLOW_RATE_LABELS, SECURE_COLORS } from '../tokens.ts';
import type { Stand } from '../types.ts';

interface ScreenVendorProps {
  stand: Stand;
  presentCount: number;
  waitingCount: number;
  clock: Date;
  onTogglePause: () => void;
  onToggleOpen: () => void;
  onSetFlowRate: (delta: number) => void;
  onOpenSettings: () => void;
  onOpenStats: () => void;
  onOpenQR: () => void;
  vendorEmail: string | null;
  onSignOut: () => void;
  isDemoMode: boolean;
  isDevMode: boolean;
  onDevAddClient?: () => void;
  onDevRemoveClient?: () => void;
  onDevClearQueue?: () => void;
  onDevResetStore?: () => void;
}

const p = PALETTE;

const s = {
  root: {
    width: '100%', height: '100%',
    background: p.paper, color: p.ink,
    fontFamily: FONT, display: 'flex', flexDirection: 'column',
    position: 'relative', overflow: 'hidden',
  } satisfies CSSProperties,
  devBanner: {
    background: 'oklch(0.46 0.13 250)', color: '#fff',
    padding: '5px 22px',
    display: 'flex', alignItems: 'center',
    fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
  } satisfies CSSProperties,
  colorBand: (color: string): CSSProperties => ({
    background: color,
    padding: '14px 22px 16px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  }),
  colorBandLabel: {
    fontSize: 10, letterSpacing: '0.18em',
    textTransform: 'uppercase', fontWeight: 600, color: 'rgba(0,0,0,0.75)',
  } satisfies CSSProperties,
  colorBandValue: {
    display: 'flex', alignItems: 'center', gap: 8, color: '#000',
  } satisfies CSSProperties,
  liveDot: {
    width: 9, height: 9, borderRadius: '50%', background: '#000',
    animation: 'vagueoPulse 1s ease-in-out infinite',
  } satisfies CSSProperties,
  colorName: {
    fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em',
  } satisfies CSSProperties,
  logoRow: {
    padding: '8px 22px 0',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  } satisfies CSSProperties,
  standName: {
    fontSize: 11, color: p.mute, marginTop: 1, letterSpacing: '0.04em',
  } satisfies CSSProperties,
  toolbarRight: {
    display: 'flex', alignItems: 'center', gap: 8,
  } satisfies CSSProperties,
  clock: {
    fontSize: 11, color: p.mute,
    letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: FONT_MONO,
  } satisfies CSSProperties,
  iconBtn: {
    border: `1px solid ${p.line}`, borderRadius: 10,
    width: 32, height: 32, cursor: 'pointer',
    background: 'transparent',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: p.mute,
  } satisfies CSSProperties,
  statusArea: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', padding: '0 22px',
  } satisfies CSSProperties,
  statusText: (is_open: boolean, is_paused: boolean): CSSProperties => ({
    fontFamily: FONT_SERIF, fontStyle: 'italic',
    fontSize: 52, lineHeight: 1, letterSpacing: '-0.02em',
    color: !is_open ? p.mute : is_paused ? '#d32f2f' : p.ink,
  }),
  statsBox: {
    marginTop: 28,
    display: 'flex', width: '100%', maxWidth: 320,
    border: `1px solid ${p.line}`, borderRadius: 18, overflow: 'hidden',
  } satisfies CSSProperties,
  statsCell: (hasBorder: boolean): CSSProperties => ({
    flex: 1, padding: '14px 12px', textAlign: 'center',
    borderRight: hasBorder ? `1px solid ${p.line}` : undefined,
  }),
  statsBigPresent: {
    fontFamily: FONT_MONO, fontSize: 28, fontWeight: 600, color: p.call,
  } satisfies CSSProperties,
  statsBig: {
    fontFamily: FONT_MONO, fontSize: 28, fontWeight: 600,
  } satisfies CSSProperties,
  statsLabel: {
    fontSize: 10, color: p.mute, marginTop: 2,
    textTransform: 'uppercase', letterSpacing: '0.1em',
  } satisfies CSSProperties,
  controls: {
    padding: '0 22px 38px', display: 'flex', flexDirection: 'column', gap: 10,
  } satisfies CSSProperties,
  openBtn: (is_open: boolean): CSSProperties => ({
    border: 0, outline: 0, cursor: 'pointer',
    width: '100%', minHeight: is_open ? 44 : 64,
    background: is_open ? p.line : 'oklch(0.38 0.18 142)',
    color: is_open ? p.mute : '#fff',
    borderRadius: 16,
    fontFamily: FONT, fontSize: is_open ? 13 : 17, fontWeight: is_open ? 400 : 600,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    transition: 'all 0.2s',
  }),
  flowControl: {
    display: 'flex', alignItems: 'center',
    border: `1px solid ${p.line}`, borderRadius: 20, overflow: 'hidden',
  } satisfies CSSProperties,
  flowBtn: (disabled: boolean): CSSProperties => ({
    border: 0, outline: 0, cursor: disabled ? 'not-allowed' : 'pointer',
    width: 60, minHeight: 60, fontSize: 24, fontWeight: 300,
    background: 'transparent', color: disabled ? p.mute : p.ink,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  }),
  flowCenter: {
    flex: 1, textAlign: 'center',
    borderLeft: `1px solid ${p.line}`, borderRight: `1px solid ${p.line}`,
    padding: '10px 8px',
  } satisfies CSSProperties,
  flowCenterLabel: {
    fontFamily: FONT_MONO, fontSize: 11, color: p.mute,
    textTransform: 'uppercase', letterSpacing: '0.12em',
  } satisfies CSSProperties,
  flowCenterValue: {
    fontSize: 16, fontWeight: 600, marginTop: 2,
  } satisfies CSSProperties,
  flowDots: {
    display: 'flex', justifyContent: 'center', gap: 4, marginTop: 6,
  } satisfies CSSProperties,
  flowDot: (active: boolean): CSSProperties => ({
    width: 6, height: 6, borderRadius: '50%',
    background: active ? p.ink : p.line,
    transition: 'background 0.2s',
  }),
  pauseBtn: (is_paused: boolean): CSSProperties => ({
    border: `1px solid ${is_paused ? '#d32f2f' : p.line}`,
    outline: 0, cursor: 'pointer',
    width: '100%', minHeight: 52,
    background: is_paused ? '#d32f2f' : 'transparent',
    color: is_paused ? '#fff' : p.ink,
    borderRadius: 16,
    fontFamily: FONT, fontSize: 15, fontWeight: 500,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  }),
  devToolbar: {
    padding: '8px 22px 20px',
    display: 'flex', gap: 6, alignItems: 'center',
    borderTop: `1px solid ${p.line}`,
  } satisfies CSSProperties,
  devLabel: {
    fontFamily: FONT_MONO, fontSize: 9, color: p.mute,
    textTransform: 'uppercase', letterSpacing: '0.1em', marginRight: 4,
  } satisfies CSSProperties,
  devBtn: {
    border: `1px solid ${p.line}`, borderRadius: 8,
    padding: '5px 10px', cursor: 'pointer',
    background: 'transparent', fontFamily: FONT_MONO,
    fontSize: 11, color: p.mute,
  } satisfies CSSProperties,
  devResetBtn: {
    marginLeft: 'auto',
    border: '1px solid rgba(192,57,43,0.35)', borderRadius: 8,
    padding: '5px 10px', cursor: 'pointer',
    background: 'rgba(192,57,43,0.06)', fontFamily: FONT_MONO,
    fontSize: 11, color: '#c0392b',
  } satisfies CSSProperties,
  demoBanner: {
    padding: '5px 22px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
  } satisfies CSSProperties,
  demoQuit: {
    border: 0, background: 'none', cursor: 'pointer',
    fontFamily: FONT, fontSize: 11, fontWeight: 600, color: p.ink, padding: 0,
  } satisfies CSSProperties,
};

export default function ScreenVendor({
  stand, presentCount, waitingCount, clock,
  onTogglePause, onToggleOpen, onSetFlowRate,
  onOpenSettings, onOpenStats, onOpenQR,
  vendorEmail, onSignOut, isDemoMode, isDevMode,
  onDevAddClient, onDevRemoveClient, onDevClearQueue, onDevResetStore,
}: ScreenVendorProps) {
  const { secure_color, is_paused, is_open, flow_rate, name } = stand;
  const hh = String(clock.getHours()).padStart(2, '0');
  const mm = String(clock.getMinutes()).padStart(2, '0');

  const colorName = SECURE_COLORS.find((c) => c.hex === secure_color)?.name ?? '—';
  const flowLabel = FLOW_RATE_LABELS[(flow_rate ?? 3) - 1];

  return (
    <div style={s.root}>
      {/* Dev banner */}
      {isDevMode && !isDemoMode && (
        <div style={s.devBanner}>
          <span>DEV — Auth désactivée (npm run dev)</span>
        </div>
      )}

      {/* Demo banner */}
      {isDemoMode && (
        <div style={{ ...s.demoBanner, background: p.call, color: p.ink }}>
          <span>⚠ Mode démo — non protégé</span>
          <button onClick={onSignOut} style={s.demoQuit}>Quitter →</button>
        </div>
      )}

      {/* Color band */}
      <div style={s.colorBand(secure_color)}>
        <div style={s.colorBandLabel}>Couleur en cours</div>
        <div style={s.colorBandValue}>
          <span style={s.liveDot} />
          <span style={s.colorName}>{colorName}</span>
        </div>
      </div>

      {/* Logo row */}
      <div style={s.logoRow}>
        <div>
          <VagueoLogo size={18} color={p.ink} accent={p.wait} />
          {name && <div style={s.standName}>{name}</div>}
        </div>
        <div style={s.toolbarRight}>
          <div style={s.clock}>{hh}:{mm}</div>
          {(isDevMode || (vendorEmail && !isDemoMode)) && (
            <button onClick={onSignOut}
              title={vendorEmail ? `Déconnexion (${vendorEmail})` : 'Connexion / déconnexion'}
              style={s.iconBtn}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          )}
          {/* QR code button */}
          <button onClick={onOpenQR} title="QR Code" style={s.iconBtn}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
              <line x1="14" y1="14" x2="14" y2="14"/><line x1="17" y1="14" x2="17" y2="14"/>
              <line x1="20" y1="14" x2="20" y2="14"/><line x1="20" y1="17" x2="20" y2="17"/>
              <line x1="17" y1="20" x2="20" y2="20"/><line x1="14" y1="20" x2="14" y2="17"/>
            </svg>
          </button>
          {/* Stats button */}
          <button onClick={onOpenStats} title="Statistiques" style={s.iconBtn}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6"  y1="20" x2="6"  y2="14" />
            </svg>
          </button>
          {/* Settings gear */}
          <button onClick={onOpenSettings} title="Paramètres du stand" style={s.iconBtn}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Status + stats */}
      <div style={s.statusArea}>
        <div style={s.statusText(is_open, is_paused)}>
          {!is_open ? 'File fermée' : is_paused ? 'En pause' : 'En service'}
        </div>
        <div style={s.statsBox}>
          <div style={s.statsCell(true)}>
            <div style={s.statsBigPresent}>{presentCount}</div>
            <div style={s.statsLabel}>devant le stand</div>
          </div>
          <div style={s.statsCell(false)}>
            <div style={s.statsBig}>{waitingCount}</div>
            <div style={s.statsLabel}>en attente</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={s.controls}>
        {/* is_open toggle — prominent when closed */}
        <button onClick={onToggleOpen} style={s.openBtn(is_open)}>
          {is_open
            ? <><span style={{ fontSize: 12 }}>×</span> Fermer la file</>
            : <><span style={{ fontSize: 20 }}>↑</span> Ouvrir la file d'attente</>}
        </button>

        {/* Flow rate control */}
        <div style={s.flowControl}>
          <button onClick={() => onSetFlowRate(-1)} disabled={flow_rate <= 1}
            style={s.flowBtn(flow_rate <= 1)}>−</button>
          <div style={s.flowCenter}>
            <div style={s.flowCenterLabel}>Affluence</div>
            <div style={s.flowCenterValue}>{flowLabel}</div>
            <div style={s.flowDots}>
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} style={s.flowDot(n <= flow_rate)} />
              ))}
            </div>
          </div>
          <button onClick={() => onSetFlowRate(+1)} disabled={flow_rate >= 5}
            style={s.flowBtn(flow_rate >= 5)}>+</button>
        </div>

        {/* Pause toggle */}
        <button onClick={onTogglePause} style={s.pauseBtn(is_paused)}>
          {is_paused
            ? <><span style={{ fontSize: 14 }}>▶</span> Reprendre</>
            : <><span style={{ fontSize: 13 }}>❚❚</span> Mettre en pause</>}
        </button>
      </div>

      {/* Dev toolbar — only visible in development mode */}
      {isDevMode && (
        <div style={s.devToolbar}>
          <span style={s.devLabel}>DEV</span>
          {([
            { label: '− client', fn: onDevRemoveClient },
            { label: '+ client', fn: onDevAddClient },
            { label: 'Vider la file', fn: onDevClearQueue },
          ] as const).map(({ label, fn }) => fn && (
            <button key={label} onClick={fn} style={s.devBtn}>{label}</button>
          ))}
          {onDevResetStore && (
            <button onClick={onDevResetStore} style={s.devResetBtn}>↺ Reset store</button>
          )}
        </div>
      )}
    </div>
  );
}
