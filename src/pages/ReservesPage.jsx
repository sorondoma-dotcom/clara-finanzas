import React from 'react';
import { AlertTriangle, Pencil, Plus, ShieldCheck } from 'lucide-react';
import { dueDate, euro, frequencyLabels, monthLabel } from '../lib/finance';
import { findNextDue } from '../hooks/usePlanView';
import ExpenseIcon from '../components/expenses/ExpenseIcon';

function ReserveCard({ expense, view, onEdit }) {
  const item = view.current.items.find(i => i.id === expense.id);
  const next = findNextDue(view.ahead, expense.id);
  const nextItem = next?.items.find(i => i.id === expense.id);
  return (
    <article className="panel reserve-card">
      <div className="reserve-card-top">
        <ExpenseIcon expense={expense} />
        <span className="frequency-tag frequency-special">{frequencyLabels[expense.frequency]}</span>
        <button className="icon-button" aria-label={`Editar ${expense.name}`} onClick={() => onEdit(expense)}><Pencil size={16} /></button>
      </div>
      <h2>{expense.name}</h2>
      <p>{next ? `Próximo pago: ${dueDate(expense, next.key).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}` : 'Sin pagos en los próximos meses'}</p>
      <div className="reserve-amount"><strong>{euro(item.fundAfter, 2)}</strong><span> / {euro(expense.amount)} del próximo pago</span></div>
      <div className="progress-track"><div style={{ width: `${Math.min(100, item.fundAfter / expense.amount * 100)}%` }} /></div>
      <div className="reserve-detail"><span>Reserva mensual</span><b>{euro(item.reserve, 2)}</b></div>
      {nextItem?.gap > 0
        ? <div className="reserve-status needs-attention"><AlertTriangle size={15} /> Faltarán {euro(nextItem.gap, 2)} en el vencimiento</div>
        : <div className="reserve-status"><ShieldCheck size={15} />{item.due ? 'Pago de este mes contemplado' : 'Próximo pago cubierto con el plan'}</div>}
      <small className="reserve-footnote">Saldo previsto al cierre de {monthLabel(view.month, true)}, después de los cobros.</small>
    </article>
  );
}

export default function ReservesPage({ view, onOpenExpense }) {
  return (
    <>
      <div className="reserve-intro">
        <div className="reserve-intro-icon"><ShieldCheck size={32} /></div>
        <div><h2>Los pagos grandes se preparan poco a poco.</h2><p>Clara aparta una parte cada mes para tus pagos trimestrales y anuales. El dinero reservado ya está excluido de tu disponible.</p></div>
        <div><span>Aportación de este mes</span><strong>{euro(view.current.provision, 2)}</strong></div>
      </div>
      <div className="reserves-grid">
        {view.annuals.map(e => <ReserveCard key={e.id} expense={e} view={view} onEdit={onOpenExpense} />)}
        <button className="add-reserve" onClick={() => onOpenExpense()}><span><Plus size={26} /></span><h3>Prepara tu próximo gran pago</h3><p>Añade un gasto anual o trimestral</p></button>
      </div>
    </>
  );
}
