// Re-exports from the design system — use src/ui/design.ts for new files
export { COLOR, TEXT, SIZE, SHADOW, ANIM } from './ui/design.ts';
export type {} from './ui/design.ts';

// ─── Palette (alias backward-compat) ──────────────────────────
import { COLOR as C, FONT as F } from './ui/design.ts';

export const PALETTE = {
  paper: C.paper,
  ink: C.ink,
  mute: C.mute,
  line: C.line,
  wait: C.primary,
  waitSoft: C.primarySoft,
  call: C.accent,
  callSoft: C.accentSoft,
} as const;

// The vendor picks a color; the client displays it on their confirmation screen.
// Anti-fraud proof: live color + live clock = impossible to fake with a screenshot.
export const SECURE_COLORS = [
  { name: 'Rose', hex: '#FF6B9D' },
  { name: 'Orange', hex: '#FF9F43' },
  { name: 'Citron', hex: '#FECA57' },
  { name: 'Menthe', hex: '#1DD1A1' },
  { name: 'Ciel', hex: '#54A0FF' },
];

export type SecureColor = (typeof SECURE_COLORS)[number];

// ─── Flow rate ────────────────────────────────────────────────
// 1 = very slow → 5 = sprint
export const FLOW_RATE_LABELS = [
  'Forte affluence',
  'Assez chargé',
  'Flux normal',
  'Peu chargé',
  'Faible affluence',
] as const;
export const FLOW_RATE_DEFAULT = 3;
export const FLOW_SLOW_DEFAULT = 5; // min/person at level 1
export const FLOW_SPRINT_DEFAULT = 1; // min/person at level 5

// Linear interpolation between slow (level 1) and sprint (level 5).
export function calcMinPerPerson(
  level: number,
  slow = FLOW_SLOW_DEFAULT,
  sprint = FLOW_SPRINT_DEFAULT,
): number {
  return +(slow + ((sprint - slow) * (level - 1)) / 4).toFixed(2);
}

// Interval (ms) between automatic wave advances.
export function waveIntervalMs(minPerPerson: number): number {
  return WAVE_SIZE * minPerPerson * 60_000;
}

// ─── Queue ────────────────────────────────────────────────────
// Read from ?stand= in the URL. Empty string when absent (invalid/create flow).
// Each QR code = one URL = one isolated stand.
export const STAND_ID = new URLSearchParams(window.location.search).get('stand') ?? '';

// ─── Vagues ───────────────────────────────────────────────────
// Modèle par vagues (pas de numéro individuel) : on rejoint une vague, et c'est
// la vague entière qui passe. Affectation hybride = fenêtre de temps (la vague en
// assemblage avance avec current_wave) plafonnée à WAVE_SIZE (le surplus déborde
// sur la vague suivante).
export const WAVE_SIZE = 5; // capacité max d'une vague (plafond hybride)
// Décalage de la vague d'assemblage par rapport à la vague en cours.
// 0 = on rejoint la vague courante (« groupe servi = current_wave », estimations
// justes, premier groupe = vague 0 ; un retardataire peut rejoindre le groupe en
// cours s'il reste de la place). Mettre 1 pour « fermer » le groupe courant aux
// retardataires (au prix d'un current_wave en retard d'une vague).
export const WAVE_LEAD = 0;

// ─── Adaptive calling ─────────────────────────────────────────
// Orange déclenché quand la vague du client est à ≤ CALL_AHEAD_WAVES de la vague
// en cours (« une vague à l'avance » → le groupe a le temps d'arriver).
export const CALL_AHEAD_WAVES = 1;
// Anciens seuils (modèle par position) conservés pour compat/config vendeur ;
// plus utilisés par le déclencheur orange désormais basé sur les vagues.
export const CALL_AHEAD_MIN_DEFAULT = 8; // minutes, overridden per stand
export const CALL_BUFFER_FACTOR = 1.3; // 30 % buffer on top of the threshold

// EMA smoothing factor for service time learning.
export const EMA_ALPHA = 0.2;
// Plafond anti-aberration : un service mesuré au-delà de EMA_OUTLIER_FACTOR × la
// référence (EMA en place, ou base du slider pour les premiers services) est
// ramené à ce plafond avant d'alimenter l'apprentissage. Empêche un client qui
// laisse l'écran ouvert sans cliquer « terminé » de polluer la moyenne.
export const EMA_OUTLIER_FACTOR = 3;

// ─── Timeouts ─────────────────────────────────────────────────
// Orange: delay before showing the modal when the client hasn't confirmed presence
export const ORANGE_PROMPT_MS = 3 * 60_000; // 3 min after being called
export const ORANGE_RESPONSE_MS = 2 * 60_000; // 2 min to respond to the modal

// Green: delay before asking whether the client is still being served.
// Floor at 10 min, then 5× average time per person — leaves time for the
// physical queue + order retrieval before nagging the client.
export function calcServicePromptMs(minPerPerson = 3): number {
  return Math.max(10, minPerPerson * 5) * 60_000;
}
export const SERVICE_RESPONSE_MS = 2 * 60_000;

// Nombre de vagues ajoutées lors d'un décalage (utilisable une fois)
export const DELAY_WAVES = 1;

// ─── Filet de sécurité (reaper vendeur) ───────────────────────────
// Le self-timeout côté client ne se déclenche que si SON onglet est ouvert. Côté
// vendeur (toujours présent, droits de suppression), on purge en dernier recours
// les fantômes : appelés sans réponse, ou servis sans clic « terminé ». Les
// seuils dépassent volontairement le self-timeout client (+ STALE_GRACE_MS) pour
// ne jamais court-circuiter le parcours normal.
export const REAPER_INTERVAL_MS = 60_000; // fréquence de balayage
export const STALE_GRACE_MS = 5 * 60_000; // marge au-delà du self-timeout client

// Heartbeat de présence : tant que l'onglet client est visible, il signale qu'il
// est vivant toutes les HEARTBEAT_INTERVAL_MS. Au-delà de HEARTBEAT_STALE_MS sans
// signal, on considère l'onglet fermé. Sert surtout au cas « claimed » (écran de
// validation, censé être au premier plan) : un onglet vif n'est jamais purgé même
// sur un service long, et un onglet fermé l'est en quelques minutes au lieu de
// ~20. NB : les navigateurs bridant les timers en arrière-plan, on garde les
// seuils coarse (orange/waiting) pour tolérer un téléphone verrouillé en attente.
export const HEARTBEAT_INTERVAL_MS = 25_000;
export const HEARTBEAT_STALE_MS = 5 * 60_000;
export const ORANGE_STALE_MS = ORANGE_PROMPT_MS + ORANGE_RESPONSE_MS + STALE_GRACE_MS;
export function calcServiceStaleMs(minPerPerson = 3): number {
  return calcServicePromptMs(minPerPerson) + SERVICE_RESPONSE_MS + STALE_GRACE_MS;
}
// Un client « waiting » dont l'onglet est fermé n'émet aucun signal de timeout.
// On le purge seulement après un délai très long depuis l'inscription (garbage
// collection des abandons), volontairement large pour ne jamais retirer quelqu'un
// qui patiente encore légitimement.
export const WAITING_STALE_MS = 2 * 60 * 60_000; // 2 h

// ─── Typography (aliases backward-compat) ─────────────────────
export const FONT = F.sans;
export const FONT_MONO = F.mono;
export const FONT_SERIF = F.serif;
