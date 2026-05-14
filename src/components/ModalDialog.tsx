import { useState, useEffect } from 'react';
import { PALETTE, FONT } from '../tokens.ts';

interface ModalButton {
  label: string;
  onPress: () => void;
}

interface ModalDialogProps {
  title: string;
  message: React.ReactNode;
  primary: ModalButton | null;
  secondary?: ModalButton | null;
  autoCloseMs?: number;
}

export default function ModalDialog({ title, message, primary, secondary, autoCloseMs }: ModalDialogProps) {
  const p = PALETTE;
  const [remaining, setRemaining] = useState(autoCloseMs ? Math.round(autoCloseMs / 1000) : null);

  useEffect(() => {
    if (!autoCloseMs) return;
    const tick = setInterval(() => {
      setRemaining((s) => (s !== null && s > 1 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(tick);
  }, [autoCloseMs]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(17,20,26,0.55)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '0 20px',
      animation: 'vagueoFadeIn 0.2s ease',
    }}>
      <div style={{
        width: '100%', maxWidth: 360,
        background: p.paper, borderRadius: 28,
        padding: '28px 24px 24px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
      }}>
        <div style={{ fontFamily: FONT, fontSize: 18, fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.02em' }}>
          {title}
        </div>
        <div style={{ marginTop: 10, fontFamily: FONT, fontSize: 14, color: p.mute, lineHeight: 1.55 }}>
          {message}
        </div>

        {remaining !== null && autoCloseMs && (
          <div style={{ marginTop: 16, height: 3, borderRadius: 99, background: p.line, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99,
              background: p.wait,
              width: `${(remaining / Math.round(autoCloseMs / 1000)) * 100}%`,
              transition: 'width 1s linear',
            }} />
          </div>
        )}

        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {primary && (
            <button
              onClick={primary.onPress}
              style={{
                border: 0, outline: 0, cursor: 'pointer',
                width: '100%', minHeight: 52,
                background: p.ink, color: p.paper,
                borderRadius: 16, fontFamily: FONT,
                fontSize: 15, fontWeight: 600,
                letterSpacing: '-0.01em',
              }}
            >
              {primary.label}
              {remaining !== null && (
                <span style={{ opacity: 0.5, fontWeight: 400, fontSize: 12, marginLeft: 8 }}>{remaining}s</span>
              )}
            </button>
          )}
          {secondary && (
            <button
              onClick={secondary.onPress}
              style={{
                border: `1px solid ${p.line}`, outline: 0, cursor: 'pointer',
                width: '100%', minHeight: 46,
                background: 'transparent', color: p.ink,
                borderRadius: 14, fontFamily: FONT,
                fontSize: 14, fontWeight: 500,
              }}
            >
              {secondary.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
