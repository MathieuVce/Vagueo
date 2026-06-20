import { useState, useEffect, type CSSProperties } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  addDoc,
  serverTimestamp,
  deleteField,
  orderBy,
  limit,
} from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
import { db } from '../firebase.ts';
import { useVendorAuth } from '../hooks/useVendorAuth.ts';
import {
  SECURE_COLORS,
  FLOW_RATE_LABELS,
  FLOW_SLOW_DEFAULT,
  FLOW_SPRINT_DEFAULT,
  calcMinPerPerson,
  FLOW_RATE_DEFAULT,
  CALL_AHEAD_MIN_DEFAULT,
} from '../tokens.ts';
import { COLOR, FONT, TEXT, SIZE, SHADOW } from '../ui/design.ts';
import {
  Button,
  Field,
  NumberField,
  Toggle,
  Segment,
  Drawer,
  DrawerBody,
  DrawerHeader,
  useToast,
  Label,
} from '../ui/index.ts';
import VagueoLogo from '../components/VagueoLogo.tsx';
import ScreenStats from '../screens/ScreenStats.tsx';
import type { Stand } from '../types.ts';

// ─── Types ───────────────────────────────────────────────────────
interface StandDoc extends Omit<Stand, 'secure_color'> {
  _id: string;
}

interface RatingEntry {
  id: string;
  rating?: number;
  feedback?: string;
  done_at?: { toDate?: () => Date };
}

// ─── Admin-specific small components ─────────────────────────────
function Avatar({ stand }: { stand: StandDoc }) {
  const initial = (stand.name || '?')[0].toUpperCase();
  const color = SECURE_COLORS[(stand.current_wave ?? 0) % SECURE_COLORS.length]?.hex ?? '#ccc';
  if (stand.logo_url) {
    return (
      <img
        src={stand.logo_url}
        alt=""
        style={{ width: 48, height: 48, borderRadius: SIZE.r3, objectFit: 'cover', flexShrink: 0 }}
      />
    );
  }
  return (
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: SIZE.r3,
        flexShrink: 0,
        background: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 20,
        fontWeight: 700,
        fontFamily: FONT.sans,
      }}
    >
      {initial}
    </div>
  );
}

