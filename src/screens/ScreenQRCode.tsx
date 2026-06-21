import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import VagueoLogo from '../components/VagueoLogo.tsx';
import { STAND_ID, PALETTE, FONT, FONT_MONO } from '../tokens.ts';
import type { Stand } from '../types.ts';

const clientUrl = `${window.location.origin}/?stand=${STAND_ID}`;

interface ScreenQRCodeProps {
  stand: Stand;
  onClose: () => void;
}

export default function ScreenQRCode({ stand, onClose }: ScreenQRCodeProps) {
  const p = PALETTE;
  const qrRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const standName = stand.name || "File d'attente";
  const isOpen = stand.is_open;

  // ─── Print ────────────────────────────────────────────────────
  function handlePrint() {
    const svgEl = qrRef.current?.querySelector('svg');
    if (!svgEl) return;
    const svgStr = new XMLSerializer().serializeToString(svgEl);
    const win = window.open('', '_blank', 'width=480,height=640');
    if (!win) {
      alert('Autorisez les popups pour imprimer.');
      return;
    }
    win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>QR · ${standName}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,sans-serif;display:flex;flex-direction:column;
    align-items:center;justify-content:center;min-height:100vh;padding:48px 40px;
    text-align:center;background:#fff;color:#11141a}
  h1{font-size:26px;font-weight:700;letter-spacing:-.02em;margin-bottom:8px}
  p.sub{font-size:13px;color:#6b6f78;margin-bottom:28px}
  .qr svg{width:240px!important;height:240px!important}
  p.cta{margin-top:24px;font-size:15px;font-weight:600}
  p.url{margin-top:8px;font-size:10px;color:#6b6f78;word-break:break-all;max-width:260px}
</style></head>
<body>
  <h1>${standName}</h1>
  <p class="sub">Scannez pour rejoindre la file d'attente</p>
  <div class="qr">${svgStr}</div>
  <p class="cta">Rejoindre la file</p>
  <p class="url">${clientUrl}</p>
</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.onafterprint = () => win.close();
      win.print();
    }, 400);
  }

  // ─── Download PNG poster ──────────────────────────────────────
  async function handleDownload() {
    const svgEl = qrRef.current?.querySelector('svg');
    if (!svgEl) return;

    const QR = 360;
    const W = QR + 80;
    const H = QR + 160;

    const clone = svgEl.cloneNode(true) as SVGElement;
    clone.setAttribute('width', String(QR));
    clone.setAttribute('height', String(QR));
    const svgStr = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    await new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d')!;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);

        ctx.drawImage(img, 40, 40, QR, QR);
        URL.revokeObjectURL(url);

        ctx.fillStyle = '#11141a';
        ctx.font = `bold 20px -apple-system, "Inter Tight", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(standName, W / 2, QR + 70);

        ctx.fillStyle = '#6b6f78';
        ctx.font = `13px -apple-system, "Inter Tight", sans-serif`;
        ctx.fillText('Scannez pour rejoindre la file', W / 2, QR + 96);

        ctx.fillStyle = '#9ca3af';
        ctx.font = `10px monospace`;
        ctx.fillText(clientUrl, W / 2, QR + 120);

        const a = document.createElement('a');
        a.download = `qrcode-${standName}.png`;
        a.href = canvas.toDataURL('image/png');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        resolve();
      };
      img.src = url;
    });
  }

  // ─── Share / copy ─────────────────────────────────────────────
  async function handleShare() {
    setSharing(true);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `File d'attente · ${standName}`,
          text: "Rejoignez la file d'attente sans attendre devant le stand.",
          url: clientUrl,
        });
      } catch (e) {
        if ((e as Error).name !== 'AbortError') copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
    setSharing(false);
  }

  function copyToClipboard() {
    void navigator.clipboard.writeText(clientUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  const mailtoHref = `mailto:?subject=${encodeURIComponent(`QR Code · ${standName}`)}&body=${encodeURIComponent(`Rejoignez la file d'attente de ${standName} sans attendre !\n\nLien direct :\n${clientUrl}\n\nOu scannez le QR code disponible auprès du stand.`)}`;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        background: p.paper,
        fontFamily: FONT,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'vagueoFadeIn 0.25s ease',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 22px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div>
          <VagueoLogo size={16} color={p.ink} accent={p.wait} />
          <div
            style={{
              fontSize: 11,
              color: p.mute,
              marginTop: 1,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            QR Code
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            border: `1px solid ${p.line}`,
            borderRadius: 10,
            width: 34,
            height: 34,
            cursor: 'pointer',
            background: 'transparent',
            color: p.mute,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
          }}
        >
          ×
        </button>
      </div>

      {/* QR center */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 32px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            borderRadius: 99,
            marginBottom: 24,
            background: isOpen ? 'oklch(0.94 0.07 142)' : p.line,
            color: isOpen ? 'oklch(0.35 0.14 142)' : p.mute,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: isOpen ? 'oklch(0.48 0.18 142)' : p.mute,
              animation: isOpen ? 'vagueoSlowPulse 1.5s ease-in-out infinite' : 'none',
            }}
          />
          {isOpen ? 'File ouverte' : 'File fermée'}
        </div>

        <div
          ref={qrRef}
          style={{
            padding: 20,
            borderRadius: 24,
            background: '#fff',
            boxShadow: '0 4px 32px rgba(0,0,0,0.10)',
            opacity: isOpen ? 1 : 0.45,
            transition: 'opacity 0.2s',
          }}
        >
          <QRCodeSVG value={clientUrl} size={220} level="M" fgColor="#11141a" bgColor="#ffffff" />
        </div>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em' }}>{standName}</div>
          <div
            style={{
              marginTop: 6,
              fontFamily: FONT_MONO,
              fontSize: 10,
              color: p.mute,
              letterSpacing: '0.02em',
              maxWidth: 280,
              wordBreak: 'break-all',
            }}
          >
            {clientUrl}
          </div>
        </div>

        {!isOpen && (
          <div
            style={{
              marginTop: 14,
              padding: '8px 14px',
              borderRadius: 10,
              background: 'oklch(0.97 0.02 55)',
              border: '1px solid oklch(0.90 0.06 55)',
              fontSize: 12,
              color: 'oklch(0.45 0.12 55)',
              textAlign: 'center',
              maxWidth: 260,
            }}
          >
            La file est fermée · ouvrez-la depuis le dashboard pour que les clients puissent
            scanner.
          </div>
        )}
      </div>

      {/* Actions */}
      <div
        style={{
          padding: '0 22px 44px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          flexShrink: 0,
        }}
      >
        <button
          onClick={handleShare}
          disabled={sharing}
          style={{
            width: '100%',
            minHeight: 54,
            border: 0,
            outline: 0,
            cursor: 'pointer',
            background: p.ink,
            color: p.paper,
            borderRadius: 16,
            fontFamily: FONT,
            fontSize: 16,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          {copied ? '✓ Lien copié !' : sharing ? 'Partage…' : 'Partager le lien'}
        </button>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleDownload}
            style={{
              flex: 1,
              minHeight: 48,
              border: `1px solid ${p.line}`,
              outline: 0,
              cursor: 'pointer',
              background: 'transparent',
              color: p.ink,
              borderRadius: 14,
              fontFamily: FONT,
              fontSize: 14,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Télécharger
          </button>

          <button
            onClick={handlePrint}
            style={{
              flex: 1,
              minHeight: 48,
              border: `1px solid ${p.line}`,
              outline: 0,
              cursor: 'pointer',
              background: 'transparent',
              color: p.ink,
              borderRadius: 14,
              fontFamily: FONT,
              fontSize: 14,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Imprimer
          </button>

          <a
            href={mailtoHref}
            style={{
              flex: 1,
              minHeight: 48,
              border: `1px solid ${p.line}`,
              outline: 0,
              cursor: 'pointer',
              background: 'transparent',
              color: p.ink,
              borderRadius: 14,
              fontFamily: FONT,
              fontSize: 14,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              textDecoration: 'none',
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            Par mail
          </a>
        </div>
      </div>
    </div>
  );
}
