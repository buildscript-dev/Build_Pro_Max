import React, { useState } from 'react';
import { AiOrb, PaperButton } from '../components/ui/Icons';
import { login, signup, loginWithGoogle, resetPassword } from '../store/auth.js';

export const Auth = ({ onAuth }) => {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = mode === 'login'
        ? await login(email, password)
        : await signup(email, password, name);
      if (result.ok) {
        if (result.needsEmailConfirmation) {
          setError('Check your email to confirm your account, then sign in.');
        } else {
          onAuth(result.user);
        }
      } else {
        setError(result.error);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await loginWithGoogle();
      if (result.ok && result.url) {
        window.location.href = result.url;
      } else if (result.error) {
        setError(result.error);
      }
    } catch {
      setError('Google login failed. Please try again.');
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Enter your email address first.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await resetPassword(email);
      if (result.ok) {
        setForgotSent(true);
      } else {
        setError(result.error);
      }
    } catch {
      setError('Password reset failed. Please try again.');
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
                {showForgot ? 'Reset password' : mode === 'login' ? 'Welcome back' : 'Create your account'}
              </div>
            </div>

            {showForgot ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {forgotSent ? (
                  <div style={{ textAlign: 'center', fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6 }}>
                    <p>Password reset link sent to <strong>{email}</strong></p>
                    <p style={{ fontSize: 12, color: 'var(--ink-3)' }}>Check your inbox and spam folder.</p>
                    <PaperButton onClick={() => { setShowForgot(false); setForgotSent(false); }} style={{ marginTop: 12, width: '100%', justifyContent: 'center' }}>
                      Back to sign in
                    </PaperButton>
                  </div>
                ) : (
                  <>
                    <input
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      style={{ all: 'unset', padding: '12px 14px', fontSize: 14, borderRadius: 10, border: '0.5px solid var(--ink-line)', background: 'rgba(255,252,244,.7)', width: '100%', boxSizing: 'border-box', color: 'var(--ink-1)' }}
                    />
                    <PaperButton primary onClick={handleForgotPassword} style={{ width: '100%', justifyContent: 'center', height: 42 }} disabled={loading}>
                      {loading ? 'Sending…' : 'Send reset link'}
                    </PaperButton>
                    <button type="button" onClick={() => { setShowForgot(false); setError(''); }} style={{ fontSize: 12.5, color: 'var(--accent-orange)', textAlign: 'center', background: 'none', border: 'none', cursor: 'pointer' }}>
                      Back to sign in
                    </button>
                  </>
                )}
              </div>
            ) : (
              <>
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

                  <PaperButton type="submit" primary style={{ width: '100%', justifyContent: 'center', height: 42 }} disabled={loading}>
                    {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
                  </PaperButton>
                </form>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
                  <div style={{ flex: 1, height: '0.5px', background: 'var(--ink-line)' }} />
                  <span style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>or</span>
                  <div style={{ flex: 1, height: '0.5px', background: 'var(--ink-line)' }} />
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  style={{
                    width: '100%', height: 42, borderRadius: 10,
                    border: '0.5px solid var(--ink-line)',
                    background: 'rgba(255,252,244,.7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    fontSize: 14, color: 'var(--ink-1)', fontWeight: 500,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.5 : 1,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                  Continue with Google
                </button>

                <button
                  type="button"
                  onClick={() => onAuth({ id: '00000000-0000-0000-0000-000000000001', email: 'dev@local.host', name: 'Dev User', avatar: 'DV' })}
                  disabled={loading}
                  style={{
                    marginTop: 10,
                    width: '100%', height: 42, borderRadius: 10,
                    border: '1px dashed var(--ink-line)',
                    background: 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, color: 'var(--ink-2)', fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Skip Login (Dev Mode)
                </button>

                <div style={{ marginTop: 20, textAlign: 'center', fontSize: 12.5, color: 'var(--ink-3)' }}>
                  {mode === 'login' ? (
                    <>Don't have an account?{' '}<button type="button" onClick={() => { setMode('signup'); setError(''); }} style={{ color: 'var(--accent-orange)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>Sign up</button></>
                  ) : (
                    <>Already have an account?{' '}<button type="button" onClick={() => { setMode('login'); setError(''); }} style={{ color: 'var(--accent-orange)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>Sign in</button></>
                  )}
                </div>

                {mode === 'login' && (
                  <div style={{ marginTop: 8, textAlign: 'center' }}>
                    <button type="button" onClick={() => { setShowForgot(true); setError(''); }} style={{ fontSize: 12, color: 'var(--ink-3)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
                      Forgot password?
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
