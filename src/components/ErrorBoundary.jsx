import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 16, padding: 40,
          background: 'rgba(246,241,229,.96)', backdropFilter: 'blur(20px)',
        }}>
          <div className="t-display" style={{ fontSize: 28, color: 'var(--accent-coral)' }}>Something went wrong</div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', maxWidth: 400, textAlign: 'center', lineHeight: 1.6 }}>
            {this.state.error.message}
          </div>
          <button onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            style={{
              padding: '10px 24px', borderRadius: 999, fontSize: 14, fontWeight: 600,
              background: 'var(--accent-orange)', color: '#fff', border: 'none', cursor: 'pointer',
            }}>
            Reload app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
