import React, { useEffect, useState } from 'react';
import { Check, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react';
import { api } from '../../lib/api';
import SettingsSection from '../../components/settings/SettingsSection';
import RecoveryKey from './RecoveryKey';
import { useSignOut } from './useSignOut';
import SignOutModal from './SignOutModal';

const deviceLabel = session => session.current ? 'Este dispositivo' : /Mobile|Android|iPhone/.test(session.device) ? 'Móvil' : 'Otro navegador';

function PasswordForm({ onChanged }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const result = await api('/auth/password', { method: 'POST', body: { currentPassword, password } });
      setPassword(''); setCurrentPassword('');
      await onChanged(result);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return (
    <form className="panel account-card security-form" onSubmit={submit}>
      <h3><LockKeyhole size={17} /> Cambiar contraseña</h3>
      <label>Contraseña actual<input type="password" required autoComplete="current-password" maxLength={128} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} /></label>
      <label>Nueva contraseña<input type="password" required autoComplete="new-password" minLength={15} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} /></label>
      <p className="field-description">Entre 15 y 128 caracteres. Al cambiarla se cierran las demás sesiones y se genera un nuevo código de recuperación.</p>
      <button className="button primary" disabled={busy}>Actualizar contraseña</button>
      {error && <p className="auth-error" role="alert">{error}</p>}
    </form>
  );
}

/** Contraseña, código de recuperación y sesiones abiertas. */
export default function SecuritySettings({ flush, hasPending, onLogout, onAuthChanged }) {
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [confirming, setConfirming] = useState(false);
  const { signOut, busy, error: signOutError } = useSignOut({ flush, hasPending, onLogout });
  const loadSessions = () => api('/auth/sessions').then(r => setSessions(r.sessions));
  useEffect(() => { loadSessions().catch(e => setError(e.message)); }, []);

  async function passwordChanged(result) {
    onAuthChanged(result);
    setCode(result.recoveryCode);
    await loadSessions().catch(e => setError(e.message));
  }

  if (code) return <div className="panel account-card"><RecoveryKey code={code} onDone={() => setCode('')} /></div>;
  return (
    <SettingsSection icon={KeyRound} title="Seguridad" description="Protege el acceso a tu cuenta y revisa dónde está abierta.">
      <PasswordForm onChanged={passwordChanged} />
      <article className="panel account-card">
        <h3><ShieldCheck size={17} /> Código de recuperación</h3>
        <p className="field-description">Se mostró al crear tu cuenta y es de un solo uso. Si lo pierdes, cambia la contraseña para generar uno nuevo y guárdalo en tu gestor de contraseñas.</p>
      </article>
      <article className="panel account-card">
        <h3>Sesiones abiertas</h3>
        <p className="field-description">Hasta 5 sesiones activas. Caducan tras 24 horas sin actividad o 7 días desde el acceso.</p>
        <div className="session-list">
          {sessions.map((s, i) => <div key={i}><span>{deviceLabel(s)}</span><small>Última actividad: {new Date(s.last_seen).toLocaleString('es-ES')}</small>{s.current && <Check size={15} />}</div>)}
        </div>
        <button className="button secondary" disabled={busy} onClick={() => setConfirming(true)}>Cerrar todas las sesiones</button>
        {error && <p className="auth-error" role="alert">{error}</p>}
      </article>
      {confirming && <SignOutModal everywhere busy={busy} error={signOutError} onConfirm={() => signOut(true)} onClose={() => setConfirming(false)} />}
    </SettingsSection>
  );
}
