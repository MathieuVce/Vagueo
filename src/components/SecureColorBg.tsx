import RippleCanvas from './RippleCanvas.tsx';

interface SecureColorBgProps {
  bg?: string;
}

export default function SecureColorBg({ bg = '#39FF14' }: SecureColorBgProps) {
  const svg: React.CSSProperties = {
    position: 'absolute', top: 0, left: 0, width: '200%', height: '100%',
    willChange: 'transform',
  };
  return (
    <div style={{ position: 'absolute', inset: 0, background: bg, overflow: 'hidden' }}>

      <svg viewBox="0 0 800 800" preserveAspectRatio="none"
        style={{ ...svg, animation: 'vagueoWaveLoop 7s linear infinite' }}>
        <path d="M0 200 Q 100 140 200 200 T 400 200 T 600 200 T 800 200"
          stroke="rgba(0,0,0,0.18)" strokeWidth="60" fill="none" />
        <path d="M0 560 Q 100 500 200 560 T 400 560 T 600 560 T 800 560"
          stroke="rgba(0,0,0,0.14)" strokeWidth="50" fill="none" />
      </svg>

      <svg viewBox="0 0 800 800" preserveAspectRatio="none"
        style={{ ...svg, animation: 'vagueoWaveLoop 11s linear infinite', animationDelay: '-4s' }}>
        <path d="M0 380 Q 100 320 200 380 T 400 380 T 600 380 T 800 380"
          stroke="rgba(0,0,0,0.10)" strokeWidth="80" fill="none" />
        <path d="M0 720 Q 100 660 200 720 T 400 720 T 600 720 T 800 720"
          stroke="rgba(255,255,255,0.22)" strokeWidth="30" fill="none" />
      </svg>

      <RippleCanvas color="0,0,0" />

      {/* Live pulse dot — proves it's not a static capture */}
      <div style={{
        position: 'absolute', top: 16, right: 16,
        width: 10, height: 10, borderRadius: '50%',
        background: 'rgba(0,0,0,0.55)',
        animation: 'vagueoPulse 1s ease-in-out infinite',
      }} />
    </div>
  );
}
