import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { api, setCsrfToken } from '../lib/api';
import AuthScreen from '../features/auth/AuthScreen';
import Dashboard from './Dashboard';

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
    setLoading(true);
    try { const next = await api('/plan'); setSession(result); setPlan(next); setError(''); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  }
  async function bootstrap() {
    setLoading(true); setError('');
    try {
      const result = await api('/auth/session');
      setCsrfToken(result.csrfToken, result.user?.id);
      const next = await api('/plan');
      setSession(result); setPlan(next);
    } catch (e) { if (e.status !== 401) setError(e.message); } finally { setLoading(false); }
  }
  useEffect(() => { bootstrap(); }, []);
  function logout() { setSession(null); setPlan(null); setCsrfToken(''); setExpired(false); }
  function authChanged(result) { setSession(result); setCsrfToken(result.csrfToken, result.user?.id); }

  if (loading) return <div className="auth-loading"><span className="brand-mark">✳</span><p>Preparando tu espacio…</p></div>;
  if (error && !session) {
    return <div className="auth-loading"><ShieldCheck size={32} /><h2>No hemos podido conectar.</h2><p>{error}</p><button className="button primary" onClick={bootstrap}>Volver a intentar</button></div>;
  }
  if (!session || !plan) return <AuthScreen onAuthenticated={authenticated} />;
  return (
    <>
      {expired && <AuthScreen expired lockedEmail={session.user.email} onAuthenticated={authenticated} />}
      {/* El panel se oculta pero no se desmonta: los cambios sin guardar sobreviven a la reautenticación. */}
      <div hidden={expired}>
        <Dashboard key={session.user.id} initialPlan={plan} user={session.user} authGeneration={generation} onExpired={() => setExpired(true)} onLogout={logout} onAuthChanged={authChanged} />
      </div>
    </>
  );
}
