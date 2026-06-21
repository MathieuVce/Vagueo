import { FONT_SERIF } from '../tokens.ts';

interface VagueoLogoProps {
  size?: number;
  color?: string;
  accent?: string | null;
}

// Wordmark "Vaguéo" with a small wave SVG accent above the "é".
export default function VagueoLogo({
  size = 28,
  color = 'currentColor',
  accent = null,
}: VagueoLogoProps) {
  const ac = accent || color;
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        fontFamily: FONT_SERIF,
        fontStyle: 'italic',
        fontWeight: 400,
        fontSize: size,
        lineHeight: 1,
        color,
        letterSpacing: '-0.01em',
      }}
    >
      <span>Vagu</span>
      <span style={{ position: 'relative', display: 'inline-block' }}>
        e
        <svg
          viewBox="0 0 20 8"
          width={size * 0.55}
          height={size * 0.22}
          style={{
            position: 'absolute',
            left: '50%',
            top: `-${size * 0.1}px`,
            transform: 'translateX(-50%)',
            overflow: 'visible',
          }}
        >
          <path
            d="M1 5 Q 6 0 10 5 T 19 5"
            fill="none"
            stroke={ac}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span>o</span>
    </div>
  );
}
