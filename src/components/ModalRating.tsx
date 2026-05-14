import { useState } from 'react';
import { PALETTE, FONT } from '../tokens.ts';

interface ModalRatingProps {
  onSubmit: (rating: number, feedback: string) => void;
  onSkip: () => void;
}

export default function ModalRating({ onSubmit, onSkip }: ModalRatingProps) {
  const p = PALETTE;
  const [rating,   setRating]   = useState(0);
  const [hover,    setHover]    = useState(0);
  const [feedback, setFeedback] = useState('');

  const active = hover || rating;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(17,20,26,0.55)',
      backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'flex-end',
      animation: 'vagueoFadeIn 0.2s ease',
    }}>
      <div style={{
        width: '100%',
        background: p.paper,
        borderRadius: '24px 24px 0 0',
        padding: '32px 24px 48px',
        animation: 'vagueoSlideUp 0.32s cubic-bezier(0.32, 0.72, 0, 1)',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: p.line, margin: '0 auto 28px' }} />

        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>
          Votre avis compte
        </div>
        <div style={{ fontSize: 13, color: p.mute, marginBottom: 32, lineHeight: 1.5 }}>
          Comment s'est passé votre passage au stand ?
        </div>

        {/* Stars */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 28 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              style={{
                border: 0, background: 'none', cursor: 'pointer', padding: '4px 6px',
                fontSize: 38, lineHeight: 1,
                color: active >= n ? 'oklch(0.74 0.18 55)' : p.line,
                transform: active >= n ? 'scale(1.15)' : 'scale(1)',
                transition: 'color 0.1s, transform 0.1s',
              }}
            >
              ★
            </button>
          ))}
        </div>

        {/* Rating label */}
        {rating > 0 && (
          <div style={{ textAlign: 'center', fontSize: 13, color: p.mute, marginBottom: 20, height: 18 }}>
            {['', 'Très mauvais', 'Mauvais', 'Correct', 'Bien', 'Excellent !'][rating]}
          </div>
        )}

        {/* Feedback */}
        {rating > 0 && (
          <textarea
            placeholder="Un axe d'amélioration ? (facultatif)"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            maxLength={300}
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box',
              border: `1.5px solid ${p.line}`, borderRadius: 14,
              padding: '12px 14px', marginBottom: 20,
              fontFamily: FONT, fontSize: 14, color: p.ink,
              background: p.paper, resize: 'none', outline: 'none',
              transition: 'border-color 0.15s',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'oklch(0.46 0.13 250)'; }}
            onBlur={(e)  => { e.currentTarget.style.borderColor = p.line; }}
          />
        )}

        <button
          onClick={() => rating > 0 ? onSubmit(rating, feedback) : onSkip()}
          style={{
            width: '100%', minHeight: 54,
            border: 0, outline: 0, cursor: 'pointer',
            background: rating > 0 ? p.ink : p.line,
            color: rating > 0 ? p.paper : p.mute,
            borderRadius: 16, fontFamily: FONT, fontSize: 16, fontWeight: 600,
            marginBottom: 10,
            transition: 'background 0.2s, color 0.2s',
          }}
        >
          {rating > 0 ? 'Envoyer mon avis' : 'Passer sans noter'}
        </button>

        {rating > 0 && (
          <button
            onClick={onSkip}
            style={{
              width: '100%', minHeight: 44,
              border: 0, background: 'none', cursor: 'pointer',
              color: p.mute, fontFamily: FONT, fontSize: 14,
            }}
          >
            Passer
          </button>
        )}
      </div>
    </div>
  );
}
