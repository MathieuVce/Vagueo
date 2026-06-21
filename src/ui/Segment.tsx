import type { CSSProperties } from 'react';
import { COLOR, FONT, SIZE, ANIM } from './design.ts';

interface SegmentOption<T> {
  value: T;
  label: string;
  sublabel?: string;
}

interface SegmentProps<T> {
  value: T;
  onChange: (v: T) => void;
  options: [SegmentOption<T>, SegmentOption<T>];
  style?: CSSProperties;
}

const s = {
  row: {
    display: 'flex',
    gap: 8,
  } satisfies CSSProperties,
  btn: (active: boolean): CSSProperties => ({
    flex: 1,
    padding: '10px 12px',
    borderRadius: SIZE.r3,
    cursor: 'pointer',
    border: `1.5px solid ${active ? COLOR.primary : COLOR.line}`,
    background: active ? COLOR.primaryBg : 'transparent',
    fontFamily: FONT.sans,
    fontSize: 13,
    textAlign: 'center',
    color: active ? COLOR.ink : COLOR.mute,
    fontWeight: active ? 600 : 400,
    transition: `all ${ANIM.fast}`,
  }),
  sublabel: (active: boolean): CSSProperties => ({
    fontSize: 11,
    color: active ? COLOR.mute : COLOR.line,
    marginTop: 2,
  }),
};

export function Segment<T>({ value, onChange, options, style }: SegmentProps<T>) {
  return (
    <div style={{ ...s.row, ...style }}>
      {options.map((opt, i) => {
        const active = value === opt.value;
        return (
          <button key={i} onClick={() => onChange(opt.value)} style={s.btn(active)}>
            <div>{opt.label}</div>
            {opt.sublabel && <div style={s.sublabel(active)}>{opt.sublabel}</div>}
          </button>
        );
      })}
    </div>
  );
}
