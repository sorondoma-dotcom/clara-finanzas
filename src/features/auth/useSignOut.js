import { useState } from 'react';
import { api } from '../../lib/api';

/**
 * Cierre de sesión en este dispositivo o en todos. Antes de salir espera a que los cambios
 * pendientes del plan se guarden, para no perder nada.
 */
export function useSignOut({ flush, hasPending, onLogout }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function signOut(everywhere = false) {
    setBusy(true); setError('');
    try {
      if (hasPending()) { await flush(); if (hasPending()) throw new Error('Hay cambios sin guardar. Resuélvelos antes de cerrar la sesión.'); }
      await api(everywhere ? '/auth/logout-all' : '/auth/logout', { method: 'POST', body: {} });
      onLogout();
    } catch (e) { setError(e.message); setBusy(false); }
  }
  return { signOut, busy, error };
}
