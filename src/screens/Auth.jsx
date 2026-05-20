import React, { useState } from 'react';
import { AiOrb, PaperButton } from '../components/ui/Icons';
import { login, signup } from '../store/auth';

export const Auth = ({ onAuth }) => {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = mode === 'login'
        ? await login(email, password)
        : await signup(email, password, name);
      if (result.ok) {
        onAuth(result.user);
      } else {
        setError(result.error);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--paper-0)',
      padding: 24,
    }}>
      <div className="ambient" aria-hidden="true">
        <div className="orb o1" />
        <div className="orb o2" />
      </div>
      <div className="paper-edge" />
      <div style={{
        position: 'relative', zIndex: 2,
        width: '100%', maxWidth: 420,
      }}>
        <div className="glass" style={{ borderRadius: 20 }}>
          <div className="glass-pane" style={{ padding: '36px 32px 32px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 28 }}>
              <AiOrb size={48} intensity={1.2} />
              <h1 className="t-display" style={{ fontSize: 28, fontWeight: 400, letterSpacing: '-0.02em', margin: 0 }}>
                Build_PRO_MAX_1
              </h1>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                {mode === 'login' ? 'Welcome back' : 'Create your account'}
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {mode === 'signup' && (
                <input
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ all: 'unset', padding: '12px 14px', fontSize: 14, borderRadius: 10, border: '0.5px solid var(--ink-line)', background: 'rgba(255,252,244,.7)', width: '100%', boxSizing: 'border-box', color: 'var(--ink-1)' }}
                />
              )}
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ all: 'unset', padding: '12px 14px', fontSize: 14, borderRadius: 10, border: '0.5px solid var(--ink-line)', background: 'rgba(255,252,244,.7)', width: '100%', boxSizing: 'border-box', color: 'var(--ink-1)' }}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                style={{ all: 'unset', padding: '12px 14px', fontSize: 14, borderRadius: 10, border: '0.5px solid var(--ink-line)', background: 'rgba(255,252,244,.7)', width: '100%', boxSizing: 'border-box', color: 'var(--ink-1)' }}
              />

              {error && (
                <div style={{ fontSize: 12, color: 'var(--accent-coral)', padding: '6px 10px', borderRadius: 6, background: 'rgba(231,64,46,.08)' }}>
                  {error}
                </div>
              )}

              <PaperButton primary style={{ width: '100%', justifyContent: 'center', height: 42 }} disabled={loading}>
                {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
              </PaperButton>
            </form>

            <div style={{ marginTop: 20, textAlign: 'center', fontSize: 12.5, color: 'var(--ink-3)' }}>
              {mode === 'login' ? (
                <>Don't have an account?{' '}<button onClick={() => { setMode('signup'); setError(''); }} style={{ color: 'var(--accent-orange)', cursor: 'pointer', textDecoration: 'underline' }}>Sign up</button></>
              ) : (
                <>Already have an account?{' '}<button onClick={() => { setMode('login'); setError(''); }} style={{ color: 'var(--accent-orange)', cursor: 'pointer', textDecoration: 'underline' }}>Sign in</button></>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
