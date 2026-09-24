import React from 'react';

/** Pantalla de carga a pantalla completa (arranque, inicio de sesión). */
export default function LoadingScreen({ message = 'Preparando tu espacio…' }) {
  return (
    <div className="auth-loading loading-screen" role="status" aria-live="polite">
      <div className="loader-mark" aria-hidden="true">
        <span className="loader-ring" />
        <span className="brand-mark">✳</span>
      </div>
      <p className="loader-brand">clara<span className="brand-dot">.</span></p>
      <p className="loader-message">{message}</p>
      <div className="loader-bar" aria-hidden="true"><span /></div>
    </div>
  );
}
