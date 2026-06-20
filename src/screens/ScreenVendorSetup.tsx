import type { CSSProperties } from 'react';
import { useState } from 'react';
import VagueoLogo from '../components/VagueoLogo.tsx';
import { COLOR, FONT, TEXT, SIZE, ANIM } from '../ui/design.ts';
import { Button, Field, NumberField, Toggle, Segment, Label } from '../ui/index.ts';
import {
  FLOW_SLOW_DEFAULT,
  FLOW_SPRINT_DEFAULT,
  FLOW_RATE_LABELS,
  calcMinPerPerson,
  CALL_AHEAD_MIN_DEFAULT,
} from '../tokens.ts';
import type { Stand } from '../types.ts';
import type { ConfigureParams } from '../hooks/useStand.ts';

interface ScreenVendorSetupProps {
  stand: Stand;
  onSave: (data: ConfigureParams | null) => void;
  isEditing?: boolean;
}

const s = {
  root: {
    position: 'absolute',
    inset: 0,
    zIndex: 50,
    background: COLOR.paper,
    fontFamily: FONT.sans,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'auto',
    animation: ANIM.fadeIn,
  } satisfies CSSProperties,
  header: {
    padding: '18px 22px 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  } satisfies CSSProperties,
  form: {
    flex: 1,
    padding: '40px 24px 0',
    maxWidth: 420,
    width: '100%',
    margin: '0 auto',
  } satisfies CSSProperties,
  title: {
    ...TEXT.display,
    fontSize: 36,
  } satisfies CSSProperties,
  subtitle: {
    ...TEXT.small,
    color: COLOR.mute,
    marginTop: 8,
  } satisfies CSSProperties,
  logoSection: {
    marginTop: 36,
  } satisfies CSSProperties,
  logoRow: {
    marginTop: 10,
    display: 'flex',
    gap: 14,
    alignItems: 'center',
  } satisfies CSSProperties,
  logoPreview: {
    width: 72,
    height: 72,
    borderRadius: SIZE.r5,
    flexShrink: 0,
    border: `1.5px solid ${COLOR.line}`,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: COLOR.surface,
  } satisfies CSSProperties,
  logoImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  } satisfies CSSProperties,
  logoUrlWrap: {
    flex: 1,
  } satisfies CSSProperties,
  logoError: {
    ...TEXT.small,
    color: COLOR.danger,
    marginTop: 6,
  } satisfies CSSProperties,
  fieldGap: {
    marginTop: 28,
  } satisfies CSSProperties,
  fieldGapSm: {
    marginTop: 20,
  } satisfies CSSProperties,
  flowSection: {
    marginTop: 28,
  } satisfies CSSProperties,
  flowHint: {
    ...TEXT.small,
    color: COLOR.mute,
    marginTop: 4,
  } satisfies CSSProperties,
  flowRow: {
    marginTop: 14,
    display: 'flex',
    gap: 12,
  } satisfies CSSProperties,
  flowTable: {
    marginTop: 14,
    borderRadius: SIZE.r3,
    border: `1px solid ${COLOR.line}`,
    overflow: 'hidden',
  } satisfies CSSProperties,
  flowTableRow: (even: boolean) =>
    ({
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 14px',
      background: even ? 'transparent' : COLOR.surface,
    }) satisfies CSSProperties,
  flowTableLabel: {
    ...TEXT.small,
    color: COLOR.mute,
  } satisfies CSSProperties,
  segmentWrap: {
    marginTop: 10,
  } satisfies CSSProperties,
  numberWrap: {
    marginTop: 10,
  } satisfies CSSProperties,
  toggleWrap: {
    marginTop: 12,
  } satisfies CSSProperties,
  footer: {
    padding: '32px 24px 48px',
    maxWidth: 420,
    width: '100%',
    margin: '0 auto',
  } satisfies CSSProperties,
  required: {
    ...TEXT.small,
    color: COLOR.mute,
    textAlign: 'center',
    marginTop: 8,
  } satisfies CSSProperties,
};

