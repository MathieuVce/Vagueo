import type { CSSProperties } from 'react';
import { COLOR, FONT, SIZE, ANIM } from './design.ts';

interface ToggleProps {
  on: boolean;
  onToggle: () => void;
  label: string;
  sublabel?: string;
  style?: CSSProperties;
}

const s = {
  knobTrack: (on: boolean): CSSProperties => ({
    width: 42,
    height: 24,
    borderRadius: SIZE.rFull,
    flexShrink: 0,
    marginLeft: 14,
    background: on ? COLOR.primary : COLOR.line,
    position: 'relative',
    transition: `background ${ANIM.base}`,
  }),
  knob: (on: boolean): CSSProperties => ({
    position: 'absolute',
    top: 2,
    left: on ? 20 : 2,
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: '#fff',
    boxShadow: '0 1px 4px rgba(0,0,0,0.20)',
    transition: `left ${ANIM.base}`,
  }),
  label: {
    fontFamily: FONT.sans,
    fontSize: 14,
    fontWeight: 600,
    color: COLOR.ink,
  } satisfies CSSProperties,
  sublabel: {
    fontFamily: FONT.sans,
    fontSize: 12,
    color: COLOR.mute,
    marginTop: 2,
  } satisfies CSSProperties,
};

export function Toggle({ on, onToggle, label, sublabel, style }: ToggleProps) {
  return (
    <div
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '13px 16px',
        borderRadius: SIZE.r4,
        cursor: 'pointer',
        userSelect: 'none',
        border: `1.5px solid ${on ? COLOR.primary : COLOR.line}`,
        background: on ? COLOR.primaryBg : 'transparent',
        transition: `border-color ${ANIM.base}, background ${ANIM.base}`,
        ...style,
      }}
    >
      <div>
        <div style={s.label}>{label}</div>
        {sublabel && <div style={s.sublabel}>{sublabel}</div>}
      </div>
      {/* Knob */}
      <div style={s.knobTrack(on)}>
        <div style={s.knob(on)} />
      </div>
    </div>
  );
}
