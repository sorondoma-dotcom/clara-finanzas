import React, { useState } from 'react';
import { addMonths, euro, monthLabel } from '../../lib/finance';

const sentenceCase = text => text.charAt(0).toUpperCase() + text.slice(1);

const MODES = [
  { id: 'fixed', label: 'Ingreso fijo', hint: 'Nómina o pensión: cobras lo mismo cada mes.' },
  { id: 'variable', label: 'Ingreso variable', hint: 'Paro, trabajos por horas o autónomos: cada mes puede ser distinto.' },
];

/** Selector de ingreso fijo/variable. En modo variable permite indicar el importe de cada mes. */
export default function IncomeFields({ values, onChange }) {
  const [monthsShown, setMonthsShown] = useState(12);
  const variable = values.incomeMode === 'variable';
  const months = Array.from({ length: monthsShown }, (_, i) => addMonths(values.startMonth, i));
  const setIncomeFor = (month, amount) => onChange(v => ({ ...v, incomes: { ...v.incomes, [month]: amount } }));
  const filled = months.filter(m => (values.incomes[m] ?? '') !== '').length;
  return (
    <fieldset className="income-fields">
      <legend>Tus ingresos</legend>
      <div className="income-mode" role="radiogroup" aria-label="Tipo de ingreso">
        {MODES.map(mode => (
          <button key={mode.id} type="button" role="radio" aria-checked={values.incomeMode === mode.id} className={values.incomeMode === mode.id ? 'selected' : ''} onClick={() => onChange(v => ({ ...v, incomeMode: mode.id }))}>
            <strong>{mode.label}</strong><span>{mode.hint}</span>
          </button>
        ))}
      </div>
      <label>{variable ? 'Ingreso estimado por defecto (€)' : 'Ingresos netos mensuales (€)'}
        <span className="field-description">{variable ? 'Se usa en los meses que dejes en blanco. Ponlo prudente: mejor quedarse corto.' : 'El dinero que esperas recibir cada mes.'}</span>
        <input required type="number" min="0" max="100000000" step="0.01" value={values.income} onChange={e => onChange(v => ({ ...v, income: e.target.value }))} />
      </label>
      {variable && (
        <div className="income-months">
          <div className="income-months-heading">
            <span>Ingreso de cada mes</span>
            <small>{filled} de {monthsShown} meses indicados</small>
          </div>
          <div className="income-months-grid">
            {months.map(month => (
              <label key={month}>
                <span>{sentenceCase(monthLabel(month))}</span>
                <input type="number" min="0" max="100000000" step="0.01" inputMode="decimal" aria-label={`Ingreso de ${monthLabel(month)}`} placeholder={euro(Number(values.income) || 0)} value={values.incomes[month] ?? ''} onChange={e => setIncomeFor(month, e.target.value)} />
              </label>
            ))}
          </div>
          <button type="button" className="text-button" onClick={() => setMonthsShown(n => n === 12 ? 24 : 12)}>{monthsShown === 12 ? 'Mostrar 12 meses más' : 'Mostrar menos meses'}</button>
        </div>
      )}
    </fieldset>
  );
}
