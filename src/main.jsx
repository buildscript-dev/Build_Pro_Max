import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { AppProvider } from './store/AppContext'
import { getSession } from './store/auth'
import { ErrorBoundary } from './components/ErrorBoundary'
import { SmoothScroll } from './components/effects/SmoothScroll'
import App from './App.jsx'
import './index.css'

// Register service worker for PWA offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker registration failed — app still works without it
    });
  });
}

// BroadcastChannel for cross-tab sync (same device, different browser tabs)
const STORAGE_KEY = 'build_pro_max_1_state';
const CHANNEL_NAME = 'build_pro_max_1_sync';

function setupCrossTabSync() {
  if (!('BroadcastChannel' in window)) return;

  const channel = new BroadcastChannel(CHANNEL_NAME);

  // Listen for state changes from other tabs
  channel.onmessage = (event) => {
    if (event.data?.type === 'STATE_UPDATE') {
      try {
        // Update our localStorage with the latest state from another tab
        localStorage.setItem(STORAGE_KEY, JSON.stringify(event.data.state));
        // Notify our app that state has changed externally
        window.dispatchEvent(new CustomEvent('build_pro_max_state_sync', {
          detail: event.data.state,
        }));
      } catch {
        // Ignore corrupted state from other tabs
      }
    }
  };

  // Listen for localStorage changes from other tabs (fallback)
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

// Expose sync utility globally for AppContext to use
window.__buildProMaxSync = setupCrossTabSync();

function Root() {
  const [authUser, setAuthUser] = useState(null);

  useEffect(() => {
    const session = getSession();
    if (session) setAuthUser(session);
  }, []);

  const handleAuth = (user) => setAuthUser(user);
  const handleLogout = () => setAuthUser(null);

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
