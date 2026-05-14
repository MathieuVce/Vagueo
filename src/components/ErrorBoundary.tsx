import { Component, type ReactNode } from 'react';
import { PALETTE, FONT } from '../tokens.ts';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      const p = PALETTE;
      return (
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: p.paper, fontFamily: FONT,
          padding: '0 32px', textAlign: 'center', gap: 12,
        }}>
          <div style={{ fontSize: 28 }}>⚠</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: p.ink }}>Une erreur est survenue</div>
          <div style={{ fontSize: 13, color: p.mute, maxWidth: 280 }}>
            {this.state.error.message}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 8, border: `1px solid ${p.line}`, borderRadius: 12,
              padding: '10px 20px', cursor: 'pointer',
              background: 'transparent', fontFamily: FONT, fontSize: 14, color: p.ink,
            }}
          >
            Rafraîchir la page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
