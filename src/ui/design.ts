import type { CSSProperties } from 'react';

// ─── Colors ──────────────────────────────────────────────────────
export const COLOR = {
  // Base
  paper:        '#fbfaf7',
  ink:          '#11141a',
  mute:         '#6b6f78',
  line:         'rgba(17,20,26,0.08)',
  lineMid:      'rgba(17,20,26,0.15)',
  surface:      'oklch(0.97 0.005 250)',
  overlay:      'rgba(17,20,26,0.50)',

  // Primary (queue blue)
  primary:      'oklch(0.46 0.13 250)',
  primarySoft:  'oklch(0.92 0.04 250)',
  primaryBg:    'oklch(0.96 0.03 250)',

  // Accent (orange appel)
  accent:       'oklch(0.74 0.18 55)',
  accentSoft:   'oklch(0.95 0.06 70)',

  // Success
  success:      'oklch(0.42 0.16 142)',
  successMid:   'oklch(0.68 0.15 142)',
  successBg:    'oklch(0.94 0.07 142)',

  // Danger
  danger:       '#c0392b',
  dangerBg:     'rgba(192,57,43,0.05)',
  dangerLine:   'rgba(192,57,43,0.30)',

  // Warning
  warning:      'oklch(0.50 0.14 55)',
  warningBg:    'oklch(0.97 0.04 55)',
  warningLine:  'oklch(0.90 0.06 55)',
} as const;

// ─── Typography ───────────────────────────────────────────────────
export const FONT = {
  sans:  '"Inter Tight", "Helvetica Neue", system-ui, -apple-system, sans-serif',
  mono:  '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace',
  serif: '"Instrument Serif", "Cormorant Garamond", Georgia, serif',
} as const;

type TS = CSSProperties;

export const TEXT = {
  display: { fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 32, letterSpacing: '-0.02em', lineHeight: 1.1 } satisfies TS,
  h1:      { fontFamily: FONT.sans, fontWeight: 700, fontSize: 24, letterSpacing: '-0.02em' } satisfies TS,
  h2:      { fontFamily: FONT.sans, fontWeight: 700, fontSize: 18, letterSpacing: '-0.01em' } satisfies TS,
  h3:      { fontFamily: FONT.sans, fontWeight: 600, fontSize: 15 } satisfies TS,
  body:    { fontFamily: FONT.sans, fontSize: 14, lineHeight: 1.5 } satisfies TS,
  bodyLg:  { fontFamily: FONT.sans, fontSize: 16, lineHeight: 1.5 } satisfies TS,
  small:   { fontFamily: FONT.sans, fontSize: 12, lineHeight: 1.4 } satisfies TS,
  label:   { fontFamily: FONT.sans, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 } satisfies TS,
  caption: { fontFamily: FONT.sans, fontSize: 10, letterSpacing: '0.06em' } satisfies TS,
  mono:    { fontFamily: FONT.mono, fontSize: 13 } satisfies TS,
  monoLg:  { fontFamily: FONT.mono, fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' } satisfies TS,
  monoSm:  { fontFamily: FONT.mono, fontSize: 11 } satisfies TS,
};

// ─── Sizing (espacements, rayons, hauteurs) ───────────────────────
export const SIZE = {
  // Spacing
  0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48,
  // Border radii
  r2: 8, r3: 12, r4: 16, r5: 20, r6: 24, rFull: 9999,
  // Touch targets / composants
  tapMin: 44,
  btnSm:  36,
  btnMd:  46,
  btnLg:  54,
} as const;

// ─── Ombres ───────────────────────────────────────────────────────
export const SHADOW = {
  sm: '0 1px 4px rgba(0,0,0,0.08)',
  md: '0 4px 16px rgba(0,0,0,0.10)',
  lg: '0 8px 32px rgba(0,0,0,0.14)',
  xl: '0 20px 60px rgba(0,0,0,0.18)',
} as const;

// ─── Animations ───────────────────────────────────────────────────
export const ANIM = {
  fast:    '0.15s ease',
  base:    '0.20s ease',
  fadeIn:  'vagueoFadeIn 0.25s ease',
  slideUp: 'vagueoSlideUp 0.32s cubic-bezier(0.32,0.72,0,1)',
} as const;
