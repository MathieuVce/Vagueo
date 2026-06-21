import { useState } from 'react';
import type { User } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase.ts';
import {
  PALETTE,
  FONT,
  FLOW_RATE_DEFAULT,
  FLOW_SLOW_DEFAULT,
  FLOW_SPRINT_DEFAULT,
  calcMinPerPerson,
} from '../tokens.ts';
import VagueoLogo from '../components/VagueoLogo.tsx';

interface Props {
  user: User;
  onCreated: (standId: string) => void;
}

function genStandId(): string {
  return 's_' + crypto.randomUUID().replace(/-/g, '').slice(0, 10);
}

export default function ScreenVendorCreate({ user, onCreated }: Props) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const p = PALETTE;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Le nom du stand est requis.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const standId = genStandId();
      await setDoc(doc(db, 'stands', standId), {
        current_wave: 0,
        queue_counter: 0,
        fill_wave: 0,
        fill_count: 0,
        is_paused: false,
        is_open: false,
        flow_rate: FLOW_RATE_DEFAULT,
        flow_slow: FLOW_SLOW_DEFAULT,
        flow_sprint: FLOW_SPRINT_DEFAULT,
        min_per_person: calcMinPerPerson(FLOW_RATE_DEFAULT),
        name: trimmedName,
        logo_url: '',
        address: address.trim(),
        status: 'pending_approval',
        vendor_uid: user.uid,
        vendor_email: user.email ?? '',
        createdAt: serverTimestamp(),
      });
      onCreated(standId);
    } catch {
      setError('Impossible de créer le stand. Réessayez.');
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    border: `1px solid ${p.line}`,
    borderRadius: 12,
    fontFamily: FONT,
    fontSize: 15,
    color: p.ink,
    background: p.paper,
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: p.paper,
        fontFamily: FONT,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 32px',
      }}
    >
      <VagueoLogo size={36} />

      <div
        style={{
          marginTop: 28,
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: p.ink,
        }}
      >
        Créer votre stand
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: 13,
          color: p.mute,
          textAlign: 'center',
          maxWidth: 280,
          lineHeight: 1.6,
        }}
      >
        Votre stand sera visible une fois approuvé par l'administrateur.
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          marginTop: 28,
          width: '100%',
          maxWidth: 320,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: p.mute,
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Nom du stand *
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex : Chez Marie"
            disabled={loading}
            style={inputStyle}
            autoFocus
          />
        </div>

        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: p.mute,
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Adresse (optionnel)
          </div>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Ex : Marché central, allée B"
            disabled={loading}
            style={inputStyle}
          />
        </div>

        {error && (
          <div style={{ fontSize: 13, color: '#e53e3e', textAlign: 'center' }}>{error}</div>
        )}

        <button
          type="submit"
          disabled={loading || !name.trim()}
          style={{
            marginTop: 8,
            padding: '14px',
            background: loading || !name.trim() ? p.line : p.ink,
            color: p.paper,
            border: 'none',
            borderRadius: 14,
            fontFamily: FONT,
            fontSize: 15,
            fontWeight: 600,
            cursor: loading || !name.trim() ? 'default' : 'pointer',
            transition: 'background 0.15s',
          }}
        >
          {loading ? 'Création…' : 'Créer mon stand'}
        </button>
      </form>

      <div style={{ marginTop: 24, fontSize: 12, color: p.mute }}>
        Connecté en tant que {user.email}
      </div>
    </div>
  );
}
