import React from 'react';
import { Bell, ChevronRight, Menu } from 'lucide-react';
import { pageLabel } from '../../config/navigation';

export default function Topbar({ page, user, syncLabel, hasAlerts, onOpenMenu, onShowAlerts, onOpenAccount }) {
  return (
    <header className="topbar">
      <div className="breadcrumb">
        <button className="icon-button mobile-menu" aria-label="Abrir menú" onClick={onOpenMenu}><Menu size={21} /></button>
        <span>Mi espacio</span><ChevronRight size={13} /><strong>{pageLabel(page)}</strong>
      </div>
      <div className="topbar-right">
        <span className="local-badge"><span className="status-dot" /> {syncLabel}</span>
        <button className="icon-button notification-button" onClick={onShowAlerts} aria-label="Ver avisos"><Bell size={19} />{hasAlerts && <i />}</button>
        <button className="avatar top-avatar" aria-label="Mi cuenta" title={user.email} onClick={onOpenAccount}>{user.name.slice(0, 2)}</button>
      </div>
    </header>
  );
}
