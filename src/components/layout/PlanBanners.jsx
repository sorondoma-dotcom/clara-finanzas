import React from 'react';
import { AlertTriangle, ArrowRight, Sparkles } from 'lucide-react';

export function SyncNotice({ cloud, onExport, onReload }) {
  return (
    <div className="notice warning">
      <AlertTriangle size={17} /> {cloud.error || 'Hay cambios pendientes de sincronizar.'}
      <button onClick={onExport}>Descargar mis cambios</button>
      <button onClick={onReload}>Cargar versión guardada</button>
      {cloud.status === 'error' && <button onClick={cloud.flush}>Reintentar</button>}
    </div>
  );
}

export function LegacyPlanBanner({ onImport, onDismiss }) {
  return (
    <div className="demo-banner">
      <span>Hay un plan de la versión anterior en este navegador.</span>
      <button onClick={onImport}>Importar a mi cuenta <ArrowRight size={14} /></button>
      <button onClick={onDismiss}>Ahora no</button>
    </div>
  );
}

export function DemoBanner({ onStart }) {
  return (
    <div className="demo-banner">
      <span><Sparkles size={15} /> Estás explorando con datos de ejemplo. Tu tranquilidad empieza con tus cifras.</span>
      <button onClick={onStart}>Configurar mi plan <ArrowRight size={14} /></button>
    </div>
  );
}
