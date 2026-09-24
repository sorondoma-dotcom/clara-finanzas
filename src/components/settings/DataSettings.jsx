import React from 'react';
import { ArrowDownToLine, CloudCheck, DatabaseBackup, RotateCcw, Upload } from 'lucide-react';
import SettingsSection from './SettingsSection';

export default function DataSettings({ expenseCount, syncLabel, onExport, onImport, onReset }) {
  return (
    <SettingsSection icon={DatabaseBackup} title="Tus datos, bajo tu control" description="Tu plan se guarda en tu cuenta y se sincroniza entre dispositivos.">
      <div className="settings-cards">
        <article className="panel settings-card">
          <span className="settings-card-icon"><CloudCheck size={20} /></span>
          <h3>Guardado en tu cuenta</h3>
          <p>{expenseCount} gastos y toda tu configuración económica están guardados en la base de datos de Clara, no en este navegador.</p>
          <span className="settings-status"><span className="status-dot" /> {syncLabel}</span>
        </article>
        <article className="panel settings-card">
          <span className="settings-card-icon"><ArrowDownToLine size={20} /></span>
          <h3>Copia de seguridad</h3>
          <p>Descarga tu plan en un archivo JSON o restaura una copia anterior. La copia sustituye el plan guardado en tu cuenta.</p>
          <div className="settings-card-actions">
            <button className="button secondary" onClick={onExport}><ArrowDownToLine size={17} /> Descargar copia</button>
            <button className="button secondary" onClick={onImport}><Upload size={17} /> Importar copia</button>
          </div>
        </article>
        <article className="panel settings-card reset-panel">
          <span className="settings-card-icon danger"><RotateCcw size={20} /></span>
          <h3>Un nuevo comienzo</h3>
          <p>Borra el plan actual y vuelve a organizar tus cuentas. Te propondremos descargar antes una copia.</p>
          <button className="text-button" onClick={onReset}><RotateCcw size={16} /> Empezar de cero</button>
        </article>
      </div>
    </SettingsSection>
  );
}
