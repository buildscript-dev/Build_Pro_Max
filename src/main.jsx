import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { AppProvider } from './store/AppContext'
import { getCurrentUser, onAuthStateChange } from './store/auth'
import { ErrorBoundary } from './components/ErrorBoundary'
import { SmoothScroll } from './components/effects/SmoothScroll'
import App from './App.jsx'
import './index.css'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker registration failed — app still works without it
    });
  });
}

const STORAGE_KEY = 'build_pro_max_1_state';
const CHANNEL_NAME = 'build_pro_max_1_sync';

function setupCrossTabSync() {
  if (!('BroadcastChannel' in window)) return;

  const channel = new BroadcastChannel(CHANNEL_NAME);

  channel.onmessage = (event) => {
    if (event.data?.type === 'STATE_UPDATE') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(event.data.state));
        window.dispatchEvent(new CustomEvent('build_pro_max_state_sync', {
          detail: event.data.state,
        }));
      } catch {
        // Ignore corrupted state from other tabs
      }
    }
  };

  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        window.dispatchEvent(new CustomEvent('build_pro_max_state_sync', {
          detail: JSON.parse(e.newValue),
        }));
      } catch {
        // Ignore corrupted storage data
      }
    }
  });

  return {
    broadcast: (state) => {
      try {
        channel.postMessage({ type: 'STATE_UPDATE', state });
      } catch {
        // Channel closed or message too large
      }
    },
    close: () => channel.close(),
  };
}

window.__buildProMaxSync = setupCrossTabSync();

function Root() {
  const [authUser, setAuthUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user) setAuthUser(user);
      setChecking(false);
    });

    const unsubscribe = onAuthStateChange((user) => {
      setAuthUser(user);
    });

    return () => unsubscribe();
  }, []);

  const handleAuth = (user) => setAuthUser(user);
  const handleLogout = () => setAuthUser(null);

  if (checking) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--paper-0)' }}>
        <div style={{ fontSize: 14, color: 'var(--ink-3)' }}>Loading…</div>
      </div>
    );
  }

  return (
    <AppProvider authUser={authUser} setAuthUser={handleAuth} onLogout={handleLogout}>
      <ErrorBoundary>
        <SmoothScroll>
          <App />
        </SmoothScroll>
      </ErrorBoundary>
    </AppProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
