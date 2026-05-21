import React, { useEffect, useState, lazy, Suspense, useRef, useCallback, useMemo } from 'react';
import { useApp } from './store/AppContext';
import { CmdK } from './components/command/CmdK';
import { Dock, TopBar } from './components/navigation/Dock';
import { BottomNav } from './components/navigation/BottomNav';
import { AiOrb } from './components/ui/Icons';
import { Dashboard } from './screens/Dashboard';
import { Auth } from './screens/Auth';
import { logout } from './store/auth';
import { AmbientVideo } from './components/effects/AmbientVideo';
import { PageTransition } from './components/effects/PageTransition';
import { FocusPanel } from './components/focus/FocusPanel';

const AiChat = lazy(() => import('./screens/AiChat').then(m => ({ default: m.AiChat })));
const Calendar = lazy(() => import('./screens/Calendar').then(m => ({ default: m.Calendar })));
const Contacts = lazy(() => import('./screens/Contacts').then(m => ({ default: m.Contacts })));
const Files = lazy(() => import('./screens/Files').then(m => ({ default: m.Files })));
const Notes = lazy(() => import('./screens/Notes').then(m => ({ default: m.Notes })));
const Onboarding = lazy(() => import('./screens/Onboarding').then(m => ({ default: m.Onboarding })));
const Planner = lazy(() => import('./screens/Planner').then(m => ({ default: m.Planner })));
const Settings = lazy(() => import('./screens/Settings').then(m => ({ default: m.Settings })));
const Tasks = lazy(() => import('./screens/Tasks').then(m => ({ default: m.Tasks })));

