import { useRef } from 'react';
import RippleCanvas from './RippleCanvas.tsx';

function hexToRgb(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

let _waveId = 0;
function useWaveId() {
  const ref = useRef<string | null>(null);
  if (!ref.current) ref.current = `wv${_waveId++}`;
  return ref.current;
}

interface WaveProps {
  progress?: number;
  color?: string;
  soft?: string;
  speed?: number;
}

// Fluid sine-wave fill — two animated layers rising from the bottom.
// Each layer is a 200%-wide SVG (2 wave periods). The CSS animation translates
// by -50% of the element's own width = exactly one screen width, so the loop
// is seamless on every device regardless of actual pixel density.
function WaveFluid({ progress = 0.5, color = '#0f1e44', soft = 'rgba(15,30,68,0.12)', speed = 1 }: WaveProps) {
  const id    = useWaveId();
  const fillY = 800 - 800 * progress;

  const svgBase: React.CSSProperties = {
    position: 'absolute', top: 0, left: 0, width: '200%', height: '100%',
    willChange: 'transform',
  };

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {/* static color wash */}
      <svg viewBox="0 0 400 800" preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <rect x="0" y={fillY} width="400" height={800 * progress} fill={soft} />
      </svg>

      {/* back wave */}
      <svg viewBox="0 0 800 800" preserveAspectRatio="none"
        style={{ ...svgBase, animation: `vagueoWaveLoop ${10 / speed}s linear infinite` }}>
        <defs>
          <linearGradient id={`${id}a`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.10" />
            <stop offset="100%" stopColor={color} stopOpacity="0.22" />
          </linearGradient>
        </defs>
        <g transform={`translate(0,${fillY})`}>
          <path fill={`url(#${id}a)`}
            d="M0 40 Q 100 0 200 40 T 400 40 T 600 40 T 800 40 L 800 800 L 0 800 Z" />
        </g>
      </svg>

      {/* front wave */}
      <svg viewBox="0 0 800 800" preserveAspectRatio="none"
        style={{ ...svgBase, animation: `vagueoWaveLoop ${13 / speed}s linear infinite`, animationDelay: '-3s' }}>
        <defs>
          <linearGradient id={`${id}b`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0.32" />
          </linearGradient>
        </defs>
        <g transform={`translate(0,${fillY + 14})`}>
          <path fill={`url(#${id}b)`}
            d="M0 32 Q 100 64 200 32 T 400 32 T 600 32 T 800 32 L 800 800 L 0 800 Z" />
        </g>
      </svg>

      <RippleCanvas color={color.startsWith('#') ? hexToRgb(color) : color} />
    </div>
  );
}

// Geometric zigzag fill.
function WaveGeometric({ progress = 0.5, color = '#0f1e44', soft = 'rgba(15,30,68,0.12)', speed = 1 }: WaveProps) {
  const peaks = 8;
  const w  = 400;
  const pw = w / peaks;
  const pts = [`M0 30`];
  for (let i = 0; i <= peaks; i++) pts.push(`L ${i * pw} ${i % 2 === 0 ? 30 : 0}`);
  pts.push(`L ${w} 800 L 0 800 Z`);
  const d = pts.join(' ');
  const fillY = 800 - 800 * progress;
  return (
    <svg viewBox="0 0 400 800" preserveAspectRatio="none"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <rect x="0" y={fillY} width="400" height={800 * progress} fill={soft} />
      <g style={{ transform: `translateY(${fillY + 12}px)` }}>
        <path d={d} fill={color} opacity="0.16"
          style={{ animation: `vagueoWaveX ${9 / speed}s linear infinite` }} />
      </g>
      <g style={{ transform: `translateY(${fillY - 4}px)` }}>
        <path d={d} fill={color} opacity="0.28"
          style={{ animation: `vagueoWaveX ${6 / speed}s linear infinite reverse` }} />
      </g>
    </svg>
  );
}

// Floating dots fill.
function WaveParticles({ progress = 0.5, color = '#0f1e44', soft = 'rgba(15,30,68,0.12)', speed = 1 }: WaveProps) {
  const fillTop = 800 - 800 * progress;
  const cols = 14;
  const dots: React.ReactElement[] = [];
  const rand = (i: number) => { const x = Math.sin((i + 1) * 12.9898) * 43758.5453; return x - Math.floor(x); };
  for (let row = 0; row < 20; row++) {
    for (let col = 0; col < cols; col++) {
      const baseY = 800 - row * 32 - 20;
      if (baseY < fillTop - 60) continue;
      const r     = 3 + rand(row * cols + col) * 3;
      const delay = (rand(row * cols + col + 99) * 4).toFixed(2);
      const op    = baseY < fillTop ? 0.35 : 0.7;
      dots.push(
        <circle key={`${row}-${col}`}
          cx={(col + 0.5) * (400 / cols)} cy={baseY} r={r}
          fill={color} opacity={op}
          style={{ animation: `vagueoFloat ${4 / speed}s ease-in-out ${delay}s infinite` }} />
      );
    }
  }
  return (
    <svg viewBox="0 0 400 800" preserveAspectRatio="none"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <rect x="0" y={fillTop} width="400" height={800 - fillTop} fill={soft} />
      {dots}
    </svg>
  );
}

interface WaveBackgroundProps extends WaveProps {
  variant?: 'fluid' | 'geometric' | 'particles';
}

// variant: 'fluid' | 'geometric' | 'particles'
export default function WaveBackground({ variant = 'fluid', ...props }: WaveBackgroundProps) {
  if (variant === 'geometric') return <WaveGeometric {...props} />;
  if (variant === 'particles') return <WaveParticles {...props} />;
  return <WaveFluid {...props} />;
}
