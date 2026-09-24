import React, { useState } from 'react';
import { Check, Leaf } from 'lucide-react';
import { colors, euro, monthKey, monthLabel } from '../lib/finance';
import ExpenseIcon from '../components/expenses/ExpenseIcon';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function MonthGrid({ month, due, selected, onSelect }) {
  const leadingBlanks = (new Date(`${month}-01T12:00:00`).getDay() + 6) % 7;
  const daysInMonth = new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate();
  const now = new Date();
  const isCurrentMonth = monthKey(now) === month;
  return (
    <div className="calendar-grid">
      {WEEKDAYS.map(d => <div className="calendar-weekday" key={d}>{d}</div>)}
      {Array.from({ length: leadingBlanks }, (_, i) => <div className="calendar-blank" key={`blank${i}`} />)}
      {Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const items = due.filter(e => e.date.getDate() === day);
        const today = isCurrentMonth && now.getDate() === day;
        return (
          <button key={day} className={`calendar-day ${today ? 'today' : ''} ${selected === day ? 'day-selected' : ''}`} onClick={() => onSelect(selected === day ? null : day)} aria-label={`${day}: ${items.length} cobros`}>
            <span>{day}</span>
            {items.slice(0, 2).map(e => <small key={e.id} style={{ '--event-color': colors[e.category] }}><i />{e.name}</small>)}
            {items.length > 2 && <small>+{items.length - 2} más</small>}
            {items.length > 0 && <b>{euro(items.reduce((s, e) => s + e.amount, 0))}</b>}
          </button>
        );
      })}
    </div>
  );
}

function Agenda({ items, isPaid, onTogglePaid }) {
  return (
    <div className="agenda-list">
      {items.map(e => {
        const paid = isPaid(e);
        return (
          <div className="agenda-item" key={e.id}>
            <ExpenseIcon expense={e} />
            <div><strong>{e.name}</strong><small>Día {e.date.getDate()} · {euro(e.amount, 2)}</small></div>
            <button className={`paid-toggle ${paid ? 'is-paid' : ''}`} onClick={() => onTogglePaid(e)} aria-label={`${paid ? 'Marcar pendiente' : 'Marcar pagado'}: ${e.name}`} title={paid ? 'Pagado' : 'Marcar pagado'}><Check size={17} /></button>
          </div>
        );
      })}
      {!items.length && <div className="empty-state"><Leaf size={28} /><p>Un día sin cobros previstos.</p></div>}
    </div>
  );
}

export default function CalendarPage({ view, isPaid, onTogglePaid }) {
  const [selected, setSelected] = useState(null);
  const { month, due, pending, current } = view;
  const agenda = due.filter(e => !selected || e.date.getDate() === selected);
  return (
    <section className="calendar-layout">
      <article className="panel calendar-panel">
        <div className="panel-heading">
          <div><h2 className="capitalize">{monthLabel(month)}</h2><p>{due.length} cobros previstos · {euro(current.charges, 2)}</p></div>
          <span className="category-tag">{due.length - pending.length} pagados</span>
        </div>
        <MonthGrid month={month} due={due} selected={selected} onSelect={setSelected} />
      </article>
      <article className="panel calendar-detail">
        <div className="panel-heading"><div><h2>{selected ? `Día ${selected}` : 'Agenda del mes'}</h2><p>Marca los cobros que ya has pagado.</p></div></div>
        <Agenda items={agenda} isPaid={isPaid} onTogglePaid={onTogglePaid} />
        <p className="agenda-note">Marcar un cobro como pagado organiza tu agenda. El gasto ya está incluido en tu previsión y no se descuenta otra vez.</p>
      </article>
    </section>
  );
}
