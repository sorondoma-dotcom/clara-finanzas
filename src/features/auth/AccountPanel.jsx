import React, { useEffect, useState } from 'react';
import { Check, LogOut, ShieldCheck } from 'lucide-react';
import { api } from '../../lib/api';
import RecoveryKey from './RecoveryKey';

const deviceLabel = session => session.current ? 'Este dispositivo' : /Mobile|Android|iPhone/.test(session.device) ? 'Móvil' : 'Otro navegador';

/** Sesiones activas, cierre de sesión y cambio de contraseña. */
export default function AccountPanel({ user, onLogout, onAuthChanged, flush, hasPending }) {
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const loadSessions = () => api('/auth/sessions').then(r => setSessions(r.sessions));
  useEffect(() => { loadSessions().catch(e => setError(e.message)); }, []);

  async function run(action) {
    setBusy(true); setError('');
    try { await action(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  const leave = all => run(async () => {
    // No se cierra la sesión hasta que los cambios pendientes estén guardados.
    if (hasPending()) { await flush(); if (hasPending()) throw new Error('Hay cambios sin guardar. Resuélvelos antes de cerrar la sesión.'); }
    await api(all ? '/auth/logout-all' : '/auth/logout', { method: 'POST', body: {} });
    onLogout();
  });
  const changePassword = e => { e.preventDefault(); run(async () => {
    const result = await api('/auth/password', { method: 'POST', body: { currentPassword, password } });
    onAuthChanged(result); setCode(result.recoveryCode); setPassword(''); setCurrentPassword('');
    await loadSessions();
  }); };

  if (code) return <RecoveryKey code={code} onDone={() => setCode('')} />;
  return (
    <article className="panel account-panel">
      <div className="account-heading"><ShieldCheck size={23} /><div><h2>Tu cuenta y tus sesiones</h2><p>{user.name} · {user.email}</p></div></div>
      <p className="field-description">Hasta 5 sesiones activas. Caducan tras 24 horas sin actividad o 7 días desde el acceso.</p>
      <div className="session-list">
        {sessions.map((s, i) => <div key={i}><span>{deviceLabel(s)}</span><small>Última actividad: {new Date(s.last_seen).toLocaleString('es-ES')}</small>{s.current && <Check size={15} />}</div>)}
      </div>
      <div className="account-buttons">
        <button className="button secondary" disabled={busy} onClick={() => leave(false)}><LogOut size={16} /> Cerrar sesión</button>
        <button className="button secondary" disabled={busy} onClick={() => leave(true)}>Cerrar todas las sesiones</button>
      </div>
      <form onSubmit={changePassword}>
        <h3>Cambiar contraseña</h3>
        <label>Contraseña actual<input type="password" required autoComplete="current-password" maxLength={128} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} /></label>
        <label>Nueva contraseña<input type="password" required autoComplete="new-password" minLength={15} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} /></label>
        <p className="field-description">Cierra las demás sesiones y genera un nuevo código de recuperación.</p>
        <button className="button primary" disabled={busy}>Actualizar contraseña</button>
      </form>
      {error && <p className="auth-error" role="alert">{error}</p>}
    </article>
  );
}
