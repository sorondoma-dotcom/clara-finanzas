import React from 'react';

/** Cabecera común de cada apartado de Configuración. */
export default function SettingsSection({ icon: Icon, title, description, children, aside }) {
  return (
    <div className={`settings-section ${aside ? 'with-aside' : ''}`}>
      <div className="settings-section-main">
        <header className="settings-section-heading">
          {Icon && <span className="metric-icon mint"><Icon size={21} /></span>}
          <div><h2>{title}</h2>{description && <p>{description}</p>}</div>
        </header>
        {children}
      </div>
      {aside && <aside className="settings-section-aside">{aside}</aside>}
    </div>
  );
}
