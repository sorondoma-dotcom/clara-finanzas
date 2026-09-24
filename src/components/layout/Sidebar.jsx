import React, { useEffect, useRef } from 'react';
import { ArrowUpRight, Leaf, Settings2, Sparkles, X } from 'lucide-react';
import { navigation } from '../../config/navigation';

export const SIDEBAR_ID = 'app-sidebar';

/** En escritorio es una barra fija; en tablet y móvil, un panel lateral que abre el menú hamburguesa. */
export default function Sidebar({ page, open, expenseCount, userName, syncLabel, onNavigate, onShowMethod, onClose }) {
  const ref = useRef();
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    ref.current?.querySelector('.nav-item')?.focus();
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('menu-open');
    return () => { document.removeEventListener('keydown', onKey); document.body.classList.remove('menu-open'); previous?.focus?.(); };
  }, [open]);

  return (
    <>
      <aside ref={ref} id={SIDEBAR_ID} className={`sidebar ${open ? 'sidebar-open' : ''}`} aria-label="Menú principal">
        <button className="icon-button sidebar-close" aria-label="Cerrar menú" onClick={onClose}><X size={20} /></button>
        <a className="brand" href="#" onClick={e => { e.preventDefault(); onNavigate('overview'); }}><span className="brand-mark">✳</span>clara<span className="brand-dot">.</span></a>
        <p className="brand-caption">TU DINERO, CON CLARIDAD</p>
        <div className="workspace-label">MI ESPACIO</div>
        <nav>
          {navigation.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${page === id ? 'active' : ''}`} aria-current={page === id ? 'page' : undefined} onClick={() => onNavigate(id)}>
              <Icon size={19} /><span>{label}</span>
              {id === 'expenses' && <span className="nav-count">{expenseCount}</span>}
              {id === 'overview' && <span className="active-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="note-art"><Leaf size={29} /><Sparkles size={14} /></span>
            <h3>La tranquilidad<br />también se planifica.</h3>
            <p>Un pequeño hábito hoy.<br />Más libertad mañana.</p>
            <button onClick={onShowMethod}>Así funciona Clara <ArrowUpRight size={14} /></button>
          </div>
          <button className={`nav-item ${page === 'settings' ? 'active' : ''}`} aria-current={page === 'settings' ? 'page' : undefined} onClick={() => onNavigate('settings')}><Settings2 size={19} />Configuración</button>
          <div className="profile"><span className="avatar">Tú</span><div><strong>{userName}</strong><small><span className="status-dot" /> {syncLabel}</small></div></div>
        </div>
      </aside>
      <div className={`sidebar-scrim ${open ? 'visible' : ''}`} onClick={onClose} aria-hidden="true" />
    </>
  );
}
