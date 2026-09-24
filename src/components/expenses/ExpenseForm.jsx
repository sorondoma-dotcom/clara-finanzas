import React, { useState } from 'react';
import { Check, ShieldCheck, Trash2 } from 'lucide-react';
import { categories, euro, frequencyLabels, intervals, monthlyReserve } from '../../lib/finance';
import Modal from '../ui/Modal';

const emptyExpense = startMonth => ({ name: '', amount: '', category: 'Suscripciones', frequency: 'monthly', day: 1, start: startMonth, end: '', fund: 0 });

export default function ExpenseForm({ expense, startMonth, onSave, onClose, onDelete }) {
  const [form, setForm] = useState(expense || emptyExpense(startMonth));
  const field = (key, value) => setForm(f => ({ ...f, [key]: value }));
  const periodic = intervals[form.frequency] > 1;
  function submit(e) {
    e.preventDefault();
    onSave({ ...form, id: form.id || crypto.randomUUID(), name: form.name.trim(), amount: Number(form.amount), day: Number(form.day), fund: periodic ? Number(form.fund) : 0 });
  }
  return (
    <Modal title={expense ? 'Los detalles de tu gasto' : 'Un gasto previsto, una sorpresa menos.'} subtitle="Añádelo una vez. Clara lo tendrá en cuenta en los próximos meses." onClose={onClose}>
      <form onSubmit={submit}>
        <label>Nombre del gasto<input autoFocus required pattern=".*\S.*" title="Escribe un nombre para el gasto" maxLength={100} value={form.name} onChange={e => field('name', e.target.value)} placeholder="Ej. Seguro del coche" /></label>
        <div className="form-grid">
          <label>Importe de cada pago (€)<input type="number" min="0.01" max="100000000" step="0.01" required value={form.amount} onChange={e => field('amount', e.target.value)} placeholder="0,00" /></label>
          <label>Frecuencia<select value={form.frequency} onChange={e => field('frequency', e.target.value)}>{Object.entries(frequencyLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label>Categoría<select value={form.category} onChange={e => field('category', e.target.value)}>{categories.map(c => <option key={c}>{c}</option>)}</select></label>
          <label>Día de cobro<input type="number" min="1" max="31" required value={form.day} onChange={e => field('day', e.target.value)} /></label>
          <label>{periodic ? 'Primer vencimiento del plan' : 'Primer mes de cobro'}<input type="month" required value={form.start} onChange={e => field('start', e.target.value)} /></label>
          <label>Último mes (opcional)<input type="month" min={form.start} value={form.end || ''} onChange={e => field('end', e.target.value)} /></label>
        </div>
        {periodic && (
          <div className="reserve-form">
            <label>Ya reservado al inicio del plan (€)<input type="number" min="0" max="100000000" step="0.01" required value={form.fund} onChange={e => field('fund', e.target.value)} /></label>
            <p><ShieldCheck size={16} /> Reservarás {euro(monthlyReserve({ ...form, amount: Number(form.amount) }), 2)} al mes. Si no basta para el próximo pago, añadiremos la diferencia a ese mes.</p>
          </div>
        )}
        <div className="modal-actions">
          {expense && <button type="button" className="button danger-ghost" onClick={() => onDelete(expense)}><Trash2 size={16} /> Eliminar</button>}
          <button type="button" className="button secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="button primary"><Check size={17} /> Guardar gasto</button>
        </div>
      </form>
    </Modal>
  );
}