function BootSplash() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 18,
        background: 'rgba(236, 236, 236, 0.96)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        animation: 'splash-out 1s 600ms forwards',
      }}
    >
      <style>{`
        @keyframes splash-out { to { opacity: 0; pointer-events: none } }
        @keyframes splash-orb { from { transform: scale(.7); opacity: 0 } to { transform: scale(1); opacity: 1 } }
        @keyframes splash-text { 0% { opacity: 0; transform: translateY(8px) } 100% { opacity: 1; transform: translateY(0) } }
      `}</style>
      <div style={{ animation: 'splash-orb 700ms var(--ease-genie) both' }}>
        <AiOrb size={72} intensity={1.6} />
      </div>
      <div style={{ animation: 'splash-text 700ms 200ms var(--ease-glass) both', textAlign: 'center' }}>
        <div className="t-display" style={{ fontSize: 28, fontWeight: 400, letterSpacing: '-0.02em' }}>
          Build_PRO_MAX_1
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 6 }}>
          B.0.0.1 · Paper × Liquid Glass
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { state, actions, bootDone, authUser, setAuthUser, onLogout } = useApp();
  const [showAuth, setShowAuth] = useState(!authUser);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [screen, setScreen] = useState('dashboard');
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);
  const [topBarScrolled, setTopBarScrolled] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    window.__opencode = { onNavigate: setScreen, actions };
    return () => { delete window.__opencode; };
  }, [actions]);

  useEffect(() => {
    if (authUser) setShowAuth(false);
  }, [authUser]);

  const t = state.tweaks;

  useEffect(() => {
    if (authUser && state.user) {
      const initials = authUser.name ? authUser.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : authUser.email[0].toUpperCase();
      actions.updateUser({
        id: authUser.id,
        name: authUser.name || authUser.email.split('@')[0],
        email: authUser.email,
        avatar: initials,
        handle: '@' + (authUser.name || authUser.email.split('@')[0]).toLowerCase().replace(/\s+/g, ''),
      });

      const onboardingDone = localStorage.getItem('onboarding_complete');
      if (!onboardingDone) {
        setShowOnboarding(true);
      }
    }
  }, [authUser]);

  const handleLogout = useCallback(async () => {
    await logout();
    onLogout();
    setShowAuth(true);
    setShowOnboarding(false);
    setScreen('dashboard');
  }, [onLogout]);

  const handleAuth = (user) => {
    setAuthUser(user);
    setShowAuth(false);
  };

  const handleOnboardingComplete = () => {
    try {
      localStorage.setItem('onboarding_complete', 'true');
    } catch { /* ignore storage failures */ }
    setShowOnboarding(false);
  };

  const handleSetFocusMode = (mode) => {
    actions.setTweak('focusMode', mode);
  };

  useEffect(() => {
    if (!t) return;
    const root = document.documentElement;
    root.style.setProperty('--glass-blur', `${t.glassBlur}px`);
    root.style.setProperty('--grain-opacity', `${t.grain}`);
    root.style.setProperty('--ambient-opacity', `${t.ambient ?? 1}`);
    document.body.classList.toggle('canvas-mono', t.canvas === 'mono');

    if (t.palette?.length >= 4) {
      root.style.setProperty('--accent-amber', t.palette[0]);
      root.style.setProperty('--accent-orange', t.palette[1]);
      root.style.setProperty('--accent-coral', t.palette[2]);
      root.style.setProperty('--accent-rose', t.palette[3]);
    }

    const motionMap = { calm: 1.4, balanced: 1, lively: 0.7 };
    const k = motionMap[t.motion] || 1;
    root.style.setProperty('--motion-quick', `${180 * k}ms`);
    root.style.setProperty('--motion-mid', `${360 * k}ms`);
    root.style.setProperty('--motion-slow', `${620 * k}ms`);

    document.body.classList.toggle('focus-learner', t.focusMode === 'learner');
    document.body.classList.toggle('focus-execution', t.focusMode === 'execution');
    document.body.classList.toggle('focus-active', t.focusMode !== 'off');
  }, [t]);

  useEffect(() => {
    const SCREEN_KEYS = {
      '1': 'dashboard', '2': 'planner', '3': 'notes',
      '4': 'calendar', '5': 'tasks', '6': 'contacts',
      '7': 'files', '8': 'chat', '9': 'settings',
    };
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdkOpen((open) => !open);
      }
      if (e.key === 'Escape') setCmdkOpen(false);
      // 1–9 number shortcuts — only when no input is focused
      if (!e.metaKey && !e.ctrlKey && !e.altKey && SCREEN_KEYS[e.key]) {
        const active = document.activeElement?.tagName;
        if (active !== 'INPUT' && active !== 'TEXTAREA' && !document.activeElement?.isContentEditable) {
          setScreen(SCREEN_KEYS[e.key]);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Update document title dynamically per screen
  useEffect(() => {
    const labels = {
      dashboard: 'Build_PRO_MAX_1',
      planner: 'Planner · Build_PRO_MAX_1',
      notes: 'Notes · Build_PRO_MAX_1',
      calendar: 'Calendar · Build_PRO_MAX_1',
      tasks: 'Tasks · Build_PRO_MAX_1',
      contacts: 'Contacts · Build_PRO_MAX_1',
      files: 'Files · Build_PRO_MAX_1',
      chat: 'AI Chat · Build_PRO_MAX_1',
      settings: 'Settings · Build_PRO_MAX_1',
    };
    document.title = labels[screen] || 'Build_PRO_MAX_1';
  }, [screen]);

  // Detect scroll inside the active screen for top bar glass upgrade.
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const onScroll = (event) => {
      const target = event.target;
      if (target instanceof Element && target.classList.contains('scroll')) {
        setTopBarScrolled(target.scrollTop > 20);
      }
    };
    el.addEventListener('scroll', onScroll, { passive: true, capture: true });
    return () => el.removeEventListener('scroll', onScroll, { capture: true });
  }, [screen]);

  const hasNotifications = state.notifications?.some(n => !n.read);

  const isAuthConnected = !!authUser;

  // Stable Settings wrapper — defined outside render to prevent unmount/remount
  const SettingsScreen = useCallback((props) => (
    <Settings {...props} onShowAuth={() => setShowAuth(true)} onLogout={handleLogout} />
  ), [handleLogout]);

  const SCREENS = useMemo(() => ({
    dashboard: Dashboard,
    planner: Planner,
    notes: Notes,
    calendar: Calendar,
    tasks: Tasks,
    contacts: Contacts,
    files: Files,
    chat: AiChat,
    settings: SettingsScreen,
    onboarding: Onboarding,
  }), [SettingsScreen]);

  return (
    <>
      <div className={`paper ${t.canvas === 'mono' ? 'mono' : ''}`} />
      <div className="gradient-mesh" aria-hidden="true" />
      <div className="noise-overlay" aria-hidden="true" />
      <AmbientVideo />

      <div className="ambient" aria-hidden="true">
        <div className="orb o1" />
        <div className="orb o2" />
      </div>
      <div className="paper-edge" />

      <div
        ref={contentRef}
        data-screen-label={`Screen · ${screen}`}
        style={{
          position: 'fixed',
          inset: 0,
          opacity: bootDone ? 1 : 0,
          transform: bootDone ? 'scale(1)' : 'scale(1.02)',
          transition: 'opacity 600ms ease-out, transform 600ms var(--ease-glass)',
          overflow: 'hidden',
        }}
      >
        <Suspense fallback={<div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--ink-3)' }}>Loading…</div>}>
          <PageTransition screenKey={screen}>
            {React.createElement(SCREENS[screen] || Dashboard, { onNavigate: setScreen })}
          </PageTransition>
        </Suspense>
      </div>

      {showAuth && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(246,241,229,.85)', backdropFilter: 'blur(8px)',
          animation: 'expand-fade 200ms var(--ease-glass)',
        }}>
          <Auth onAuth={handleAuth} />
        </div>
      )}

      {showOnboarding && authUser && (
        <Suspense fallback={<div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--ink-3)', background: 'var(--paper-0)' }}>Loading onboarding…</div>}>
          <Onboarding onComplete={handleOnboardingComplete} />
        </Suspense>
      )}

      {t.focusMode !== 'execution' && (
        <TopBar
          user={state.user}
          today={state.today}
          onOpenCmdK={() => setCmdkOpen(true)}
          variant={t.nav}
          active={screen}
          onSelect={setScreen}
          hasNotifications={hasNotifications}
          onClearNotifications={actions.clearNotifications}
          onMarkAllRead={actions.markAllNotificationsRead}
          notifications={state.notifications}
          scrolled={topBarScrolled}
        />
      )}
      {t.focusMode !== 'execution' && (
        <Dock
          active={screen}
          onSelect={setScreen}
          variant={t.nav}
          onOpenCmdK={() => setCmdkOpen(true)}
          onOpenFocus={() => setFocusOpen(true)}
          focusMode={t.focusMode}
          hasNotifications={hasNotifications}
        />
      )}
      {t.focusMode !== 'execution' && (
        <BottomNav
          active={screen}
          onSelect={setScreen}
          onOpenCmdK={() => setCmdkOpen(true)}
          hasNotifications={hasNotifications}
        />
      )}
      <CmdK open={cmdkOpen} onClose={() => setCmdkOpen(false)} onNavigate={setScreen} />

      {t.focusMode !== 'off' && (
        <div style={{
          position: 'fixed', bottom: t.focusMode === 'execution' ? 20 : 'auto', top: t.focusMode !== 'execution' ? 14 : 'auto',
          left: '50%', transform: 'translateX(-50%)', zIndex: 100,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 14px 6px 16px',
          borderRadius: 999,
          background: t.focusMode === 'execution' ? 'rgba(26,20,16,.86)' : 'rgba(255,252,244,.7)',
          backdropFilter: 'blur(16px)',
          border: '0.5px solid rgba(255,255,255,.15)',
          boxShadow: '0 4px 16px rgba(0,0,0,.15)',
          animation: 'fade-in 300ms ease both',
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: t.focusMode === 'execution' ? 'var(--accent-coral)' : 'var(--info)',
            boxShadow: `0 0 6px ${t.focusMode === 'execution' ? 'var(--accent-coral)' : 'var(--info)'}`,
          }} />
          <span style={{
            fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em',
            color: t.focusMode === 'execution' ? '#fff8e8' : 'var(--ink-2)',
          }}>
            {t.focusMode === 'learner' ? 'Learner' : t.focusMode === 'execution' ? 'Execution' : 'Focus'}
          </span>
          <button onClick={() => setFocusOpen(true)}
            style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, color: t.focusMode === 'execution' ? 'rgba(255,255,255,.6)' : 'var(--ink-3)', marginLeft: 4 }}>
            Settings
          </button>
          <button onClick={() => handleSetFocusMode('off')}
            style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, color: t.focusMode === 'execution' ? 'rgba(255,165,36,.8)' : 'var(--accent-coral)', fontWeight: 600 }}>
            Exit
          </button>
        </div>
      )}

      {focusOpen && (
        <FocusPanel
          focusMode={t.focusMode}
          onSetMode={handleSetFocusMode}
          onNavigate={setScreen}
          onClose={() => setFocusOpen(false)}
        />
      )}
      {!bootDone && <BootSplash />}
    </>
  );
}
