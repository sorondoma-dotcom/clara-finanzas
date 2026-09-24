import React from 'react';
import { LogOut } from 'lucide-react';
import Modal from '../../components/ui/Modal';

/** Confirmación antes de cerrar la sesión en este dispositivo o en todos. */
export default function SignOutModal({ everywhere, busy, error, onConfirm, onClose }) {
  return (
    <Modal
      title={everywhere ? '¿Cerrar todas las sesiones?' : '¿Cerrar sesión?'}
      subtitle={everywhere
        ? 'Se cerrará tu cuenta en todos los dispositivos, incluido este. Tendrás que volver a entrar en cada uno.'
        : 'Tendrás que volver a introducir tu correo y contraseña para entrar. Antes, Clara guardará los cambios pendientes.'}
      onClose={busy ? () => {} : onClose}
    >
      {error && <p className="auth-error" role="alert">{error}</p>}
      <div className="modal-actions">
        <button type="button" className="button secondary" disabled={busy} onClick={onClose}>Cancelar</button>
        <button type="button" className="button danger" disabled={busy} onClick={onConfirm}>
          <LogOut size={16} /> {busy ? 'Cerrando…' : everywhere ? 'Cerrar todas' : 'Cerrar sesión'}
        </button>
      </div>
    </Modal>
  );
}
