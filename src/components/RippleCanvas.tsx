import { useRef, useEffect } from 'react';

interface RippleCanvasProps {
  color?: string; // CSS rgb triple, e.g. "0,0,0" or "255,255,255"
}

// Canvas overlay that draws expanding water-ripple rings.
// pointerEvents:none so clicks pass through to elements below.
// Listens on `window` — works regardless of where in the DOM it sits.
export default function RippleCanvas({ color = '0,0,0' }: RippleCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    let raf: number | null = null;
    interface Ripple {
      x: number;
      y: number;
      radius: number;
      maxR: number;
      speed: number;
      a0: number;
      click: boolean;
    }
    const ripples: Ripple[] = [];

    // ── resize ──────────────────────────────────────────────────────
    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas!.width = canvas!.offsetWidth * dpr;
      canvas!.height = canvas!.offsetHeight * dpr;
    }

    // ── draw one ring ────────────────────────────────────────────────
    function ring(
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      r: number,
      a: number,
      lw: number,
      dpr: number,
    ) {
      if (r <= 0 || a <= 0) return;
      ctx.beginPath();
      ctx.arc(x * dpr, y * dpr, r * dpr, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${color},${a.toFixed(3)})`;
      ctx.lineWidth = lw * dpr;
      ctx.stroke();
    }

    // ── animation loop ───────────────────────────────────────────────
    function frame() {
      const dpr = window.devicePixelRatio || 1;
      const ctx = canvas!.getContext('2d')!;
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);

      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        const t = rp.radius / rp.maxR; // 0 → 1
        const a = rp.a0 * (1 - t * t); // ease-out opacity

        if (a < 0.004) {
          ripples.splice(i, 1);
          continue;
        }

        ring(ctx, rp.x, rp.y, rp.radius, a, 1.5, dpr);
        ring(ctx, rp.x, rp.y, rp.radius - 28, a * 0.5, 1.0, dpr);
        if (rp.click) ring(ctx, rp.x, rp.y, rp.radius - 56, a * 0.25, 0.8, dpr);

        rp.radius += rp.speed;
      }

      raf = ripples.length ? requestAnimationFrame(frame) : null;
    }

    function kick() {
      if (!raf) raf = requestAnimationFrame(frame);
    }

    // ── spawn helpers ────────────────────────────────────────────────
    function spawn(clientX: number, clientY: number, click: boolean) {
      const rect = canvas!.getBoundingClientRect();
      ripples.push({
        x: clientX - rect.left,
        y: clientY - rect.top,
        radius: 2,
        maxR: click ? 160 : 65,
        speed: click ? 3.5 : 1.6,
        a0: click ? 0.65 : 0.3,
        click,
      });
      kick();
    }

    // ── event handlers ───────────────────────────────────────────────
    function onDown(e: PointerEvent) {
      spawn(e.clientX, e.clientY, true);
    }

    let lastMove = 0;
    function onMove(e: PointerEvent) {
      const now = Date.now();
      if (now - lastMove < 80) return;
      lastMove = now;
      spawn(e.clientX, e.clientY, false);
    }

    // ── setup ────────────────────────────────────────────────────────
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // pointerdown/pointermove cover mouse + touch (Pointer Events API)
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointermove', onMove, { passive: true });

    return () => {
      ro.disconnect();
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  );
}
