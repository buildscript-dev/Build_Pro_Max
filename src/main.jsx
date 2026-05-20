import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { AppProvider } from './store/AppContext'
import { isLoggedIn, getCurrentUser, getSession } from './store/auth'
import { Auth } from './screens/Auth'
import App from './App.jsx'
import './index.css'

function Root() {
  const [authUser, setAuthUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const session = getSession();
    if (session) {
      setAuthUser(session);
    }
    setChecking(false);
  }, []);

  const handleAuth = (user) => {
    setAuthUser(user);
  };

  const handleLogout = () => {
    setAuthUser(null);
  };

  if (checking) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--paper-0)', color: 'var(--ink-3)', fontSize: 14
      }}>
        Loading…
      </div>
    );
  }

  if (!authUser) {
    return <Auth onAuth={handleAuth} />;
  }

  return (
    <AppProvider authUser={authUser}>
      <App onLogout={handleLogout} />
    </AppProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
