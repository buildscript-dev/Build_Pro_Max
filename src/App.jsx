import React, { useEffect, useState, lazy, Suspense } from 'react';
import { useApp } from './store/AppContext';
import { CmdK } from './components/command/CmdK';
import { Dock, TopBar } from './components/navigation/Dock';
import { BottomNav } from './components/navigation/BottomNav';
import { AiOrb } from './components/ui/Icons';
import { Dashboard } from './screens/Dashboard';
import { Auth } from './screens/Auth';

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
  const [showAuth, setShowAuth] = useState(false);
  const [screen, setScreen] = useState('dashboard');
  const [cmdkOpen, setCmdkOpen] = useState(false);

  // Expose navigation for agentic AI
  useEffect(() => {
    window.__opencode = { onNavigate: setScreen, actions };
    return () => { delete window.__opencode; };
  }, [actions]);

  const t = state.tweaks;

  // Sync auth user into app state on mount
  useEffect(() => {
    if (authUser && state.user) {
      const initials = authUser.name ? authUser.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : authUser.email[0].toUpperCase();
      actions.updateUser({
        name: authUser.name || authUser.email.split('@')[0],
        email: authUser.email,
        avatar: initials,
        handle: '@' + (authUser.name || authUser.email.split('@')[0]).toLowerCase().replace(/\s+/g, ''),
      });
    }
  }, []); // only on mount

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

  const hasNotifications = state.notifications?.some(n => !n.read);

  const isAuthConnected = !!authUser;
  const SCREENS = {
    dashboard: Dashboard,
    planner: Planner,
    notes: Notes,
    calendar: Calendar,
    tasks: Tasks,
    contacts: Contacts,
    files: Files,
    chat: AiChat,
    settings: (props) => <Settings {...props} onShowAuth={() => setShowAuth(true)} />,
    onboarding: Onboarding,
  };

  return (
    <>
      <div className={`paper ${t.canvas === 'mono' ? 'mono' : ''}`} />
      {/* liquid-fx SVG removed — feTurbulence+feDisplacementMap was the #1 GPU bottleneck.
           The warm gradient atmosphere is now handled by the ambient orbs + paper canvas. */}

      <div className="ambient" aria-hidden="true">
        <div className="orb o1" />
        <div className="orb o2" />
        {/* orbs o3 & o4 removed — were the largest GPU cost elements */}
      </div>
      <div className="paper-edge" />

      <div
        data-screen-label={`Screen · ${screen}`}
        style={{
          position: 'fixed',
          inset: 0,
          opacity: bootDone ? 1 : 0,
          transform: bootDone ? 'scale(1)' : 'scale(1.02)',
          transition: 'opacity 600ms ease-out, transform 600ms var(--ease-glass)',
        }}
      >
        <Suspense fallback={<div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--ink-3)' }}>Loading…</div>}>
          {React.createElement(SCREENS[screen] || Dashboard, { onNavigate: setScreen })}
        </Suspense>
      </div>

      {showAuth && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(246,241,229,.85)', backdropFilter: 'blur(8px)',
          animation: 'expand-fade 200ms var(--ease-glass)',
        }}>
          <Auth onAuth={(user) => { setShowAuth(false); typeof setAuthUser === 'function' && setAuthUser(user); }} />
        </div>
      )}

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
      />
      <Dock
        active={screen}
        onSelect={setScreen}
        variant={t.nav}
        onOpenCmdK={() => setCmdkOpen(true)}
        hasNotifications={hasNotifications}
      />
      <BottomNav
        active={screen}
        onSelect={setScreen}
        onOpenCmdK={() => setCmdkOpen(true)}
        hasNotifications={hasNotifications}
      />
      <CmdK open={cmdkOpen} onClose={() => setCmdkOpen(false)} onNavigate={setScreen} />
      {!bootDone && <BootSplash />}
    </>
  );
}
