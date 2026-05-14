import VagueoLogo     from '../components/VagueoLogo.tsx';
import WaveBackground from '../components/WaveBackground.tsx';
import { PALETTE, FONT_SERIF, FONT } from '../tokens.ts';

interface ScreenCheckinProps {
  onConfirm: () => void;
  onDelay: () => void;
  delayUsed?: boolean;
  delayMin?: number;
}

export default function ScreenCheckin({ onConfirm, onDelay, delayUsed = false, delayMin = 10 }: ScreenCheckinProps) {
  const p = PALETTE;
  return (
    <div style={{
      width: '100%', height: '100%',
      background: p.call, color: '#fff',
      fontFamily: FONT, position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      animation: 'vagueoFadeIn 0.3s ease',
    }}>
      {/* Wave overlay */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.15 }}>
        <WaveBackground progress={1} color="#fff" soft="transparent" />
      </div>

      {/* Top bar */}
      <div style={{
        position: 'relative', zIndex: 2,
        padding: '14px 22px 0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <VagueoLogo size={20} color="#fff" accent="#fff" />
        <div style={{
          fontSize: 11, color: 'rgba(255,255,255,0.85)',
          textTransform: 'uppercase', letterSpacing: '0.14em',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: 99, background: '#fff',
            animation: 'vagueoSlowPulse 0.9s ease-in-out infinite',
          }} />
          C'est à vous
        </div>
      </div>

      {/* Center message */}
      <div style={{
        position: 'relative', zIndex: 2,
        flex: 1, padding: '0 24px',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center',
      }}>
        <div style={{
          fontFamily: FONT_SERIF, fontStyle: 'italic',
          fontSize: 64, lineHeight: 0.95, letterSpacing: '-0.03em',
        }}>
          Approchez<br />du stand
        </div>
        <div style={{ marginTop: 18, fontSize: 14, color: 'rgba(255,255,255,0.88)', maxWidth: 280, lineHeight: 1.5 }}>
          Confirmez votre présence pour recevoir votre commande.
        </div>
      </div>

      {/* Big pulsing CTA */}
      <div style={{ position: 'relative', zIndex: 2, padding: '0 22px 38px' }}>
        <button
          onClick={onConfirm}
          style={{
            width: '100%', minHeight: 112,
            border: 0, outline: 0, cursor: 'pointer',
            background: '#fff', color: p.call,
            borderRadius: 28,
            fontFamily: FONT, fontSize: 22, fontWeight: 600,
            letterSpacing: '-0.01em',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 2,
            animation: 'vagueoBlink 1.4s ease-in-out infinite',
          }}
        >
          <span>JE SUIS DEVANT</span>
          <span>LE STAND</span>
        </button>
        <div style={{ marginTop: 10, textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.04em' }}>
          Appuyez uniquement lorsque vous êtes devant le vendeur
        </div>
        {!delayUsed && (
          <button
            onClick={onDelay}
            style={{
              marginTop: 16, width: '100%',
              border: '1.5px solid rgba(255,255,255,0.28)',
              borderRadius: 16, padding: '13px 16px',
              background: 'rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.82)',
              fontFamily: FONT, fontSize: 13, cursor: 'pointer',
              letterSpacing: '-0.01em',
            }}
          >
            Pas encore là — décaler d'environ {delayMin} min
          </button>
        )}
      </div>
    </div>
  );
}
