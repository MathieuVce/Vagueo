import type { CSSProperties, ReactNode } from 'react';
import { FONT, PALETTE } from '../tokens.ts';

type ButtonVariant = 'primary' | 'ghost' | 'call' | 'danger';

interface VgButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  big?: boolean;
  blink?: boolean;
  style?: CSSProperties;
  disabled?: boolean;
}

// variant: 'primary' | 'ghost' | 'call' | 'danger'
export default function VgButton({
  children, onClick, variant = 'primary', big = false,
  blink = false, style = {}, disabled = false,
}: VgButtonProps) {
  const base: CSSProperties = {
    border: 0, outline: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: FONT, fontWeight: 500, letterSpacing: '-0.01em',
    width: '100%', minHeight: big ? 80 : 56,
    fontSize: big ? 22 : 17,
    borderRadius: big ? 22 : 16,
    padding: big ? '20px 24px' : '14px 20px',
    transition: 'transform 0.1s ease, background 0.15s',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    opacity: disabled ? 0.5 : 1,
    animation: blink ? 'vagueoBlink 1.6s ease-in-out infinite' : undefined,
  };

  const variants: Record<ButtonVariant, CSSProperties> = {
    primary: { background: PALETTE.ink,  color: PALETTE.paper },
    ghost:   { background: 'transparent', color: PALETTE.ink, border: `1px solid ${PALETTE.line}` },
    danger:  { background: 'transparent', color: PALETTE.mute, border: `1px solid ${PALETTE.line}` },
    call:    { background: PALETTE.call, color: '#fff' },
  };

  return (
    <button onClick={disabled ? undefined : onClick} style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  );
}
