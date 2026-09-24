import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { categories } from '../lib/finance';
import ExpenseTable from '../components/expenses/ExpenseTable';

const ALL = 'Todas';

export default function ExpensesPage({ expenses, ahead, onOpenExpense }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(ALL);
  const needle = query.toLocaleLowerCase('es');
  const visible = expenses.filter(e => e.name.toLocaleLowerCase('es').includes(needle) && (category === ALL || e.category === category));
  return (
    <section className="panel">
      <div className="panel-heading expenses-toolbar">
        <div className="search-field"><Search size={17} /><input aria-label="Buscar gastos" placeholder="Buscar un gasto…" value={query} onChange={e => setQuery(e.target.value)} /></div>
        <div className="filter-wrap">
          <select aria-label="Filtrar por categoría" value={category} onChange={e => setCategory(e.target.value)}><option>{ALL}</option>{categories.map(c => <option key={c}>{c}</option>)}</select>
          <span className="muted">{visible.length} gastos</span>
        </div>
      </div>
      <ExpenseTable items={visible} ahead={ahead} onOpen={onOpenExpense} />
      <div className="table-footer">Los importes son por cobro. La previsión reparte los pagos anuales y trimestrales en reservas mensuales.</div>
    </section>
  );
}
