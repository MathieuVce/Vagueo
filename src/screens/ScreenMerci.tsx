import VgButton from '../components/VgButton.tsx';
import { PALETTE, FONT_SERIF, FONT } from '../tokens.ts';

interface ScreenMerciProps {
  onRestart: () => void;
}

export default function ScreenMerci({ onRestart }: ScreenMerciProps) {
  const p = PALETTE;
  return (
    <div style={{
      width: '100%', height: '100%',
      background: p.paper, color: p.ink,
      fontFamily: FONT,
      display: 'flex', flexDirection: 'column',
      position: 'relative', overflow: 'hidden',
      animation: 'vagueoFadeIn 0.4s ease',
    }}>
      {/* Decorative wave lines */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.5 }}>
        <svg viewBox="0 0 400 800" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <path key={i}
              d={`M-50 ${500 + i * 28} Q 100 ${440 + i * 28} 200 ${500 + i * 28} T 450 ${500 + i * 28}`}
              stroke={p.line} strokeWidth="1" fill="none" />
          ))}
        </svg>
      </div>

      <div style={{
        flex: 1, padding: '0 32px',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', position: 'relative',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: p.ink, color: p.paper,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28,
        }}>
          ✓
        </div>
        <div style={{ marginTop: 28, fontFamily: FONT_SERIF, fontStyle: 'italic', fontSize: 48, lineHeight: 1, letterSpacing: '-0.02em' }}>
          À bientôt !
        </div>
        <div style={{ marginTop: 14, fontSize: 14, color: p.mute, maxWidth: 280, lineHeight: 1.5 }}>
          Votre session est terminée.<br />Vous pouvez fermer cette page.
        </div>
      </div>

      <div style={{ padding: '0 22px 40px', position: 'relative' }}>
        <VgButton onClick={onRestart} variant="ghost" style={{ fontSize: 14 }}>
          Rejoindre une nouvelle file
        </VgButton>
      </div>
    </div>
  );
}
