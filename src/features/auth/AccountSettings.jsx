import React, { useState } from 'react';
import { AtSign, LogOut, MonitorSmartphone, UserRound } from 'lucide-react';
import SettingsSection from '../../components/settings/SettingsSection';
import { useSignOut } from './useSignOut';
import SignOutModal from './SignOutModal';

/** Datos de la cuenta y cierre de sesión en este dispositivo. */
export default function AccountSettings({ user, syncLabel, flush, hasPending, onLogout, onGoToSecurity }) {
  const { signOut, busy, error } = useSignOut({ flush, hasPending, onLogout });
  const [confirming, setConfirming] = useState(false);
  return (
    <SettingsSection icon={UserRound} title="Tu cuenta" description="Los datos con los que accedes a Clara.">
      <article className="panel account-card">
        <div className="account-profile">
          <span className="account-avatar" aria-hidden="true">{user.name.slice(0, 2)}</span>
          <div><strong>{user.name}</strong><span>{user.email}</span></div>
        </div>
        <dl className="account-details">
          <div><dt><UserRound size={15} /> Nombre</dt><dd>{user.name}</dd></div>
          <div><dt><AtSign size={15} /> Correo de acceso</dt><dd>{user.email}<small>Identifica tu cuenta. Esta versión no envía correos ni lo verifica.</small></dd></div>
          <div><dt><MonitorSmartphone size={15} /> Este dispositivo</dt><dd>Sesión activa · {syncLabel.toLowerCase()}</dd></div>
        </dl>
      </article>
      <article className="panel account-card">
        <h3>Cerrar sesión</h3>
        <p className="field-description">Antes de salir, Clara termina de guardar los cambios pendientes. Para cerrar la sesión en otros dispositivos, ve a <button type="button" className="inline-link" onClick={onGoToSecurity}>Seguridad</button>.</p>
        <button className="button secondary" disabled={busy} onClick={() => setConfirming(true)}><LogOut size={16} /> Cerrar sesión</button>
      </article>
      {confirming && <SignOutModal busy={busy} error={error} onConfirm={() => signOut(false)} onClose={() => setConfirming(false)} />}
    </SettingsSection>
  );
}