export default function ScreenVendorSetup({
  stand,
  onSave,
  isEditing = false,
}: ScreenVendorSetupProps) {
  const [name, setName] = useState(stand.name ?? '');
  const [logoUrl, setLogoUrl] = useState(stand.logo_url ?? '');
  const [address, setAddress] = useState(stand.address ?? '');
  const [isOpen, setIsOpen] = useState(stand.is_open ?? false);
  const [flowSlow, setFlowSlow] = useState(stand.flow_slow ?? FLOW_SLOW_DEFAULT);
  const [flowSprint, setFlowSprint] = useState(stand.flow_sprint ?? FLOW_SPRINT_DEFAULT);
  const [limitQueue, setLimitQueue] = useState(stand.max_queue_size != null);
  const [maxQueueSize, setMaxQueueSize] = useState<number>(stand.max_queue_size ?? 30);
  const [limitDelay, setLimitDelay] = useState(stand.max_delayed != null);
  const [maxDelayed, setMaxDelayed] = useState<number>(stand.max_delayed ?? 5);
  const [callAheadMin, setCallAheadMin] = useState<number>(
    stand.call_ahead_min ?? CALL_AHEAD_MIN_DEFAULT,
  );
  const [saving, setSaving] = useState(false);
  const [imgError, setImgError] = useState(false);

  const canSave = name.trim().length > 0;

  function extractImageUrl(raw: string): string {
    try {
      const imgurl = new URL(raw).searchParams.get('imgurl');
      if (imgurl) return decodeURIComponent(imgurl);
    } catch (_) {}
    return raw;
  }

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    await onSave({
      name,
      logoUrl,
      address,
      isOpen,
      flowSlow,
      flowSprint,
      maxQueueSize: limitQueue ? maxQueueSize : null,
      maxDelayed: limitDelay ? maxDelayed : null,
      callAheadMin,
    });
    setSaving(false);
  }

  return (
    <div style={s.root}>
      {/* Header */}
      <div style={s.header}>
        <VagueoLogo size={18} color={COLOR.ink} accent={COLOR.primary} />
        {isEditing && (
          <Button variant="ghost" size="sm" onClick={() => onSave(null)}>
            Annuler
          </Button>
        )}
      </div>

      {/* Form */}
      <div style={s.form}>
        <div style={s.title}>{isEditing ? 'Paramètres\ndu stand' : 'Créez\nvotre stand'}</div>
        <div style={s.subtitle}>
          {isEditing
            ? 'Modifiez les informations de votre stand.'
            : 'Ces informations seront visibles par vos clients quand ils scannent le QR code.'}
        </div>

        {/* Logo */}
        <div style={s.logoSection}>
          <Label>Logo (facultatif)</Label>
          <div style={s.logoRow}>
            <div style={s.logoPreview}>
              {logoUrl && !imgError ? (
                <img
                  src={logoUrl}
                  alt="logo"
                  style={s.logoImg}
                  onError={() => setImgError(true)}
                  onLoad={() => setImgError(false)}
                />
              ) : (
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={COLOR.mute}
                  strokeWidth="1.5"
                >
                  <rect x="3" y="3" width="18" height="18" rx="4" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              )}
            </div>
            <div style={s.logoUrlWrap}>
              <Field
                type="url"
                placeholder="https://… (lien vers votre logo)"
                value={logoUrl}
                onChange={(v) => {
                  setLogoUrl(extractImageUrl(v));
                  setImgError(false);
                }}
              />
            </div>
          </div>
          {logoUrl && imgError && (
            <div style={s.logoError}>Image inaccessible · vérifiez que l'URL est publique.</div>
          )}
        </div>

        {/* Stand name */}
        <div style={s.fieldGap}>
          <Field
            label="Nom du stand"
            placeholder="Ex : Churros Mathieu, Crêpes du marché…"
            value={name}
            onChange={setName}
            max={60}
            style={{ fontSize: 16 }}
          />
        </div>

        {/* Address */}
        <div style={s.fieldGapSm}>
          <Field
            label="Adresse / Emplacement (facultatif)"
            placeholder="Ex : Marché des Capucins, Stand B12…"
            value={address}
            onChange={setAddress}
            max={100}
          />
        </div>

        {/* Flow rate */}
        <div style={s.flowSection}>
          <Label>Débit de service</Label>
          <div style={s.flowHint}>Temps moyen pour servir une personne selon l'affluence.</div>
          <div style={s.flowRow}>
            <NumberField
              label="Forte affluence"
              value={flowSlow}
              onChange={(v) => setFlowSlow(+Math.max(flowSprint + 0.5, v).toFixed(1))}
              min={2}
              max={30}
              step={0.5}
              unit="min/pers"
            />
            <NumberField
              label="Faible affluence"
              value={flowSprint}
              onChange={(v) =>
                setFlowSprint(+Math.min(flowSlow - 0.5, Math.max(0.5, v)).toFixed(1))
              }
              min={0.5}
              step={0.5}
              unit="min/pers"
            />
          </div>
          {/* Flow preview table */}
          <div style={s.flowTable}>
            {[1, 2, 3, 4, 5].map((level) => (
              <div key={level} style={s.flowTableRow(level % 2 === 0)}>
                <span style={s.flowTableLabel}>{FLOW_RATE_LABELS[level - 1]}</span>
                <span
                  style={{
                    ...TEXT.small,
                    fontWeight: level === 1 || level === 5 ? 600 : 400,
                    color: COLOR.ink,
                  }}
                >
                  {calcMinPerPerson(level, flowSlow, flowSprint)} min/pers
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Max queue size */}
        <div style={s.fieldGap}>
          <Label>Capacité de la file</Label>
          <div style={s.segmentWrap}>
            <Segment<boolean>
              value={limitQueue}
              onChange={setLimitQueue}
              options={[
                { value: false, label: 'Illimitée' },
                { value: true, label: 'Limitée' },
              ]}
            />
          </div>
          {limitQueue && (
            <div style={s.numberWrap}>
              <NumberField
                value={maxQueueSize}
                onChange={(v) => setMaxQueueSize(Math.max(1, v))}
                min={1}
                max={500}
                unit="personnes max"
              />
            </div>
          )}
        </div>

        {/* Max delays */}
        <div style={s.fieldGapSm}>
          <Label>Délais simultanés</Label>
          <div style={s.flowHint}>
            Nombre max de clients qui peuvent être en délai en même temps.
          </div>
          <div style={s.segmentWrap}>
            <Segment<boolean>
              value={limitDelay}
              onChange={setLimitDelay}
              options={[
                { value: false, label: 'Illimité' },
                { value: true, label: 'Limité' },
              ]}
            />
          </div>
          {limitDelay && (
            <div style={s.numberWrap}>
              <NumberField
                value={maxDelayed}
                onChange={(v) => setMaxDelayed(Math.max(0, v))}
                min={0}
                max={100}
                unit="délais max"
              />
            </div>
          )}
        </div>

        {/* Call-ahead window */}
        <div style={s.fieldGapSm}>
          <Label>Avance de notification</Label>
          <div style={s.flowHint}>
            Temps estimé restant avant leur tour auquel les clients sont appelés à venir.
          </div>
          <div style={s.numberWrap}>
            <NumberField
              value={callAheadMin}
              onChange={(v) => setCallAheadMin(Math.max(2, Math.min(30, v)))}
              min={2}
              max={30}
              step={1}
              unit="min avant leur tour"
            />
          </div>
        </div>

        {/* is_open toggle */}
        <div style={s.fieldGap}>
          <Label>File d'attente</Label>
          <div style={s.toggleWrap}>
            <Toggle
              on={isOpen}
              onToggle={() => setIsOpen((v) => !v)}
              label={
                isOpen ? 'Ouverte · les clients peuvent rejoindre' : 'Fermée · QR code inactif'
              }
              sublabel={
                isOpen
                  ? 'Vous pouvez fermer la file à tout moment depuis le dashboard.'
                  : "Personne ne peut rejoindre jusqu'à ce que vous l'ouvriez."
              }
            />
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={s.footer}>
        <Button
          full
          size="lg"
          onClick={handleSave}
          disabled={!canSave}
          loading={saving}
          style={{ borderRadius: SIZE.r5, fontSize: 17 }}
        >
          {isEditing ? 'Sauvegarder' : 'Créer mon stand'}
        </Button>
        {!canSave && <div style={s.required}>Le nom du stand est requis.</div>}
      </div>
    </div>
  );
}
