import type { CSSProperties, ReactNode } from 'react';
import { COLOR, FONT, SIZE, ANIM } from './design.ts';

type Variant = 'primary' | 'ghost' | 'danger' | 'accent';
type BtnSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
  size?: BtnSize;
  full?: boolean;
  style?: CSSProperties;
  type?: 'button' | 'submit';
}

const heights: Record<BtnSize, number> = { sm: SIZE.btnSm, md: SIZE.btnMd, lg: SIZE.btnLg };
const fontSizes: Record<BtnSize, number> = { sm: 12, md: 14, lg: 16 };
const pads: Record<BtnSize, string> = { sm: '0 12px', md: '0 18px', lg: '0 24px' };
const radii: Record<BtnSize, number> = { sm: SIZE.r2, md: SIZE.r3, lg: SIZE.r4 };

const variantStyles: Record<Variant, CSSProperties> = {
  primary: { background: COLOR.ink, color: COLOR.paper, border: 'none' },
  ghost: { background: 'transparent', color: COLOR.mute, border: `1px solid ${COLOR.line}` },
  danger: {
    background: COLOR.dangerBg,
    color: COLOR.danger,
    border: `1px solid ${COLOR.dangerLine}`,
  },
  accent: { background: COLOR.accent, color: '#fff', border: 'none' },
};

const base: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: FONT.sans,
  fontWeight: 600,
  transition: `opacity ${ANIM.fast}, background ${ANIM.fast}`,
};

export function Button({
  children,
  onClick,
  disabled,
  loading,
  variant = 'primary',
  size = 'md',
  full,
  style,
  type = 'button',
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      style={{
        ...base,
        width: full ? '100%' : undefined,
        minHeight: heights[size],
        padding: pads[size],
        borderRadius: radii[size],
        fontSize: fontSizes[size],
        cursor: isDisabled ? (loading ? 'wait' : 'not-allowed') : 'pointer',
        opacity: disabled && !loading ? 0.5 : 1,
        ...variantStyles[variant],
        ...style,
      }}
    >
      {loading ? '…' : children}
    </button>
  );
}
