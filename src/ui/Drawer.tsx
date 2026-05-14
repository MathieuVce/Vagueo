import type { CSSProperties, ReactNode } from 'react';
import { COLOR, SIZE, ANIM, FONT } from './design.ts';

interface DrawerProps {
  onClose:   () => void;
  children:  ReactNode;
  maxWidth?: number;
  header?:   ReactNode;
}

const s = {
  backdrop: {
    position: 'fixed', inset: 0, zIndex: 200,
    background: COLOR.overlay, backdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    animation: ANIM.fadeIn,
  } satisfies CSSProperties,
  sheet: (maxWidth: number): CSSProperties => ({
    width: '100%', maxWidth,
    background: COLOR.paper,
    borderRadius: `${SIZE.r6}px ${SIZE.r6}px 0 0`,
    maxHeight: '92vh', overflowY: 'auto',
    animation: ANIM.slideUp,
  }),
  handleRow: {
    display: 'flex', justifyContent: 'center', padding: '12px 0 0',
  } satisfies CSSProperties,
  handle: {
    width: 36, height: 4, borderRadius: SIZE.rFull, background: COLOR.line,
  } satisfies CSSProperties,
  stickyHeader: {
    position: 'sticky', top: 0, background: COLOR.paper, zIndex: 10,
    padding: '16px 24px 14px',
    borderBottom: `1px solid ${COLOR.line}`,
  } satisfies CSSProperties,
  body: {
    padding: '0 0 48px',
  } satisfies CSSProperties,
  drawerBody: {
    padding: '24px 24px 0', display: 'flex', flexDirection: 'column', gap: 20,
  } satisfies CSSProperties,
  headerRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
  } satisfies CSSProperties,
  headerTitle: {
    fontFamily: FONT.sans, fontWeight: 700, fontSize: 17, letterSpacing: '-0.01em',
  } satisfies CSSProperties,
  headerSub: {
    fontFamily: FONT.sans, fontSize: 11, color: COLOR.mute, marginTop: 2,
  } satisfies CSSProperties,
  headerExtra: {
    marginTop: 10,
  } satisfies CSSProperties,
  closeBtn: {
    border: `1px solid ${COLOR.line}`, borderRadius: SIZE.r2,
    width: 34, height: 34, cursor: 'pointer',
    background: 'transparent', color: COLOR.mute, fontSize: 18,
    flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: FONT.sans,
  } satisfies CSSProperties,
};

export function Drawer({ onClose, children, maxWidth = 560, header }: DrawerProps) {
  return (
    <div style={s.backdrop} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={s.sheet(maxWidth)}>
        {/* Drag handle */}
        <div style={s.handleRow}>
          <div style={s.handle} />
        </div>

        {header && (
          <div style={s.stickyHeader}>{header}</div>
        )}

        <div style={s.body}>{children}</div>
      </div>
    </div>
  );
}

export function DrawerBody({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ ...s.drawerBody, ...style }}>{children}</div>
  );
}

interface DrawerHeaderProps {
  title:     string;
  subtitle?: string;
  onClose:   () => void;
  extra?:    ReactNode;
}

export function DrawerHeader({ title, subtitle, onClose, extra }: DrawerHeaderProps) {
  return (
    <div style={s.headerRow}>
      <div>
        <div style={s.headerTitle}>{title}</div>
        {subtitle && <div style={s.headerSub}>{subtitle}</div>}
        {extra && <div style={s.headerExtra}>{extra}</div>}
      </div>
      <button onClick={onClose} style={s.closeBtn}>×</button>
    </div>
  );
}
