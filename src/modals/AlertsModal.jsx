import React from 'react';
import { AlertTriangle, CalendarDays, ShieldCheck } from 'lucide-react';
import { dueDate, euro, monthLabel } from '../lib/finance';
import Modal from '../components/ui/Modal';

export default function AlertsModal({ alerts, upcoming, onClose }) {
  return (
    <Modal title="Nada fuera de tu radar." subtitle="Avisos de los próximos tres meses del periodo seleccionado." onClose={onClose}>
      <div className="alerts-list">
        {alerts.map(m => (
          <div className="alert-item" key={m.key}>
            <AlertTriangle size={20} />
            <div>
              <h3 className="capitalize">{monthLabel(m.key)}</h3>
              {m.shortfall > 0 && <p>Necesitarás {euro(m.shortfall, 2)} adicionales para completar tus reservas. Ya están descontados de la previsión.</p>}
              {m.available < 0 && <p>El plan supera tus ingresos en {euro(Math.abs(m.available), 2)}. Revisa los gastos o el presupuesto.</p>}
            </div>
          </div>
        ))}
        {upcoming.map(e => (
          <div className="alert-item calm" key={`${e.id}-${e.month}`}>
            <CalendarDays size={20} />
            <div>
              <h3>{e.name} · {euro(e.amount, 2)}</h3>
              <p>Vence el {dueDate(e, e.month).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}. {e.gap > 0 ? 'Requiere completar la reserva.' : 'Contemplado con tus reservas previstas.'}</p>
            </div>
          </div>
        ))}
        {!alerts.length && !upcoming.length && <div className="empty-state"><ShieldCheck size={32} /><h3>Todo en orden por aquí</h3><p>No hay avisos especiales para este periodo.</p></div>}
      </div>
    </Modal>
  );
}
