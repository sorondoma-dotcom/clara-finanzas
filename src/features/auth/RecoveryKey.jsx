import React, { useState } from 'react';
import { ArrowRight, Download, KeyRound } from 'lucide-react';

function downloadCode(code) {
  const text = `Clara · Código de recuperación\n\n${code}\n\nGuárdalo en un lugar privado, separado de tu contraseña. Es de un solo uso y permite recuperar tu cuenta.\n`;
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  const a = document.createElement('a');
  a.href = url; a.download = 'clara-codigo-recuperacion.txt'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Muestra una única vez el código de recuperación y exige confirmar que se ha guardado. */
export default function RecoveryKey({ code, onDone }) {
  const [saved, setSaved] = useState(false);
  return (
    <div className="auth-form-card">
      <span className="metric-icon mint"><KeyRound size={24} /></span>
      <h2>Guarda tu llave de repuesto.</h2>
      <p>Este código permite recuperar tu cuenta si olvidas la contraseña. Se muestra una sola vez. Guárdalo en tu gestor de contraseñas o en un lugar privado.</p>
      <code className="recovery-code">{code}</code>
      <button className="button secondary" onClick={() => downloadCode(code)}><Download size={16} /> Descargar código</button>
      <label className="checkbox-label"><input type="checkbox" checked={saved} onChange={e => setSaved(e.target.checked)} /> He guardado mi código en un lugar seguro.</label>
      <button className="button primary" disabled={!saved} onClick={onDone}>Continuar <ArrowRight size={16} /></button>
    </div>
  );
}
