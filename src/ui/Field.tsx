import { useId, type CSSProperties } from 'react';
import { COLOR, FONT, SIZE, TEXT } from './design.ts';

const s = {
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  } satisfies CSSProperties,
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '11px 13px',
    border: `1.5px solid ${COLOR.line}`,
    borderRadius: SIZE.r3,
    outline: 'none',
    fontFamily: FONT.sans,
    fontSize: 14,
    color: COLOR.ink,
    background: COLOR.paper,
  } satisfies CSSProperties,
  label: {
    ...TEXT.label,
    color: COLOR.mute,
  } satisfies CSSProperties,
  numberWrap: {
    position: 'relative',
  } satisfies CSSProperties,
  unit: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: 11,
    color: COLOR.mute,
    pointerEvents: 'none',
  } satisfies CSSProperties,
};

interface FieldProps {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'url' | 'password';
  max?: number;
  style?: CSSProperties;
  readOnly?: boolean;
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  max,
  style,
  readOnly,
}: FieldProps) {
  const id = useId();
  return (
    <div style={s.wrap}>
      {label && (
        <label htmlFor={id} style={s.label}>
          {label}
        </label>
      )}
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        maxLength={max}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...s.input, ...style }}
      />
    </div>
  );
}

interface NumberFieldProps {
  label?: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  style?: CSSProperties;
}

export function NumberField({
  label,
  value,
  onChange,
  unit,
  min,
  max,
  step = 1,
  style,
}: NumberFieldProps) {
  const id = useId();
  return (
    <div style={{ ...s.wrap, flex: 1 }}>
      {label && (
        <label htmlFor={id} style={s.label}>
          {label}
        </label>
      )}
      <div style={s.numberWrap}>
        <input
          id={id}
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            ...s.input,
            paddingRight: unit ? 64 : 13,
            textAlign: 'center',
            fontSize: 18,
            fontWeight: 600,
            ...style,
          }}
        />
        {unit && <span style={s.unit}>{unit}</span>}
      </div>
    </div>
  );
}
