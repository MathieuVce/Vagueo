import { describe, it, expect } from 'vitest';
import {
  calcMinPerPerson,
  waveIntervalMs,
  calcServicePromptMs,
  WAVE_SIZE,
  WAVE_LEAD,
  CALL_AHEAD_WAVES,
  FLOW_RATE_DEFAULT,
  FLOW_SLOW_DEFAULT,
  FLOW_SPRINT_DEFAULT,
  CALL_AHEAD_MIN_DEFAULT,
  CALL_BUFFER_FACTOR,
  EMA_ALPHA,
  DELAY_WAVES,
} from './tokens.ts';

// Vérifie que les maths de vague sont justes : interpolation du débit selon
// l'affluence, durée d'une vague, seuils de relance. Pas de Firestore ici, du
// calcul pur.
describe('tokens — calculs de vague', () => {
  // ─── calcMinPerPerson : interpolation linéaire débit ↔ affluence ──
  // Niveau 1 = forte affluence (lent, 5 min/pers) → niveau 5 = faible (1 min/pers).
  describe('calcMinPerPerson (min/personne selon le niveau de débit)', () => {
    it('interpole linéairement entre le défaut lent (niv. 1) et sprint (niv. 5)', () => {
      expect(calcMinPerPerson(1)).toBe(5); // forte affluence
      expect(calcMinPerPerson(2)).toBe(4);
      expect(calcMinPerPerson(3)).toBe(3); // flux normal
      expect(calcMinPerPerson(4)).toBe(2);
      expect(calcMinPerPerson(5)).toBe(1); // faible affluence
    });

    it('gère les niveaux fractionnaires', () => {
      expect(calcMinPerPerson(2.5)).toBe(3.5);
      expect(calcMinPerPerson(1.5)).toBe(4.5);
    });

    it('décroît de façon monotone quand l’affluence baisse (niveau monte)', () => {
      const series = [1, 2, 3, 4, 5].map((n) => calcMinPerPerson(n));
      for (let i = 1; i < series.length; i++) {
        expect(series[i]).toBeLessThan(series[i - 1]);
      }
    });

    it('respecte des bornes lent/sprint personnalisées par stand', () => {
      // slow=6, sprint=2 → niv. 1 = 6, niv. 5 = 2, niv. 3 = milieu = 4
      expect(calcMinPerPerson(1, 6, 2)).toBe(6);
      expect(calcMinPerPerson(3, 6, 2)).toBe(4);
      expect(calcMinPerPerson(5, 6, 2)).toBe(2);
    });

    it('le niveau et les bornes par défaut sont cohérents', () => {
      expect(calcMinPerPerson(FLOW_RATE_DEFAULT, FLOW_SLOW_DEFAULT, FLOW_SPRINT_DEFAULT)).toBe(3);
    });

    it('arrondit à 2 décimales', () => {
      // slow=5, sprint=1, niv=2.3 → 5 + (-4)*1.3/4 = 3.7
      expect(calcMinPerPerson(2.3)).toBe(3.7);
    });
  });

  // ─── waveIntervalMs : durée d'écoulement d'une vague complète ──────
  describe('waveIntervalMs (ms entre deux avances automatiques de vague)', () => {
    it('= WAVE_SIZE × min/personne × 60 000 ms', () => {
      expect(waveIntervalMs(3)).toBe(WAVE_SIZE * 3 * 60_000); // 900 000 = 15 min
      expect(waveIntervalMs(1)).toBe(WAVE_SIZE * 1 * 60_000); // 300 000 = 5 min
      expect(waveIntervalMs(5)).toBe(WAVE_SIZE * 5 * 60_000); // 1 500 000 = 25 min
    });

    it('reste proportionnel au temps par personne (affluence)', () => {
      // forte affluence (5 min/pers) → vague 5× plus longue qu'en faible (1 min/pers)
      expect(waveIntervalMs(5)).toBe(waveIntervalMs(1) * 5);
    });

    it('relie débit et durée de vague de bout en bout', () => {
      // Niveau 3 (flux normal) = 3 min/pers → une vague de 5 = 15 min
      expect(waveIntervalMs(calcMinPerPerson(3))).toBe(15 * 60_000);
    });
  });

  // ─── calcServicePromptMs : délai avant relance « toujours en cours ? » ─
  describe('calcServicePromptMs (délai vert avant relance de service)', () => {
    it('plancher à 10 min, sinon 5× le temps par personne', () => {
      expect(calcServicePromptMs(1)).toBe(10 * 60_000); // 5 min < plancher → 10 min
      expect(calcServicePromptMs(2)).toBe(10 * 60_000); // exactement au plancher
      expect(calcServicePromptMs(3)).toBe(15 * 60_000); // 5×3 = 15 min
      expect(calcServicePromptMs(5)).toBe(25 * 60_000); // 5×5 = 25 min
    });

    it('utilise 3 min/personne par défaut', () => {
      expect(calcServicePromptMs()).toBe(15 * 60_000);
    });
  });

  // ─── Constantes de vague : on fige les valeurs métier ─────────────
  describe('constantes', () => {
    it('expose les valeurs de référence attendues', () => {
      expect(WAVE_SIZE).toBe(5);
      // WAVE_LEAD=0 : groupe servi = current_wave (estimations justes, vague 0 utilisée)
      expect(WAVE_LEAD).toBe(0);
      expect(CALL_AHEAD_WAVES).toBe(1);
      expect(CALL_AHEAD_MIN_DEFAULT).toBe(8);
      expect(CALL_BUFFER_FACTOR).toBe(1.3);
      expect(EMA_ALPHA).toBe(0.2);
      expect(DELAY_WAVES).toBe(1);
    });

    it('le seuil de passage en orange par défaut vaut 10,4 min', () => {
      expect(CALL_AHEAD_MIN_DEFAULT * CALL_BUFFER_FACTOR).toBeCloseTo(10.4, 5);
    });
  });
});
