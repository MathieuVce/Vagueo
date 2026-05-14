import VagueoLogo from '../components/VagueoLogo.tsx';
import { PALETTE, FONT, FONT_SERIF } from '../tokens.ts';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.013 17.64 11.71 17.64 9.2z"/>
    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
    <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
  </svg>
);

interface ScreenVendorLoginProps {
  standName: string | null;
  onSignIn: () => void;
  error: string | null;
  loading: boolean;
}

export default function ScreenVendorLogin({ standName, onSignIn, error, loading }: ScreenVendorLoginProps) {
  const p = PALETTE;

  return (
    <div style={{
      width: '100%', height: '100%',
      background: p.paper, color: p.ink,
      fontFamily: FONT,
      display: 'flex', flexDirection: 'column',
      animation: 'vagueoFadeIn 0.3s ease',
    }}>
      {/* Decorative top band */}
      <div style={{ height: 6, background: `linear-gradient(90deg, oklch(0.46 0.13 250), oklch(0.74 0.18 55))` }} />

      {/* Main content */}
      <div style={{
        flex: 1,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '0 32px',
      }}>
        <VagueoLogo size={48} color={p.ink} accent={p.wait} />

        <div style={{
          marginTop: 20,
          fontFamily: FONT_SERIF, fontStyle: 'italic',
          fontSize: 28, letterSpacing: '-0.02em', textAlign: 'center',
        }}>
          {standName ? `Gérer ${standName}` : 'Tableau de bord vendeur'}
        </div>

        <div style={{ marginTop: 6, fontSize: 13, color: p.mute, textAlign: 'center', lineHeight: 1.5 }}>
          Accès réservé au gérant du stand.
        </div>

        <div style={{ marginTop: 52, width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={onSignIn}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
              width: '100%', padding: '15px 20px',
              background: '#fff',
              border: '1.5px solid rgba(0,0,0,0.12)',
              borderRadius: 14, cursor: loading ? 'wait' : 'pointer',
              fontFamily: FONT, fontSize: 15, fontWeight: 500, color: '#1f1f1f',
              boxShadow: '0 1px 8px rgba(0,0,0,0.08)',
              transition: 'box-shadow 0.15s',
            }}
          >
            <GoogleIcon />
            {loading ? 'Connexion…' : 'Se connecter avec Google'}
          </button>

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 10,
              background: 'oklch(0.97 0.03 25)',
              border: '1px solid oklch(0.88 0.06 25)',
              fontSize: 13, color: 'oklch(0.4 0.15 25)',
              textAlign: 'center',
            }}>
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '0 32px 40px', textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: p.mute, lineHeight: 1.6 }}>
          Votre compte Google est lié au stand — accès protégé.
        </div>
      </div>
    </div>
  );
}
