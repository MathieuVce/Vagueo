// Re-exports from the design system — use src/ui/design.ts for new files
export { COLOR, TEXT, SIZE, SHADOW, ANIM } from './ui/design.ts';
export type { } from './ui/design.ts';

// ─── Palette (alias backward-compat) ──────────────────────────
import { COLOR as C, FONT as F } from './ui/design.ts';

export const PALETTE = {
  paper:    C.paper,
  ink:      C.ink,
  mute:     C.mute,
  line:     C.line,
  wait:     C.primary,
  waitSoft: C.primarySoft,
  call:     C.accent,
  callSoft: C.accentSoft,
} as const;

// The vendor picks a color; the client displays it on their confirmation screen.
// Anti-fraud proof: live color + live clock = impossible to fake with a screenshot.
export const SECURE_COLORS = [
  { name: 'Rose',   hex: '#FF6B9D' },
  { name: 'Orange', hex: '#FF9F43' },
  { name: 'Citron', hex: '#FECA57' },
  { name: 'Menthe', hex: '#1DD1A1' },
  { name: 'Ciel',   hex: '#54A0FF' },
];

export type SecureColor = (typeof SECURE_COLORS)[number];

// ─── Flow rate ────────────────────────────────────────────────
// 1 = very slow → 5 = sprint
export const FLOW_RATE_LABELS    = ['Forte affluence', 'Assez chargé', 'Flux normal', 'Peu chargé', 'Faible affluence'] as const;
export const FLOW_RATE_DEFAULT   = 3;
export const FLOW_SLOW_DEFAULT   = 5;   // min/person at level 1
export const FLOW_SPRINT_DEFAULT = 1;   // min/person at level 5

// Linear interpolation between slow (level 1) and sprint (level 5).
export function calcMinPerPerson(level: number, slow = FLOW_SLOW_DEFAULT, sprint = FLOW_SPRINT_DEFAULT): number {
  return +((slow + (sprint - slow) * (level - 1) / 4).toFixed(2));
}

// Interval (ms) between automatic wave advances.
export function waveIntervalMs(minPerPerson: number): number {
  return WAVE_SIZE * minPerPerson * 60_000;
}

// ─── Queue ────────────────────────────────────────────────────
// Read from ?stand= in the URL. Empty string when absent (invalid/create flow).
// Each QR code = one URL = one isolated stand.
export const STAND_ID  = new URLSearchParams(window.location.search).get('stand') ?? '';
export const WAVE_SIZE = 5;   // positions added when a client requests a delay

// ─── Adaptive calling ─────────────────────────────────────────
// Orange triggered when estimatedWait ≤ call_ahead_min × CALL_BUFFER_FACTOR.
// The buffer accounts for travel time + non-app users in the physical queue.
export const CALL_AHEAD_MIN_DEFAULT = 8;    // minutes, overridden per stand
export const CALL_BUFFER_FACTOR     = 1.3;  // 30 % buffer on top of the threshold

// EMA smoothing factor for service time learning.
export const EMA_ALPHA = 0.2;

// ─── Timeouts ─────────────────────────────────────────────────
// Orange: delay before showing the modal when the client hasn't confirmed presence
export const ORANGE_PROMPT_MS   = 3 * 60_000;  // 3 min after being called
export const ORANGE_RESPONSE_MS = 2 * 60_000;  // 2 min to respond to the modal

// Green: delay before asking whether the client is still being served.
// Floor at 10 min, then 5× average time per person — leaves time for the
// physical queue + order retrieval before nagging the client.
export function calcServicePromptMs(minPerPerson = 3): number {
  return Math.max(10, minPerPerson * 5) * 60_000;
}
export const SERVICE_RESPONSE_MS = 2 * 60_000;

// Wave slots added when the client requests a delay (usable once only)
export const DELAY_WAVES = 4;

// ─── Typography (aliases backward-compat) ─────────────────────
export const FONT       = F.sans;
export const FONT_MONO  = F.mono;
export const FONT_SERIF = F.serif;