function Pill({ children, bg, color }: { children: React.ReactNode; bg?: string; color?: string }) {
  return (
    <span
      style={{
        padding: '3px 9px',
        borderRadius: SIZE.rFull,
        border: `1px solid ${COLOR.line}`,
        background: bg ?? 'transparent',
        ...TEXT.caption,
        color: color ?? COLOR.mute,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      {children}
    </span>
  );
}

function StatusBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      style={{
        padding: '3px 8px',
        borderRadius: SIZE.r2,
        background: active ? COLOR.successBg : COLOR.line,
        color: active ? COLOR.success : COLOR.mute,
        ...TEXT.caption,
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ ...TEXT.monoLg, color: COLOR.ink }}>{value}</div>
      <div
        style={{
          ...TEXT.caption,
          color: COLOR.mute,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginTop: 2,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function FlowTable({ slow, sprint }: { slow: number; sprint: number }) {
  return (
    <div
      style={{
        borderRadius: SIZE.r3,
        border: `1px solid ${COLOR.line}`,
        overflow: 'hidden',
        marginTop: 10,
      }}
    >
      {[1, 2, 3, 4, 5].map((level) => (
        <div
          key={level}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '7px 12px',
            background: level % 2 === 0 ? 'transparent' : COLOR.surface,
            ...TEXT.small,
          }}
        >
          <span style={{ color: COLOR.mute }}>{FLOW_RATE_LABELS[level - 1]}</span>
          <span style={{ fontWeight: 600 }}>{calcMinPerPerson(level, slow, sprint)} min/pers</span>
        </div>
      ))}
    </div>
  );
}

// ─── Stand Editor ─────────────────────────────────────────────────
function StandEditor({
  stand,
  onClose,
  onDeleted,
}: {
  stand: StandDoc;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState(stand.name ?? '');
  const [address, setAddress] = useState(stand.address ?? '');
  const [logoUrl, setLogoUrl] = useState(stand.logo_url ?? '');
  const [vendorEmail, setVendorEmail] = useState(stand.vendor_email ?? '');
  const [flowSlow, setFlowSlow] = useState(stand.flow_slow ?? FLOW_SLOW_DEFAULT);
  const [flowSprint, setFlowSprint] = useState(stand.flow_sprint ?? FLOW_SPRINT_DEFAULT);
  const [limitQueue, setLimitQueue] = useState(stand.max_queue_size != null);
  const [maxQueueSize, setMaxQueueSize] = useState<number>(stand.max_queue_size ?? 30);
  const [limitDelay, setLimitDelay] = useState(stand.max_delayed != null);
  const [maxDelayed, setMaxDelayed] = useState<number>(stand.max_delayed ?? 5);
  const [callAheadMin, setCallAheadMin] = useState<number>(
    stand.call_ahead_min ?? CALL_AHEAD_MIN_DEFAULT,
  );
  const [isOpen, setIsOpen] = useState(stand.is_open ?? false);
  const [isPaused, setIsPaused] = useState(stand.is_paused ?? false);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [recentRatings, setRecentRatings] = useState<RatingEntry[]>([]);
  const { show: showToast, node: toastNode } = useToast();

  const clientUrl = `${window.location.origin}/?stand=${stand._id}`;
  const vendorUrl = `${window.location.origin}/vendor?stand=${stand._id}`;
  const isClaimed = !!stand.vendor_uid;

  useEffect(() => {
    return onSnapshot(
      query(
        collection(db, 'queue'),
        where('stand_id', '==', stand._id),
        where('status', 'in', ['waiting', 'orange', 'claimed']),
      ),
      (snap) => setLiveCount(snap.size),
    );
  }, [stand._id]);

  useEffect(() => {
    return onSnapshot(
      query(collection(db, 'stands', stand._id, 'history'), orderBy('done_at', 'desc'), limit(50)),
      (snap) => {
        setRecentRatings(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }) as RatingEntry)
            .filter((e) => (e.rating ?? 0) > 0),
        );
      },
    );
  }, [stand._id]);

  async function handleSave() {
    setSaving(true);
    try {
      const slow = Math.max(flowSprint + 0.5, Number(flowSlow));
      const sprint = Math.min(slow - 0.5, Math.max(0.5, Number(flowSprint)));
      const update: Record<string, unknown> = {
        name: name.trim(),
        address: address.trim(),
        logo_url: logoUrl.trim(),
        is_open: isOpen,
        is_paused: isPaused,
        flow_slow: slow,
        flow_sprint: sprint,
        min_per_person: calcMinPerPerson(stand.flow_rate ?? FLOW_RATE_DEFAULT, slow, sprint),
        max_queue_size: limitQueue ? maxQueueSize : null,
        max_delayed: limitDelay ? maxDelayed : null,
        call_ahead_min: callAheadMin,
      };
      if (!isClaimed) update.vendor_email = vendorEmail.trim().toLowerCase();
      await updateDoc(doc(db, 'stands', stand._id), update);
      onClose();
    } catch (e) {
      showToast((e as Error).message ?? 'Erreur inconnue');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    await deleteDoc(doc(db, 'stands', stand._id));
    onDeleted();
  }

  async function handleUnlink() {
    await updateDoc(doc(db, 'stands', stand._id), { vendor_uid: deleteField() });
    setConfirmUnlink(false);
  }

  function copyLink() {
    void navigator.clipboard.writeText(clientUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const pillBtn: CSSProperties = {
    padding: '6px 11px',
    border: `1px solid ${COLOR.line}`,
    borderRadius: SIZE.r2,
    background: 'transparent',
    color: COLOR.mute,
    fontFamily: FONT.sans,
    fontSize: 11,
    cursor: 'pointer',
  };

  const livePills = (
    <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
      {liveCount !== null && (
        <>
          <Pill>
            <span style={{ fontFamily: FONT.mono, fontWeight: 700, color: COLOR.ink }}>
              {liveCount}
            </span>
            &nbsp;en file
          </Pill>
          <Pill>
            <span style={{ fontFamily: FONT.mono, fontWeight: 700, color: COLOR.ink }}>
              {stand.queue_counter ?? 0}
            </span>
            &nbsp;total
          </Pill>
        </>
      )}
      {isClaimed ? (
        <Pill bg={COLOR.successBg} color={COLOR.success}>
          Revendiqué
        </Pill>
      ) : (
        <Pill bg={COLOR.warningBg} color={COLOR.warning}>
          Non revendiqué
        </Pill>
      )}
    </div>
  );

  return (
    <>
      {toastNode}
      <Drawer
        onClose={onClose}
        header={
          <DrawerHeader
            title="Modifier le stand"
            subtitle={stand._id}
            onClose={onClose}
            extra={livePills}
          />
        }
      >
        <DrawerBody>
          {/* QR code */}
          <div>
            <Label>QR code client</Label>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginTop: 10 }}>
              <div
                style={{
                  padding: 12,
                  borderRadius: SIZE.r4,
                  background: '#fff',
                  boxShadow: SHADOW.md,
                  flexShrink: 0,
                }}
              >
                <QRCodeSVG
                  value={clientUrl}
                  size={96}
                  level="M"
                  fgColor={COLOR.ink}
                  bgColor="#ffffff"
                />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div
                  style={{
                    ...TEXT.monoSm,
                    color: COLOR.mute,
                    wordBreak: 'break-all',
                    lineHeight: 1.5,
                  }}
                >
                  {clientUrl}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={copyLink} style={pillBtn}>
                    {copied ? '✓ Copié' : 'Copier lien client'}
                  </button>
                  <a
                    href={vendorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ ...pillBtn, textDecoration: 'none', display: 'inline-flex' }}
                  >
                    URL vendeur →
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Status */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label>État de la file</Label>
            <Toggle
              on={isOpen}
              onToggle={() => setIsOpen((v) => !v)}
              label={isOpen ? 'File ouverte' : 'File fermée'}
              sublabel={isOpen ? 'Les clients peuvent rejoindre.' : 'Personne ne peut rejoindre.'}
            />
            <Toggle
              on={isPaused}
              onToggle={() => setIsPaused((v) => !v)}
              label={isPaused ? 'File en pause' : 'File active'}
              sublabel={
                isPaused ? 'Avance automatique suspendue.' : 'Les vagues avancent automatiquement.'
              }
            />
          </div>

          {/* Identity */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Label>Identité</Label>
            <Field label="Nom du stand" value={name} onChange={setName} max={60} />
            <Field
              label="Adresse / emplacement"
              value={address}
              onChange={setAddress}
              placeholder="Marché des Capucins, Stand B12"
              max={100}
            />
            <Field
              label="URL du logo"
              value={logoUrl}
              onChange={setLogoUrl}
              placeholder="https://…"
              type="url"
            />
          </div>

          {/* Compte vendeur */}
          <div>
            <Label>Compte vendeur</Label>
            <div style={{ marginTop: 10 }}>
              {isClaimed ? (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: SIZE.r3,
                    background: COLOR.surface,
                    border: `1px solid ${COLOR.line}`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 10,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          ...TEXT.caption,
                          color: COLOR.mute,
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          marginBottom: 4,
                        }}
                      >
                        Compte lié
                      </div>
                      <div style={{ ...TEXT.h3, color: COLOR.ink }}>
                        {stand.vendor_email || (
                          <span
                            style={{
                              ...TEXT.small,
                              color: COLOR.mute,
                              fontWeight: 400,
                              fontStyle: 'italic',
                            }}
                          >
                            email non enregistré
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          ...TEXT.monoSm,
                          color: COLOR.mute,
                          marginTop: 3,
                          wordBreak: 'break-all',
                        }}
                      >
                        {stand.vendor_uid}
                      </div>
                    </div>
                    {!confirmUnlink ? (
                      <Button variant="danger" size="sm" onClick={() => setConfirmUnlink(true)}>
                        Délier
                      </Button>
                    ) : (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Button variant="danger" size="sm" onClick={handleUnlink}>
                          Confirmer
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmUnlink(false)}>
                          Non
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Field
                    label="Email Google du vendeur"
                    value={vendorEmail}
                    onChange={setVendorEmail}
                    placeholder="vendeur@gmail.com"
                    type="email"
                  />
                  <div style={{ ...TEXT.small, color: COLOR.mute, lineHeight: 1.5 }}>
                    Le vendeur se connecte sur{' '}
                    <span style={{ fontFamily: FONT.mono }}>/vendor?stand={stand._id}</span> avec
                    cet email → liaison automatique.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Flow rate */}
          <div>
            <Label>Débit de service</Label>
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <NumberField
                label="Rythme calme"
                value={flowSlow}
                unit="min"
                onChange={(v) => setFlowSlow(Math.max(flowSprint + 0.5, v))}
              />
              <NumberField
                label="Rythme sprint"
                value={flowSprint}
                unit="min"
                onChange={(v) => setFlowSprint(Math.min(flowSlow - 0.5, Math.max(0.5, v)))}
              />
            </div>
            <FlowTable slow={flowSlow} sprint={flowSprint} />
          </div>

          {/* Capacity */}
          <div>
            <Label>Capacité de la file</Label>
            <Segment
              style={{ marginTop: 8 }}
              value={limitQueue}
              onChange={setLimitQueue}
              options={[
                { value: false, label: 'Illimitée' },
                { value: true, label: 'Limitée' },
              ]}
            />
            {limitQueue && (
              <div style={{ marginTop: 8 }}>
                <NumberField
                  value={maxQueueSize}
                  unit="personnes max"
                  onChange={(v) => setMaxQueueSize(Math.max(1, v))}
                />
              </div>
            )}
          </div>

          {/* Delays */}
          <div>
            <Label>Délais simultanés</Label>
            <Segment
              style={{ marginTop: 8 }}
              value={limitDelay}
              onChange={setLimitDelay}
              options={[
                { value: false, label: 'Illimité' },
                { value: true, label: 'Limité' },
              ]}
            />
            {limitDelay && (
              <div style={{ marginTop: 8 }}>
                <NumberField
                  value={maxDelayed}
                  unit="délais max"
                  onChange={(v) => setMaxDelayed(Math.max(0, v))}
                />
              </div>
            )}
          </div>

          {/* Call-ahead */}
          <div>
            <Label>Avance de notification</Label>
            <div style={{ marginTop: 8 }}>
              <NumberField
                value={callAheadMin}
                unit="min avant leur tour"
                onChange={(v) => setCallAheadMin(Math.max(2, Math.min(30, v)))}
                min={2}
                max={30}
              />
            </div>
            <div style={{ ...TEXT.small, color: COLOR.mute, marginTop: 6, lineHeight: 1.5 }}>
              Temps estimé restant avant leur tour auquel les clients reçoivent la notification pour
              venir.
            </div>
          </div>

          {/* Avis */}
          {recentRatings.length > 0 &&
            (() => {
              const avgR =
                recentRatings.reduce((s, e) => s + (e.rating ?? 0), 0) / recentRatings.length;
              const withText = recentRatings.filter((e) => e.feedback?.trim());
              return (
                <div>
                  <Label>Avis clients</Label>
                  <div
                    style={{
                      marginTop: 10,
                      padding: '12px 14px',
                      borderRadius: SIZE.r3,
                      background: COLOR.surface,
                      border: `1px solid ${COLOR.line}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <div
                      style={{ ...TEXT.monoLg, fontSize: 28, color: '#f59e0b', fontWeight: 700 }}
                    >
                      {avgR.toFixed(1)}
                    </div>
                    <div>
                      <div style={{ display: 'flex', gap: 1, marginBottom: 3 }}>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <span
                            key={i}
                            style={{
                              fontSize: 13,
                              color: i <= Math.round(avgR) ? '#f59e0b' : COLOR.line,
                            }}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      <div style={{ ...TEXT.caption, color: COLOR.mute }}>
                        {recentRatings.length} avis récents
                      </div>
                    </div>
                  </div>
                  {withText.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      {withText.slice(0, 8).map((e) => {
                        const date = e.done_at?.toDate?.();
                        const dateStr = date
                          ? date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                          : '';
                        const stars = e.rating ?? 0;
                        return (
                          <div
                            key={e.id}
                            style={{
                              padding: '8px 0',
                              borderBottom: `1px solid ${COLOR.line}`,
                              display: 'flex',
                              gap: 8,
                              alignItems: 'flex-start',
                            }}
                          >
                            <div style={{ display: 'flex', gap: 1, flexShrink: 0, marginTop: 2 }}>
                              {[1, 2, 3, 4, 5].map((i) => (
                                <span
                                  key={i}
                                  style={{
                                    fontSize: 9,
                                    color: i <= stars ? '#f59e0b' : COLOR.line,
                                  }}
                                >
                                  ★
                                </span>
                              ))}
                            </div>
                            <div
                              style={{
                                flex: 1,
                                ...TEXT.small,
                                color: COLOR.ink,
                                lineHeight: 1.5,
                                fontStyle: 'italic',
                              }}
                            >
                              "{e.feedback}"
                            </div>
                            <div style={{ flexShrink: 0, ...TEXT.caption, color: COLOR.mute }}>
                              {dateStr}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <Button full variant="primary" onClick={handleSave} loading={saving}>
              Sauvegarder
            </Button>
            <Button variant="ghost" onClick={onClose} style={{ minWidth: 80 }}>
              Annuler
            </Button>
          </div>

          {/* Suppression */}
          <div style={{ paddingTop: 16, borderTop: `1px solid ${COLOR.line}` }}>
            {!confirmDel ? (
              <Button full variant="danger" size="sm" onClick={() => setConfirmDel(true)}>
                Supprimer ce stand…
              </Button>
            ) : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ ...TEXT.small, color: COLOR.danger, flex: 1 }}>
                  Confirmer la suppression ?
                </span>
                <Button variant="danger" size="sm" onClick={handleDelete}>
                  Supprimer
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDel(false)}>
                  Non
                </Button>
              </div>
            )}
          </div>
        </DrawerBody>
      </Drawer>
    </>
  );
}

// ─── Create Stand Modal ───────────────────────────────────────────
function CreateStandModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [vendorEmail, setVendorEmail] = useState('');
  const [flowSlow, setFlowSlow] = useState(FLOW_SLOW_DEFAULT);
  const [flowSprint, setFlowSprint] = useState(FLOW_SPRINT_DEFAULT);
  const [limitQueue, setLimitQueue] = useState(false);
  const [maxQueueSize, setMaxQueueSize] = useState(30);
  const [limitDelay, setLimitDelay] = useState(false);
  const [maxDelayed, setMaxDelayed] = useState(5);
  const [callAheadMin, setCallAheadMin] = useState(CALL_AHEAD_MIN_DEFAULT);
  const [saving, setSaving] = useState(false);

  const canCreate = name.trim().length > 0 && vendorEmail.trim().length > 0;

  async function handleCreate() {
    if (!canCreate) return;
    setSaving(true);
    const slow = Math.max(flowSprint + 0.5, flowSlow);
    const sprint = Math.min(slow - 0.5, Math.max(0.5, flowSprint));
    const ref = await addDoc(collection(db, 'stands'), {
      name: name.trim(),
      address: address.trim(),
      logo_url: logoUrl.trim(),
      vendor_email: vendorEmail.trim().toLowerCase(),
      current_wave: 0,
      queue_counter: 0,
      is_paused: false,
      is_open: false,
      flow_rate: FLOW_RATE_DEFAULT,
      flow_slow: slow,
      flow_sprint: sprint,
      min_per_person: calcMinPerPerson(FLOW_RATE_DEFAULT, slow, sprint),
      max_queue_size: limitQueue ? maxQueueSize : null,
      max_delayed: limitDelay ? maxDelayed : null,
      call_ahead_min: callAheadMin,
      status: 'active',
      createdAt: serverTimestamp(),
    });
    setSaving(false);
    onCreated(ref.id);
  }

  return (
    <Drawer onClose={onClose} header={<DrawerHeader title="Nouveau stand" onClose={onClose} />}>
      <DrawerBody>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Label>Identité</Label>
          <Field
            label="Nom du stand *"
            value={name}
            onChange={setName}
            placeholder="Churros Mathieu…"
            max={60}
          />
          <Field
            label="Adresse / emplacement"
            value={address}
            onChange={setAddress}
            placeholder="Marché des Capucins, Stand B12"
            max={100}
          />
          <Field
            label="URL du logo"
            value={logoUrl}
            onChange={setLogoUrl}
            placeholder="https://…"
            type="url"
          />
        </div>

        <div>
          <Label>Compte vendeur</Label>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Field
              label="Email Google du vendeur *"
              value={vendorEmail}
              onChange={setVendorEmail}
              placeholder="vendeur@gmail.com"
              type="email"
            />
            <div style={{ ...TEXT.small, color: COLOR.mute, lineHeight: 1.5 }}>
              Premier login Google avec cet email sur{' '}
              <span style={{ fontFamily: FONT.mono }}>/vendor?stand=&lt;id&gt;</span> → liaison
              automatique.
            </div>
          </div>
        </div>

        <div>
          <Label>Débit de service</Label>
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <NumberField
              label="Rythme calme"
              value={flowSlow}
              unit="min"
              onChange={(v) => setFlowSlow(Math.max(flowSprint + 0.5, v))}
            />
            <NumberField
              label="Rythme sprint"
              value={flowSprint}
              unit="min"
              onChange={(v) => setFlowSprint(Math.min(flowSlow - 0.5, Math.max(0.5, v)))}
            />
          </div>
          <FlowTable slow={flowSlow} sprint={flowSprint} />
        </div>

        <div>
          <Label>Capacité de la file</Label>
          <Segment
            style={{ marginTop: 8 }}
            value={limitQueue}
            onChange={setLimitQueue}
            options={[
              { value: false, label: 'Illimitée' },
              { value: true, label: 'Limitée' },
            ]}
          />
          {limitQueue && (
            <div style={{ marginTop: 8 }}>
              <NumberField
                value={maxQueueSize}
                unit="personnes max"
                onChange={(v) => setMaxQueueSize(Math.max(1, v))}
              />
            </div>
          )}
        </div>

        <div>
          <Label>Délais simultanés</Label>
          <Segment
            style={{ marginTop: 8 }}
            value={limitDelay}
            onChange={setLimitDelay}
            options={[
              { value: false, label: 'Illimité' },
              { value: true, label: 'Limité' },
            ]}
          />
          {limitDelay && (
            <div style={{ marginTop: 8 }}>
              <NumberField
                value={maxDelayed}
                unit="délais max"
                onChange={(v) => setMaxDelayed(Math.max(0, v))}
              />
            </div>
          )}
        </div>

        <div>
          <Label>Avance de notification</Label>
          <div style={{ marginTop: 8 }}>
            <NumberField
              value={callAheadMin}
              unit="min avant leur tour"
              onChange={(v) => setCallAheadMin(Math.max(2, Math.min(30, v)))}
              min={2}
              max={30}
            />
          </div>
          <div style={{ ...TEXT.small, color: COLOR.mute, marginTop: 6, lineHeight: 1.5 }}>
            Temps estimé restant avant leur tour auquel les clients reçoivent la notification pour
            venir.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button
            full
            variant="primary"
            onClick={handleCreate}
            disabled={!canCreate}
            loading={saving}
          >
            Créer le stand
          </Button>
          <Button variant="ghost" onClick={onClose} style={{ minWidth: 80 }}>
            Annuler
          </Button>
        </div>
      </DrawerBody>
    </Drawer>
  );
}

// ─── Stand Card ───────────────────────────────────────────────────
function StandCard({
  stand,
  onEdit,
  onStats,
  onApprove,
}: {
  stand: StandDoc;
  onEdit: () => void;
  onStats: () => void;
  onApprove?: () => void;
}) {
  const flowLabel = FLOW_RATE_LABELS[(stand.flow_rate ?? FLOW_RATE_DEFAULT) - 1];
  return (
    <div
      style={{
        background: COLOR.paper,
        border: `1px solid ${COLOR.line}`,
        borderRadius: SIZE.r5,
        padding: '18px 20px',
        fontFamily: FONT.sans,
      }}
    >
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <Avatar stand={stand} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              ...TEXT.h2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {stand.name || (
              <span style={{ color: COLOR.mute, fontStyle: 'italic', fontWeight: 400 }}>
                Sans nom
              </span>
            )}
          </div>
          {stand.address && (
            <div
              style={{
                ...TEXT.small,
                color: COLOR.mute,
                marginTop: 2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              📍 {stand.address}
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <StatusBadge active={stand.is_open} label={stand.is_open ? 'Ouvert' : 'Fermé'} />
            <StatusBadge active={!stand.is_paused} label={stand.is_paused ? 'En pause' : 'Actif'} />
            <span
              style={{
                padding: '3px 8px',
                borderRadius: SIZE.r2,
                background: COLOR.line,
                ...TEXT.caption,
                color: COLOR.mute,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {flowLabel}
            </span>
            {stand.max_queue_size != null && (
              <span
                style={{
                  padding: '3px 8px',
                  borderRadius: SIZE.r2,
                  background: COLOR.line,
                  ...TEXT.caption,
                  color: COLOR.mute,
                }}
              >
                max {stand.max_queue_size}
              </span>
            )}
            {!stand.vendor_uid && (
              <span
                style={{
                  padding: '3px 8px',
                  borderRadius: SIZE.r2,
                  background: COLOR.warningBg,
                  ...TEXT.caption,
                  color: COLOR.warning,
                  fontWeight: 600,
                }}
              >
                Non revendiqué
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {onApprove && (
            <Button variant="primary" size="sm" onClick={onApprove}>
              Approuver
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onStats}>
            Stats
          </Button>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            Modifier
          </Button>
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          display: 'flex',
          gap: 10,
          borderTop: `1px solid ${COLOR.line}`,
          paddingTop: 14,
        }}
      >
        <Metric label="Total clients" value={stand.queue_counter ?? 0} />
        <Metric
          label="Note moy."
          value={
            (stand.rating_count ?? 0) > 0
              ? `${((stand.rating_sum ?? 0) / stand.rating_count!).toFixed(1)} ★`
              : '· ★'
          }
        />
        <Metric label="Avis écrits" value={stand.rating_count ?? 0} />
      </div>
    </div>
  );
}

// ─── Login ────────────────────────────────────────────────────────
function AdminLogin({ onSignIn, error }: { onSignIn: () => void; error: string | null }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: COLOR.paper,
        fontFamily: FONT.sans,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        animation: 'vagueoFadeIn 0.3s ease',
      }}
    >
      <VagueoLogo size={48} color={COLOR.ink} accent={COLOR.primary} />
      <div
        style={{
          marginTop: 16,
          fontFamily: FONT.serif,
          fontStyle: 'italic',
          fontSize: 32,
          letterSpacing: '-0.02em',
        }}
      >
        Administration
      </div>
      <div
        style={{
          marginTop: 8,
          ...TEXT.small,
          color: COLOR.mute,
          textAlign: 'center',
          maxWidth: 280,
          lineHeight: 1.6,
        }}
      >
        Connectez-vous avec votre compte Google pour accéder au tableau de bord.
      </div>
      {error && (
        <div
          style={{
            marginTop: 16,
            padding: '10px 16px',
            borderRadius: SIZE.r3,
            background: COLOR.dangerBg,
            color: COLOR.danger,
            ...TEXT.small,
          }}
        >
          {error}
        </div>
      )}
      <button
        onClick={onSignIn}
        style={{
          marginTop: 32,
          padding: '14px 28px',
          border: 0,
          cursor: 'pointer',
          background: COLOR.ink,
          color: COLOR.paper,
          borderRadius: SIZE.r4,
          fontFamily: FONT.sans,
          fontSize: 15,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Connexion avec Google
      </button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────
export default function AdminApp() {
  const { user, loading, signIn, signOut, error } = useVendorAuth(null);
  const [stands, setStands] = useState<StandDoc[]>([]);
  const [editing, setEditing] = useState<StandDoc | null>(null);
  const [statsStand, setStatsStand] = useState<StandDoc | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [newId, setNewId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(collection(db, 'stands'), (snap) => {
      setStands(
        snap.docs.map(
          (d) => ({ _id: d.id, ...(d.data() as Omit<Stand, 'secure_color'>) }) as StandDoc,
        ),
      );
    });
  }, [user]);

  if (loading) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: COLOR.paper,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: COLOR.primary,
            animation: 'vagueoPulse 1s ease-in-out infinite',
          }}
        />
      </div>
    );
  }

  if (!user || user.isAnonymous) return <AdminLogin onSignIn={signIn} error={error} />;

  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL as string | undefined;
  if (adminEmail && user.email !== adminEmail) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: COLOR.paper,
          fontFamily: FONT.sans,
          gap: 12,
        }}
      >
        <div style={{ ...TEXT.h3 }}>Accès refusé</div>
        <div style={{ ...TEXT.small, color: COLOR.mute }}>Ce compte n'est pas autorisé.</div>
        <Button variant="ghost" size="sm" onClick={signOut} style={{ marginTop: 8 }}>
          Se déconnecter
        </Button>
      </div>
    );
  }

  async function approveStand(id: string) {
    await updateDoc(doc(db, 'stands', id), { status: 'active' });
  }

  const filtered = search.trim()
    ? stands.filter(
        (s) =>
          s.name?.toLowerCase().includes(search.toLowerCase()) ||
          s.address?.toLowerCase().includes(search.toLowerCase()) ||
          s._id.toLowerCase().includes(search.toLowerCase()),
      )
    : stands;

  const pending = filtered.filter((s) => s.status === 'pending_approval');
  const active = filtered.filter((s) => s.status !== 'pending_approval');

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: COLOR.surface,
        fontFamily: FONT.sans,
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: COLOR.paper,
          borderBottom: `1px solid ${COLOR.line}`,
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <VagueoLogo size={18} color={COLOR.ink} accent={COLOR.primary} />
          <div style={{ width: 1, height: 20, background: COLOR.line }} />
          <span style={{ ...TEXT.label, color: COLOR.mute }}>Admin</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ ...TEXT.small, color: COLOR.mute }}>{user.email}</span>
          <Button variant="ghost" size="sm" onClick={signOut}>
            Déconnexion
          </Button>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: 24,
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: FONT.serif,
                fontStyle: 'italic',
                fontSize: 30,
                letterSpacing: '-0.02em',
              }}
            >
              Stands
            </div>
            <div style={{ ...TEXT.small, color: COLOR.mute, marginTop: 2 }}>
              {stands.length} stand{stands.length !== 1 ? 's' : ''} enregistré
              {stands.length !== 1 ? 's' : ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {stands.length > 3 && (
              <input
                placeholder="Rechercher…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  padding: '8px 14px',
                  border: `1.5px solid ${COLOR.line}`,
                  borderRadius: SIZE.r3,
                  background: COLOR.paper,
                  fontFamily: FONT.sans,
                  fontSize: 13,
                  color: COLOR.ink,
                  outline: 'none',
                  width: 180,
                }}
              />
            )}
            <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
              + Nouveau stand
            </Button>
          </div>
        </div>

        {/* Toast: new stand created */}
        {newId && (
          <div
            style={{
              marginBottom: 16,
              padding: '12px 16px',
              borderRadius: SIZE.r3,
              background: COLOR.successBg,
              border: `1px solid ${COLOR.successMid}`,
              ...TEXT.small,
              color: COLOR.success,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>
              Stand créé · ID&nbsp;
              <span style={{ fontFamily: FONT.mono, fontWeight: 700 }}>{newId}</span>
            </span>
            <button
              onClick={() => setNewId(null)}
              style={{
                border: 0,
                background: 'transparent',
                cursor: 'pointer',
                color: COLOR.success,
                fontSize: 16,
                padding: 0,
              }}
            >
              ×
            </button>
          </div>
        )}

        {pending.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div
                style={{
                  ...TEXT.label,
                  color: COLOR.warning,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                En attente d'approbation
              </div>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: SIZE.rFull,
                  background: COLOR.warningBg,
                  ...TEXT.caption,
                  color: COLOR.warning,
                  fontWeight: 700,
                }}
              >
                {pending.length}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {pending.map((stand) => (
                <div
                  key={stand._id}
                  style={{
                    borderRadius: SIZE.r5,
                    border: `1.5px solid ${COLOR.warning}`,
                    overflow: 'hidden',
                  }}
                >
                  <StandCard
                    stand={stand}
                    onEdit={() => setEditing(stand)}
                    onStats={() => setStatsStand(stand)}
                    onApprove={() => approveStand(stand._id)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {active.length === 0 && pending.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 48, ...TEXT.body, color: COLOR.mute }}>
            {stands.length === 0 ? 'Aucun stand créé.' : 'Aucun résultat.'}
          </div>
        ) : active.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {active.map((stand) => (
              <StandCard
                key={stand._id}
                stand={stand}
                onEdit={() => setEditing(stand)}
                onStats={() => setStatsStand(stand)}
              />
            ))}
          </div>
        ) : null}
      </div>

      {editing && (
        <StandEditor
          stand={editing}
          onClose={() => setEditing(null)}
          onDeleted={() => setEditing(null)}
        />
      )}
      {showCreate && (
        <CreateStandModal
          onClose={() => setShowCreate(false)}
          onCreated={(id) => {
            setShowCreate(false);
            setNewId(id);
          }}
        />
      )}
      {statsStand && (
        <ScreenStats
          standId={statsStand._id}
          standName={statsStand.name}
          onClose={() => setStatsStand(null)}
        />
      )}
    </div>
  );
}
