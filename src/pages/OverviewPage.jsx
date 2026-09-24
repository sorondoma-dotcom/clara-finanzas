import React, { useState } from 'react';
import { AlertTriangle, ArrowDownLeft, ArrowRight, ArrowUpRight, CalendarDays, CheckCheck, CircleHelp, CreditCard, ShieldCheck, Wallet } from 'lucide-react';
import { colors, euro, frequencyLabels, isVariableIncome, monthLabel } from '../lib/finance';
import CategoryDonut from '../components/charts/CategoryDonut';
import ForecastChart from '../components/charts/ForecastChart';
import ExpenseTable from '../components/expenses/ExpenseTable';

const RANGES = [6, 12];

const incomeNote = (month, variable) => !variable ? 'Tu ingreso mensual previsto' : month.incomeEstimated ? 'Ingreso variable · estimado' : 'Ingreso variable · indicado';

function SummaryCards({ current, variableIncome, expenseTotal, expenseCount, onNavigate, onShowMethod }) {
  return (
    <section className="summary-grid">
      <article className={`available-card ${current.available < 0 ? 'negative' : ''}`}>
        <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" /><div className="hero-orbit orbit-three" />
        <div className="available-top">
          <span><span className="tiny-spark">✳</span> TU DISPONIBLE REAL</span>
          <button className="icon-button" aria-label="Cómo se calcula el disponible" onClick={onShowMethod}><CircleHelp size={17} /></button>
        </div>
        <div className="available-value">{euro(current.available, 2)}</div>
        <p>para gastar, ahorrar o invertir este mes</p>
        <div className="available-bottom"><span><ShieldCheck size={14} /> Después de cubrir tu plan</span><ArrowUpRight size={21} /></div>
      </article>
      <article className="metric-card">
        <div className="metric-icon mint"><ArrowDownLeft size={20} /></div>
        <span className="metric-label">Ingresos del mes</span>
        <strong>{euro(current.income, 2)}</strong>
        <button className="metric-footer" onClick={() => onNavigate('settings')}><span className="status-dot" />{incomeNote(current, variableIncome)} <ArrowUpRight size={14} /></button>
      </article>
      <article className="metric-card">
        <div className="metric-icon peach"><CreditCard size={19} /></div>
        <span className="metric-label">Gastos previstos</span>
        <strong>{euro(expenseTotal, 2)}</strong>
        <span className="metric-footer">{expenseCount} gastos · reservas incluidas</span>
      </article>
      <article className="metric-card">
        <div className="metric-icon lavender"><ShieldCheck size={20} /></div>
        <span className="metric-label">Tu colchón protegido</span>
        <strong>{euro(current.cushion, 2)}</strong>
        <button className="metric-footer" onClick={() => onNavigate('settings')}><span className="small-pill">A TU RITMO</span> Ajustar <ArrowUpRight size={13} /></button>
      </article>
    </section>
  );
}

function StatusNotice({ alerts, upcoming, onNavigate }) {
  const first = alerts[0];
  const detail = first
    ? `${monthLabel(first.key)}: ${first.shortfall > 0 ? `${euro(first.shortfall, 2)} extra para completar reservas` : `${euro(Math.abs(first.available), 2)} de déficit previsto`}.`
    : upcoming.length ? `El próximo pago de ${upcoming[0].name.toLowerCase()} ya está contemplado en tu plan.` : 'Tus gastos registrados están contemplados en la previsión.';
  return (
    <div className={`notice ${first ? 'warning' : ''}`}>
      <span className="notice-icon">{first ? <AlertTriangle size={19} /> : <ShieldCheck size={19} />}</span>
      <div><strong>{first ? 'Hay un mes que necesita tu atención.' : 'Lo previsto da tranquilidad.'}</strong><span>{detail}</span></div>
      <button onClick={() => onNavigate('reserves')}>Ver reservas <ArrowRight size={15} /></button>
    </div>
  );
}

