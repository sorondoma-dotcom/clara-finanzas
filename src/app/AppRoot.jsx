import React, { Suspense, lazy, useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { api, setCsrfToken } from '../lib/api';
import { withMinimumDuration } from '../lib/motion';
import AuthScreen from '../features/auth/AuthScreen';
import LoadingScreen from '../components/ui/LoadingScreen';

// El panel (y los gráficos) se descargan después del acceso: la pantalla de login carga antes.
const loadDashboard = () => import('./Dashboard').then(module => module.loadOverviewPage().then(() => module));
const Dashboard = lazy(loadDashboard);
const LOGIN_ANIMATION_MS = 900;

/** Controla la sesión: comprueba la cookie al arrancar, muestra el acceso o el espacio del usuario. */
export default function AppRoot() {
  const [session, setSession] = useState(null);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(false);
  // Se incrementa al reautenticarse para que el guardado pendiente se reanude.
  const [generation, setGeneration] = useState(0);

  async function authenticated(result) {
    setCsrfToken(result.csrfToken, result.user?.id);
    if (session?.user.id === result.user.id && plan) { setSession(result); setExpired(false); setGeneration(n => n + 1); return; }
    setLoading('login');
    try { const next = await withMinimumDuration(Promise.all([api('/plan'), loadDashboard()]).then(([next]) => next), LOGIN_ANIMATION_MS); setSession(result); setPlan(next); setError(''); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  }
  async function bootstrap() {
    setLoading(true); setError('');
    try {
      const result = await api('/auth/session');
      setCsrfToken(result.csrfToken, result.user?.id);
      const next = await withMinimumDuration(Promise.all([api('/plan'), loadDashboard()]).then(([next]) => next), 500);
      setSession(result); setPlan(next);
    } catch (e) { if (e.status !== 401) setError(e.message); } finally { setLoading(false); }
  }
  useEffect(() => { bootstrap(); }, []);
  function logout() { setSession(null); setPlan(null); setCsrfToken(''); setExpired(false); }
  function authChanged(result) { setSession(result); setCsrfToken(result.csrfToken, result.user?.id); }

  if (loading) return <LoadingScreen message={loading === 'login' ? 'Abriendo tu espacio…' : 'Preparando tu espacio…'} />;
  if (error && !session) {
    return <div className="auth-loading"><ShieldCheck size={32} /><h2>No hemos podido conectar.</h2><p>{error}</p><button className="button primary" onClick={bootstrap}>Volver a intentar</button></div>;
  }
  if (!session || !plan) return <AuthScreen onAuthenticated={authenticated} />;
  return (
    <>
      {expired && <AuthScreen expired lockedEmail={session.user.email} onAuthenticated={authenticated} />}
      {/* El panel se oculta pero no se desmonta: los cambios sin guardar sobreviven a la reautenticación. */}
      <div hidden={expired}>
        <Suspense fallback={<LoadingScreen />}>
          <Dashboard key={session.user.id} initialPlan={plan} user={session.user} authGeneration={generation} onExpired={() => setExpired(true)} onLogout={logout} onAuthChanged={authChanged} />
        </Suspense>
      </div>
    </>
  );
}
