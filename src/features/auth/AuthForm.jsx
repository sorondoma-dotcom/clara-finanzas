import React, { useState } from 'react';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import { api, setCsrfToken } from '../../lib/api';
import RecoveryKey from './RecoveryKey';

const copy = {
  login: { title: 'Qué bien tenerte por aquí.', text: 'Tu plan, tus reservas y tus próximos pasos, en un solo lugar.', submit: 'Entrar en Clara' },
  register: { title: 'Empieza a vivir con más claridad.', text: 'Crea tu cuenta y lleva tus finanzas contigo.', submit: 'Crear mi cuenta' },
  recover: { title: 'Recupera tu tranquilidad.', text: 'Utiliza el código privado que guardaste al crear tu cuenta.', submit: 'Restablecer contraseña' },
};
const expiredCopy = { title: 'Vuelve a entrar.', text: 'Tu sesión ha terminado. Identifícate para recuperar tu espacio. Los cambios pendientes siguen en esta página.' };

function requestBody(mode, form) {
  if (mode === 'register') return { name: form.name, email: form.email, password: form.password };
  if (mode === 'recover') return { email: form.email, password: form.password, recoveryCode: form.recoveryCode.trim() };
  return { email: form.email, password: form.password };
}

export default function AuthForm({ onAuthenticated, lockedEmail = '', expired = false }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: lockedEmail, password: '', recoveryCode: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [recovery, setRecovery] = useState(null);
  const [message, setMessage] = useState('');
  const field = key => e => setForm(f => ({ ...f, [key]: e.target.value }));
  const switchMode = next => { setMode(next); setError(''); };

  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const result = await api(`/auth/${mode}`, { method: 'POST', body: requestBody(mode, form) });
      setForm(f => ({ ...f, password: '', recoveryCode: '' }));
      if (result.csrfToken) setCsrfToken(result.csrfToken, result.user?.id);
      if (result.recoveryCode) setRecovery(result);
      else onAuthenticated(result);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  if (recovery) {
    return <RecoveryKey code={recovery.recoveryCode} onDone={() => {
      if (mode === 'register') onAuthenticated(recovery);
      else { setRecovery(null); setMode('login'); setMessage('Contraseña actualizada. Entra con tu nueva contraseña.'); }
    }} />;
  }

  const title = expired && mode === 'login' ? expiredCopy.title : copy[mode].title;
  const description = expired ? expiredCopy.text : copy[mode].text;
  const passwordLabel = mode === 'recover' ? 'Nueva contraseña' : 'Contraseña';
  return (
    <div className="auth-form-card">
      <span className="eyebrow">TU ESPACIO PERSONAL</span>
      <h2>{title}</h2>
      <p>{description}</p>
      {!expired && mode !== 'recover' && (
        <div className="auth-tabs">
          <button className={mode === 'login' ? 'selected' : ''} onClick={() => switchMode('login')}>Iniciar sesión</button>
          <button className={mode === 'register' ? 'selected' : ''} onClick={() => switchMode('register')}>Crear cuenta</button>
        </div>
      )}
      <form onSubmit={submit}>
        {mode === 'register' && <label>Tu nombre<input required autoComplete="name" maxLength={80} value={form.name} onChange={field('name')} /></label>}
        <label>Correo electrónico<input type="email" required autoComplete="username" maxLength={254} readOnly={Boolean(lockedEmail)} value={form.email} onChange={field('email')} /></label>
        {mode === 'recover' && <label>Código de recuperación<input required autoComplete="off" minLength={43} maxLength={43} value={form.recoveryCode} onChange={field('recoveryCode')} /></label>}
        <label>{passwordLabel}
          <input aria-label={passwordLabel} type="password" required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'login' ? 1 : 15} maxLength={128} value={form.password} onChange={field('password')} />
          {mode !== 'login' && <span className="field-description">Entre 15 y 128 caracteres. Puedes usar una frase larga y única.</span>}
        </label>
        {error && <p className="auth-error" role="alert">{error}</p>}
        {message && <p className="auth-message" role="status">{message}</p>}
        <button className="button primary" type="submit" disabled={busy}>{busy ? 'Un momento…' : copy[mode].submit}<ArrowRight size={16} /></button>
      </form>
      <button className="auth-help" onClick={() => switchMode(mode === 'recover' ? 'login' : 'recover')}>{mode === 'recover' ? 'Volver al inicio de sesión' : 'He olvidado mi contraseña'}</button>
      <div className="auth-private"><LockKeyhole size={14} /><span>Tus finanzas solo están disponibles desde tu cuenta.</span></div>
      {mode === 'register' && <p className="auth-fineprint">Guardaremos tu nombre, correo y plan financiero para prestar el servicio. El correo identifica tu cuenta; la recuperación utiliza tu código privado.</p>}
    </div>
  );
}
