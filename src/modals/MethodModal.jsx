import React from 'react';
import { euro, monthLabel } from '../lib/finance';
import Modal from '../components/ui/Modal';

/** Explica cómo se calcula el disponible del mes seleccionado. */
export default function MethodModal({ current, startMonth, onClose }) {
  const rows = [
    ['Ingresos previstos', current.income],
    ['− Gastos mensuales y puntuales', current.fixed],
    ['− Reservas para pagos periódicos', current.provision],
    ['− Dinero que falta en las reservas', current.shortfall],
    ['− Presupuesto de vida diaria', current.variable],
    ['− Colchón de seguridad mensual', current.cushion],
  ];
  return (
    <Modal title="Lo que queda, de verdad." subtitle="El disponible es tu margen mensual planificado. Se calcula así:" onClose={onClose}>
      <div className="calculation">
        {rows.map(([label, value]) => <div key={label}><span>{label}</span><b>{euro(value, 2)}</b></div>)}
        <div className="calculation-total"><span>Tu disponible</span><b>{euro(current.available, 2)}</b></div>
      </div>
      <p className="help-copy">Las reservas empiezan en {monthLabel(startMonth)}. Los pagos anuales y trimestrales se cubren con lo reservado; si no alcanza, la diferencia reduce el disponible del mes del cobro. El saldo ya reservado se considera dinero separado de tus ingresos.</p>
      <p className="help-copy">Clara no se conecta a tu banco: el disponible no es tu saldo bancario ni incluye movimientos que no hayas registrado. El presupuesto diario cubre tus gastos variables; ajústalo si cambian. Las alertas aparecen al abrir la aplicación, sin notificaciones externas.</p>
    </Modal>
  );
}
