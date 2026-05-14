import { useEffect, useState } from 'react';
import { FONT, SIZE, ANIM } from './design.ts';

type ToastType = 'error' | 'success' | 'info';

interface ToastProps {
  message:   string;
  type?:     ToastType;
  duration?: number;
  onDone?:   () => void;
}

export function Toast({ message, type = 'error', duration = 4000, onDone }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); onDone?.(); }, duration);
    return () => clearTimeout(t);
  }, [duration, onDone]);

  if (!visible) return null;

  const bg = type === 'success'
    ? 'oklch(0.22 0.08 142)'
    : type === 'info'
      ? 'oklch(0.22 0.08 250)'
      : 'oklch(0.20 0.08 25)';

  const icon = type === 'success' ? '✓' : type === 'info' ? 'ℹ' : '⚠';

  return (
    <div style={{
      position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
      zIndex: 500, maxWidth: 420, width: 'calc(100% - 48px)',
      padding: '12px 16px', borderRadius: SIZE.r4,
      background: bg, color: '#fff',
      fontFamily: FONT.sans, fontSize: 13, lineHeight: 1.5,
      boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      animation: ANIM.fadeIn,
      display: 'flex', alignItems: 'flex-start', gap: 10,
    }}>
      <span style={{ flexShrink: 0, fontSize: 15 }}>{icon}</span>
      <span style={{ flex: 1 }}>{message}</span>
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  function show(message: string, type: ToastType = 'error') {
    setToast({ message, type });
  }

  function hide() { setToast(null); }

  const node = toast
    ? <Toast message={toast.message} type={toast.type} onDone={hide} />
    : null;

  return { show, hide, node };
}
