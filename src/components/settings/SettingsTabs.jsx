import React, { useRef } from 'react';
import { settingsSections } from '../../config/settingsSections';

export const tabId = id => `settings-tab-${id}`;
export const panelId = id => `settings-panel-${id}`;

/** Menú superior de Configuración. Accesible con flechas, Inicio y Fin (patrón WAI-ARIA de pestañas). */
export default function SettingsTabs({ active, onChange }) {
  const refs = useRef({});
  function onKeyDown(e, index) {
    const last = settingsSections.length - 1;
    const next = { ArrowRight: index === last ? 0 : index + 1, ArrowLeft: index === 0 ? last : index - 1, Home: 0, End: last }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    const { id } = settingsSections[next];
    onChange(id);
    refs.current[id]?.focus();
  }
  return (
    <div className="settings-tabs" role="tablist" aria-label="Apartados de configuración">
      {settingsSections.map(({ id, label, short, icon: Icon }, index) => {
        const selected = id === active;
        return (
          <button
            key={id} ref={node => { refs.current[id] = node; }} id={tabId(id)} type="button" role="tab"
            aria-label={label} aria-selected={selected} aria-controls={panelId(id)} tabIndex={selected ? 0 : -1}
            className={`settings-tab ${selected ? 'selected' : ''}`} onClick={() => onChange(id)} onKeyDown={e => onKeyDown(e, index)}
          >
            <Icon size={17} aria-hidden="true" />
            <span className="settings-tab-label" aria-hidden="true">{label}</span>
            <span className="settings-tab-short" aria-hidden="true">{short}</span>
          </button>
        );
      })}
    </div>
  );
}
