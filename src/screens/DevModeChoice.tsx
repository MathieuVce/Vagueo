import { PALETTE, FONT, FONT_SERIF } from '../tokens.ts';

interface DevModeChoiceProps {
  onTestMode: () => void;
  onGoogleMode: () => void;
  signingIn?: boolean;
  error?: string | null;
}

// Fix #4: extracted from VendorApp into its own screen component.
export default function DevModeChoice({
  onTestMode, onGoogleMode, signingIn = false, error = null,
}: DevModeChoiceProps) {
  const p = PALETTE;
  return (
    <div style={{
      width: '100%', height: '100%',
      background: p.paper, fontFamily: FONT,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '0 32px', gap: 0,
      animation: 'vagueoFadeIn 0.25s ease',
    }}>
      <div style={{
        fontFamily: FONT_SERIF, fontStyle: 'italic',
        fontSize: 38, letterSpacing: '-0.03em', lineHeight: 1.1,
        textAlign: 'center', marginBottom: 10,
      }}>
        Connexion
      </div>
      <div style={{ fontSize: 13, color: p.mute, textAlign: 'center', lineHeight: 1.6, maxWidth: 260, marginBottom: 36 }}>
        Choisissez votre mode de connexion.
      </div>

      <button
        onClick={onGoogleMode}
        disabled={signingIn}
        style={{
          width: '100%', maxWidth: 320, minHeight: 52,
          border: 0, borderRadius: 16,
          background: p.ink, color: p.paper,
          fontFamily: FONT, fontSize: 15, fontWeight: 600,
          cursor: signingIn ? 'default' : 'pointer', letterSpacing: '-0.01em',
          marginBottom: 12, opacity: signingIn ? 0.6 : 1,
          transition: 'opacity 0.15s',
        }}
      >
        {signingIn ? 'Connexion en cours…' : 'Se connecter avec Google'}
      </button>

      {error && (
        <div style={{ marginBottom: 12, fontSize: 12, color: 'oklch(0.5 0.18 25)', textAlign: 'center', maxWidth: 280 }}>
          {error}
        </div>
      )}

      <button
        onClick={onTestMode}
        disabled={signingIn}
        style={{
          width: '100%', maxWidth: 320, minHeight: 52,
          border: `1.5px solid ${p.line}`, borderRadius: 16,
          background: 'transparent', color: p.ink,
          fontFamily: FONT, fontSize: 15,
          cursor: signingIn ? 'default' : 'pointer', letterSpacing: '-0.01em',
          opacity: signingIn ? 0.4 : 1,
          transition: 'opacity 0.15s',
        }}
      >
        Continuer en mode test
      </button>

      <div style={{ marginTop: 16, fontSize: 11, color: p.mute, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        DEV
      </div>
    </div>
  );
}
