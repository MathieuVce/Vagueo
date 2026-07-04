import { useState, useEffect, useMemo } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase.ts';
import { STAND_ID, PALETTE, FONT, FONT_MONO } from '../tokens.ts';
import VagueoLogo from '../components/VagueoLogo.tsx';

const BAR_H = 56;
// Plafond d'entrées d'historique chargées en direct pour les stats (borne le coût
// et le volume sur les longues périodes ; largement au-dessus d'un usage réel).
const STATS_MAX_EVENTS = 1000;
const PERIODS = [
  { key: 'today', label: "Aujourd'hui" },
  { key: 'week', label: 'Semaine' },
  { key: 'month', label: 'Mois' },
] as const;

type Period = (typeof PERIODS)[number]['key'];

interface HistoryEvent {
  id: string;
  exit_reason?: string;
  delay_used?: boolean;
  wait_ms?: number;
  service_ms?: number;
  done_at?: Timestamp;
  rating?: number;
  feedback?: string;
}

function getStartDate(period: Period): Date {
  const now = new Date();
  if (period === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    d.setHours(0, 0, 0, 0);
    return d;
  }
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function computeStats(events: HistoryEvent[]) {
  const total = events.length;
  if (!total) return { total: 0 };
  const served = events.filter((e) => e.exit_reason === 'completed').length;
  const leftWaiting = events.filter((e) => e.exit_reason === 'left_waiting').length;
  const leftCheckin = events.filter((e) => e.exit_reason === 'left_checkin').length;
  const timeoutCheckin = events.filter((e) => e.exit_reason === 'timeout_checkin').length;
  const timeoutService = events.filter((e) => e.exit_reason === 'timeout_service').length;
  const timeoutWaiting = events.filter((e) => e.exit_reason === 'timeout_waiting').length;
  const delayUsed = events.filter((e) => e.delay_used).length;
  const waitVals = events.filter((e) => (e.wait_ms ?? 0) > 0).map((e) => e.wait_ms!);
  const serviceVals = events.filter((e) => (e.service_ms ?? 0) > 0).map((e) => e.service_ms!);
  const avgWaitMin = waitVals.length
    ? Math.round(waitVals.reduce((s, v) => s + v, 0) / waitVals.length / 60000)
    : null;
  const avgServiceMin = serviceVals.length
    ? Math.round(serviceVals.reduce((s, v) => s + v, 0) / serviceVals.length / 60000)
    : null;
  const ratingVals = events.filter((e) => (e.rating ?? 0) > 0).map((e) => e.rating!);
  const ratingCount = ratingVals.length;
  const avgRating =
    ratingCount > 0
      ? Math.round((ratingVals.reduce((s, v) => s + v, 0) / ratingCount) * 10) / 10
      : null;
  return {
    total,
    served,
    leftWaiting,
    leftCheckin,
    timeoutCheckin,
    timeoutService,
    timeoutWaiting,
    delayUsed,
    avgWaitMin,
    avgServiceMin,
    ratingCount,
    avgRating,
  };
}

type Stats = ReturnType<typeof computeStats>;

function pctOf(val: number | undefined | null, total: number): number {
  return total > 0 ? Math.round(((val ?? 0) / total) * 100) : 0;
}

function buildPrintHTML(stats: Stats, period: Period, standId: string): string {
  const periodLabel = PERIODS.find((p) => p.key === period)?.label ?? period;
  const dateStr = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (stats.total === 0) {
    return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8">
<title>Vaguéo · Statistiques</title>
<style>body{font-family:Inter,sans-serif;padding:40px;color:#11141a}h1{font-size:22px;margin:0 0 4px}.meta{color:#6b6f78;font-size:13px;margin-bottom:32px}.empty{font-size:15px;color:#6b6f78}</style>
</head><body>
<h1>Vaguéo · Statistiques</h1>
<div class="meta">${periodLabel} · ${dateStr} · Stand ${standId}</div>
<div class="empty">Aucun passage enregistré pour cette période.</div>
</body></html>`;
  }

  const s = stats as any;

  const tableRows = (
    [
      ['Servis (passés au stand)', s.served, 'oklch(0.42 0.16 142)'],
      ['Partis en attente', s.leftWaiting, ''],
      ["Partis lors de l'appel", s.leftCheckin, ''],
      ['Non-présents (timeout)', s.timeoutCheckin, ''],
      ['Service écourté (timeout)', s.timeoutService, ''],
      ['Abandons en attente (timeout)', s.timeoutWaiting, ''],
    ] as [string, number, string][]
  )
    .filter(([, v]) => (v ?? 0) > 0)
    .map(
      ([label, val, color]) =>
        `<tr><td>${label}</td><td class="pct">${pctOf(val, stats.total)}%</td>` +
        `<td class="num"${color ? ` style="color:${color}"` : ''}>${val}</td></tr>`,
    )
    .join('');

  const delayRow =
    (s.delayUsed ?? 0) > 0
      ? `<tr><td>Délais 10 min utilisés</td><td class="pct"></td><td class="num">${s.delayUsed}</td></tr>`
      : '';

  const timeCards = [
    s.avgWaitMin != null
      ? `<div class="card"><div class="val">~${s.avgWaitMin}</div><div class="lbl">min d'attente moy.</div></div>`
      : '',
    s.avgServiceMin != null
      ? `<div class="card"><div class="val">~${s.avgServiceMin}</div><div class="lbl">min au stand moy.</div></div>`
      : '',
  ].join('');

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8">
<title>Vaguéo · Statistiques ${periodLabel}</title>
<style>
  @page{size:A4;margin:18mm}
  body{font-family:Inter,sans-serif;color:#11141a;font-size:13px;line-height:1.5}
  h1{font-size:22px;margin:0 0 4px}
  .meta{color:#6b6f78;font-size:12px;margin-bottom:28px}
  .cards{display:flex;gap:10px;margin-bottom:20px}
  .card{flex:1;border:1px solid rgba(17,20,26,.12);border-radius:10px;padding:14px 10px;text-align:center}
  .val{font-size:26px;font-weight:700;letter-spacing:-.03em}
  .lbl{font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:#6b6f78;margin-top:3px}
  .green{color:oklch(0.42 0.16 142)}
  table{width:100%;border-collapse:collapse;margin-top:24px}
  thead th{text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.12em;color:#6b6f78;padding-bottom:8px}
  td{padding:8px 0;border-bottom:1px solid rgba(17,20,26,.07)}
  .pct{text-align:right;color:#6b6f78;font-size:11px;padding-right:14px;width:48px}
  .num{text-align:right;font-weight:700;font-family:monospace;width:36px}
  .footer{margin-top:36px;font-size:10px;color:#6b6f78;border-top:1px solid rgba(17,20,26,.08);padding-top:10px}
</style>
</head><body>
<h1>Vaguéo · Statistiques</h1>
<div class="meta">${periodLabel} · ${dateStr} · Stand ${standId}</div>
<div class="cards">
  <div class="card"><div class="val">${stats.total}</div><div class="lbl">Passages</div></div>
  <div class="card"><div class="val green">${s.served ?? 0}</div><div class="lbl">Servis</div></div>
  <div class="card"><div class="val">${stats.total - (s.served ?? 0)}</div><div class="lbl">Absences</div></div>
  ${timeCards}
</div>
<table>
  <thead><tr><th>Sortie</th><th class="pct">%</th><th class="num">Nb</th></tr></thead>
  <tbody>${tableRows}${delayRow}</tbody>
</table>
<div class="footer">Vaguéo &nbsp;·&nbsp; Généré le ${new Date().toLocaleString('fr-FR')} &nbsp;·&nbsp; Stand ${standId}</div>
</body></html>`;
}

function exportCSV(events: HistoryEvent[], period: Period, standId: string) {
  const headers = [
    'Date',
    'Sortie',
    'Attente (min)',
    'Service (min)',
    'Délai utilisé',
    'Note',
    'Commentaire',
  ];
  const rows = events.map((e) =>
    [
      e.done_at?.toDate?.().toLocaleString('fr-FR') ?? '',
      e.exit_reason ?? '',
      e.wait_ms != null ? String(Math.round(e.wait_ms / 60000)) : '',
      e.service_ms != null ? String(Math.round(e.service_ms / 60000)) : '',
      e.delay_used ? 'oui' : 'non',
      e.rating != null ? String(e.rating) : '',
      e.feedback ?? '',
    ]
      .map((v) => `"${v}"`)
      .join(','),
  );
  const csv = '﻿' + [headers.map((h) => `"${h}"`).join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vagueo-${standId}-${period}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function DownloadIcon() {
  return (
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
  );
}

function PrintIcon() {
  return (
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
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}

interface ScreenStatsProps {
  onClose: () => void;
  standId?: string;
  standName?: string;
}

export default function ScreenStats({
  onClose,
  standId: standIdProp,
  standName,
}: ScreenStatsProps) {
  const sid = standIdProp ?? STAND_ID;
  const p = PALETTE;
  const [period, setPeriod] = useState<Period>('today');
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setEvents([]);
    setError(null);
    const start = Timestamp.fromDate(getStartDate(period));
    // limit borne le volume live (une période « mois » peut être énorme) : on
    // charge les STATS_MAX_EVENTS entrées les plus récentes de la période.
    const q = query(
      collection(db, 'stands', sid, 'history'),
      where('done_at', '>=', start),
      orderBy('done_at', 'desc'),
      limit(STATS_MAX_EVENTS),
    );
    return onSnapshot(
      q,
      (snap) => {
        setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as HistoryEvent));
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
  }, [period, sid]);

  const stats = useMemo(() => computeStats(events), [events]);
  const hd = useMemo(() => hourlyData(events, period), [events, period]);
  const feedbacks = useMemo(() => events.filter((e) => e.feedback?.trim()), [events]);

  const handlePrint = () => {
    const html = buildPrintHTML(stats, period, sid);
    const w = window.open('', '_blank', 'width=800,height=640');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => {
      w.onafterprint = () => w.close();
      w.print();
    }, 400);
  };

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
            {standName ? standName : 'Statistiques'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {!loading && !error && stats.total > 0 && (
            <>
              <button
                onClick={() => exportCSV(events, period, sid)}
                style={{
                  border: `1px solid ${p.line}`,
                  borderRadius: 10,
                  padding: '0 12px',
                  height: 34,
                  cursor: 'pointer',
                  background: 'transparent',
                  color: p.mute,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontFamily: FONT,
                }}
              >
                <DownloadIcon /> CSV
              </button>
              <button
                onClick={handlePrint}
                style={{
                  border: `1px solid ${p.line}`,
                  borderRadius: 10,
                  padding: '0 12px',
                  height: 34,
                  cursor: 'pointer',
                  background: 'transparent',
                  color: p.mute,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontFamily: FONT,
                }}
              >
                <PrintIcon /> PDF
              </button>
            </>
          )}
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
      </div>

      {/* Period tabs */}
      <div
        style={{
          margin: '14px 22px 0',
          flexShrink: 0,
          display: 'flex',
          gap: 5,
          background: 'rgba(17,20,26,0.05)',
          borderRadius: 12,
          padding: 4,
        }}
      >
        {PERIODS.map((t) => (
          <button
            key={t.key}
            onClick={() => setPeriod(t.key)}
            style={{
              flex: 1,
              border: 0,
              cursor: 'pointer',
              borderRadius: 9,
              padding: '7px 4px',
              background: period === t.key ? p.paper : 'transparent',
              color: period === t.key ? p.ink : p.mute,
              fontFamily: FONT,
              fontSize: 13,
              fontWeight: period === t.key ? 600 : 400,
              boxShadow: period === t.key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px 48px' }}>
        {error ? (
          <div style={{ textAlign: 'center', paddingTop: 64 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#c0392b', marginBottom: 8 }}>
              Erreur de chargement
            </div>
            <div
              style={{
                fontSize: 12,
                color: p.mute,
                maxWidth: 280,
                margin: '0 auto',
                lineHeight: 1.6,
                wordBreak: 'break-all',
              }}
            >
              {error}
            </div>
            <div style={{ marginTop: 12, fontSize: 11, color: p.mute, fontStyle: 'italic' }}>
              Vérifiez la console pour plus de détails (index Firestore ou règles de sécurité).
            </div>
          </div>
        ) : loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 56 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: p.wait,
                animation: 'vagueoPulse 1s ease-in-out infinite',
              }}
            />
          </div>
        ) : stats.total === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 64 }}>
            <div style={{ fontSize: 42, opacity: 0.12, marginBottom: 20, lineHeight: 1 }}>〜</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: p.ink, marginBottom: 8 }}>
              Aucun passage pour cette période
            </div>
            <div
              style={{
                fontSize: 13,
                color: p.mute,
                lineHeight: 1.6,
                maxWidth: 240,
                margin: '0 auto 28px',
              }}
            >
              Les statistiques s'afficheront ici dès que des clients auront été pris en charge.
            </div>
            <button
              onClick={handlePrint}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                border: `1px solid ${p.line}`,
                borderRadius: 12,
                padding: '10px 18px',
                cursor: 'pointer',
                background: 'transparent',
                color: p.mute,
                fontFamily: FONT,
                fontSize: 13,
              }}
            >
              <PrintIcon /> Générer un rapport vide
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 10 }}>
              <StatCard value={stats.total} label="Passages" mono big />
              <StatCard
                value={stats.served ?? 0}
                label="Servis"
                mono
                big
                color="oklch(0.42 0.16 142)"
              />
              <StatCard
                value={(stats.total ?? 0) - (stats.served ?? 0)}
                label="Absences"
                mono
                big
                color={p.mute}
              />
            </div>

            <div
              style={{
                marginTop: 12,
                display: 'flex',
                borderRadius: 8,
                overflow: 'hidden',
                height: 7,
              }}
            >
              <div style={{ flex: stats.served ?? 0, background: 'oklch(0.68 0.15 142)' }} />
              <div
                style={{
                  flex: (stats.leftWaiting ?? 0) + (stats.leftCheckin ?? 0),
                  background: p.call,
                }}
              />
              <div
                style={{
                  flex:
                    (stats.timeoutCheckin ?? 0) +
                    (stats.timeoutService ?? 0) +
                    (stats.timeoutWaiting ?? 0),
                  background: p.line,
                }}
              />
            </div>
            <div style={{ marginTop: 6, display: 'flex', gap: 14, fontSize: 10, color: p.mute }}>
              <span style={{ color: 'oklch(0.42 0.16 142)' }}>■ Servis</span>
              <span style={{ color: p.call }}>■ Partis</span>
              <span>■ Timeout</span>
            </div>

            <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
              <StatCard
                value={stats.avgWaitMin != null ? `~${stats.avgWaitMin}` : '·'}
                label="min d'attente"
                sublabel="avant d'être appelé"
                mono
              />
              <StatCard
                value={stats.avgServiceMin != null ? `~${stats.avgServiceMin}` : '·'}
                label="min au stand"
                sublabel="de la conf. à la fin"
                mono
              />
            </div>

            {(stats.delayUsed ?? 0) > 0 && (
              <div
                style={{
                  marginTop: 12,
                  padding: '11px 14px',
                  border: `1px solid ${p.line}`,
                  borderRadius: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 13,
                }}
              >
                <span style={{ color: p.mute }}>Délais de 10 min utilisés</span>
                <span style={{ fontFamily: FONT_MONO, fontWeight: 700, color: p.ink }}>
                  {stats.delayUsed}
                </span>
              </div>
            )}

            {hd && (
              <div style={{ marginTop: 28 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: p.mute,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    marginBottom: 12,
                  }}
                >
                  Passages par heure
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: BAR_H }}>
                  {hd.hours.map((h) => {
                    const count = hd.byhour[h] || 0;
                    const barH =
                      count > 0 ? Math.max(6, Math.round((count / hd.maxCnt) * BAR_H)) : 2;
                    return (
                      <div
                        key={h}
                        style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          height: BAR_H,
                        }}
                      >
                        {count > 0 && (
                          <div style={{ fontSize: 8, color: p.mute, marginBottom: 2 }}>{count}</div>
                        )}
                        <div
                          style={{
                            width: '100%',
                            height: barH,
                            background: count > 0 ? p.wait : p.line,
                            borderRadius: '3px 3px 0 0',
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
                  {hd.hours.map((h, i) => (
                    <div
                      key={h}
                      style={{
                        flex: 1,
                        fontSize: 9,
                        textAlign: 'center',
                        color: p.mute,
                        opacity: i % 2 === 0 ? 1 : 0,
                      }}
                    >
                      {h}h
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: 28, paddingTop: 20, borderTop: `1px solid ${p.line}` }}>
              <div
                style={{
                  fontSize: 11,
                  color: p.mute,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  marginBottom: 10,
                }}
              >
                Détail des sorties
              </div>
              <ExitRow
                label="Servis (passés au stand)"
                value={stats.served ?? 0}
                total={stats.total}
                accent="oklch(0.42 0.16 142)"
              />
              <ExitRow
                label="Partis en attente"
                value={stats.leftWaiting ?? 0}
                total={stats.total}
              />
              <ExitRow
                label="Partis lors de l'appel"
                value={stats.leftCheckin ?? 0}
                total={stats.total}
              />
              <ExitRow
                label="Non-présents (timeout)"
                value={stats.timeoutCheckin ?? 0}
                total={stats.total}
              />
              <ExitRow
                label="Service écourté (timeout)"
                value={stats.timeoutService ?? 0}
                total={stats.total}
              />
              <ExitRow
                label="Abandons en attente (timeout)"
                value={stats.timeoutWaiting ?? 0}
                total={stats.total}
              />
            </div>

            {(stats.ratingCount ?? 0) > 0 && (
              <div style={{ marginTop: 28, paddingTop: 20, borderTop: `1px solid ${p.line}` }}>
                <div
                  style={{
                    fontSize: 11,
                    color: p.mute,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    marginBottom: 12,
                  }}
                >
                  Avis clients
                </div>
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: 16,
                    border: `1px solid ${p.line}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: 32,
                      fontWeight: 700,
                      letterSpacing: '-0.03em',
                      color: p.call,
                    }}
                  >
                    {stats.avgRating?.toFixed(1)}
                  </div>
                  <div>
                    <div style={{ display: 'flex', gap: 2, marginBottom: 3 }}>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: 15,
                            color: i <= Math.round(stats.avgRating ?? 0) ? p.call : p.line,
                          }}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: p.mute }}>
                      {stats.ratingCount} avis · note sur 5
                    </div>
                  </div>
                </div>
                {feedbacks.length > 0 && (
                  <>
                    <div
                      style={{
                        fontSize: 11,
                        color: p.mute,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        marginBottom: 8,
                      }}
                    >
                      Commentaires
                    </div>
                    {feedbacks.map((e) => (
                      <FeedbackRow key={e.id} event={e} />
                    ))}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function hourlyData(events: HistoryEvent[], period: Period) {
  if (period !== 'today' || !events.length) return null;
  const byhour: Record<number, number> = {};
  events.forEach((e) => {
    if (e.done_at?.toDate) {
      const h = e.done_at.toDate().getHours();
      byhour[h] = (byhour[h] || 0) + 1;
    }
  });
  if (!Object.keys(byhour).length) return null;
  const hs = Object.keys(byhour).map(Number);
  const minH = Math.max(0, Math.min(...hs) - 1);
  const maxH = Math.min(23, Math.max(...hs) + 1);
  const hours = Array.from({ length: maxH - minH + 1 }, (_, i) => minH + i);
  const maxCnt = Math.max(...hours.map((h) => byhour[h] || 0), 1);
  return { hours, byhour, maxCnt };
}

interface StatCardProps {
  value: number | string | null | undefined;
  label: string;
  sublabel?: string;
  color?: string;
  big?: boolean;
  mono?: boolean;
}

function StatCard({ value, label, sublabel, color, big, mono }: StatCardProps) {
  const p = PALETTE;
  return (
    <div
      style={{
        flex: 1,
        padding: big ? '14px 10px' : '12px 10px',
        border: `1px solid ${p.line}`,
        borderRadius: 16,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontFamily: mono ? FONT_MONO : FONT,
          fontSize: big ? 26 : 22,
          fontWeight: 700,
          letterSpacing: '-0.03em',
          color: color ?? p.ink,
        }}
      >
        {value ?? '·'}
      </div>
      <div
        style={{
          fontSize: 9,
          color: p.mute,
          marginTop: 3,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          lineHeight: 1.4,
        }}
      >
        {label}
      </div>
      {sublabel && (
        <div style={{ fontSize: 9, color: p.mute, marginTop: 1, opacity: 0.7 }}>{sublabel}</div>
      )}
    </div>
  );
}

function FeedbackRow({ event }: { event: HistoryEvent }) {
  const p = PALETTE;
  const stars = event.rating ?? 0;
  const date = event.done_at?.toDate?.();
  const dateStr = date
    ? date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';
  return (
    <div style={{ padding: '10px 0', borderBottom: `1px solid ${p.line}` }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          <div style={{ display: 'flex', gap: 2 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <span
                key={i}
                style={{ fontSize: 12, color: i <= stars ? p.call : p.line, lineHeight: 1 }}
              >
                ★
              </span>
            ))}
          </div>
          <div style={{ fontSize: 13, color: p.ink, lineHeight: 1.5, fontStyle: 'italic' }}>
            "{event.feedback}"
          </div>
        </div>
        <div style={{ fontSize: 10, color: p.mute, flexShrink: 0, marginTop: 1 }}>{dateStr}</div>
      </div>
    </div>
  );
}

interface ExitRowProps {
  label: string;
  value: number;
  total: number;
  accent?: string;
}

function ExitRow({ label, value, total, accent }: ExitRowProps) {
  const p = PALETTE;
  if (!value) return null;
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '9px 0',
        borderBottom: `1px solid ${p.line}`,
        fontSize: 13,
      }}
    >
      <span style={{ color: p.mute }}>{label}</span>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: p.mute }}>{pct}%</span>
        <span
          style={{
            fontFamily: FONT_MONO,
            fontWeight: 700,
            color: accent ?? p.ink,
            minWidth: 22,
            textAlign: 'right',
          }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}
