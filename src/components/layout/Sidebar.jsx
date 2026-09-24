import React from 'react';
import { ArrowUpRight, Leaf, Settings2, Sparkles } from 'lucide-react';
import { navigation } from '../../config/navigation';

export default function Sidebar({ page, open, expenseCount, userName, syncLabel, onNavigate, onShowMethod, onClose }) {
  return (
    <>
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <a className="brand" href="#" onClick={e => { e.preventDefault(); onNavigate('overview'); }}><span className="brand-mark">✳</span>clara<span className="brand-dot">.</span></a>
        <p className="brand-caption">TU DINERO, CON CLARIDAD</p>
        <div className="workspace-label">MI ESPACIO</div>
        <nav>
          {navigation.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${page === id ? 'active' : ''}`} onClick={() => onNavigate(id)}>
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
          <button className={`nav-item ${page === 'settings' ? 'active' : ''}`} onClick={() => onNavigate('settings')}><Settings2 size={19} />Configuración</button>
          <div className="profile"><span className="avatar">Tú</span><div><strong>{userName}</strong><small><span className="status-dot" /> {syncLabel}</small></div></div>
        </div>
      </aside>
      {open && <div className="sidebar-scrim" onClick={onClose} />}
    </>
  );
}