function CategoryLegend({ data }) {
  const rest = data.slice(4);
  return (
    <div className="category-legend">
      {data.slice(0, 4).map(c => <div key={c.name}><span><i style={{ background: colors[c.name] }} />{c.name}</span><b>{euro(c.value, 2)}</b></div>)}
      {rest.length > 0 && <div><span><i style={{ background: '#d8d6c6' }} />Otras categorías</span><b>{euro(rest.reduce((s, c) => s + c.value, 0), 2)}</b></div>}
    </div>
  );
}

function UpcomingCharges({ pending, month, onNavigate }) {
  return (
    <article className="panel upcoming-panel">
      <div className="panel-heading"><div><h2>Próximos cobros</h2><p>Un vistazo a tu calendario del mes.</p></div><CalendarDays size={18} className="muted" /></div>
      <div className="upcoming-list">
        {pending.slice(0, 4).map(e => (
          <div className="upcoming-item" key={e.id}>
            <div className="date-tile"><strong>{e.date.getDate()}</strong><span>{monthLabel(month, true).replace('.', '')}</span></div>
            <div><strong>{e.name}</strong><small>{frequencyLabels[e.frequency]}</small></div>
            <b>{euro(e.amount, 2)}</b>
          </div>
        ))}
        {!pending.length && <div className="mini-empty"><CheckCheck size={27} /><p>Todo al día.<br />No hay cobros pendientes este mes.</p></div>}
      </div>
      <button className="full-width-link" onClick={() => onNavigate('calendar')}>Abrir mi calendario <ArrowRight size={15} /></button>
    </article>
  );
}

export default function OverviewPage({ data, view, onNavigate, onShowMethod, onOpenExpense }) {
  const [range, setRange] = useState(6);
  const { current, month, ahead, alerts, upcoming, pending, categoryData, expenseTotal } = view;
  return (
    <>
      <SummaryCards current={current} variableIncome={isVariableIncome(data)} expenseTotal={expenseTotal} expenseCount={data.expenses.length} onNavigate={onNavigate} onShowMethod={onShowMethod} />
      <StatusNotice alerts={alerts} upcoming={upcoming} onNavigate={onNavigate} />
      <section className="middle-grid">
        <article className="panel forecast-panel">
          <div className="panel-heading">
            <div><h2>Una mirada a los próximos meses</h2><p>Tu margen de libertad, mes a mes.</p></div>
            <div className="segmented">{RANGES.map(n => <button key={n} className={range === n ? 'selected' : ''} onClick={() => setRange(n)}>{n} meses</button>)}</div>
          </div>
          <div className="chart-legend"><span><i className="legend-dot green" />Disponible</span><span><i className="legend-dot sand" />Comprometido</span><span><i className="legend-line" />Ingresos</span></div>
          <ForecastChart data={ahead.slice(0, range)} />
          <div className="chart-bottom">
            <span><span className="status-dot" /> Incluye gastos, reservas, presupuesto diario y colchón</span>
            <button onClick={() => onNavigate('forecast')}>Explorar previsión <ArrowUpRight size={14} /></button>
          </div>
        </article>
        <article className="panel distribution-panel">
          <div className="panel-heading"><div><h2>¿Dónde va tu dinero?</h2><p>Cada euro tiene su lugar.</p></div><span className="subtle-icon"><Wallet size={18} /></span></div>
          <CategoryDonut data={categoryData} total={expenseTotal} />
          <CategoryLegend data={categoryData} />
        </article>
      </section>
      <section className="bottom-grid">
        <article className="panel expenses-panel">
          <div className="panel-heading">
            <div><h2>Tus gastos, sin sorpresas <span className="count-pill">{data.expenses.length}</span></h2><p>Lo recurrente, siempre a la vista.</p></div>
            <button className="text-button" onClick={() => onNavigate('expenses')}>Ver todos <ArrowRight size={15} /></button>
          </div>
          <ExpenseTable items={data.expenses.slice(0, 5)} ahead={ahead} compact onOpen={onOpenExpense} />
        </article>
        <UpcomingCharges pending={pending} month={month} onNavigate={onNavigate} />
      </section>
    </>
  );
}
