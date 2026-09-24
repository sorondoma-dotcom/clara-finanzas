import React, { useEffect, useState } from 'react';
import { Check, Info, Wallet } from 'lucide-react';
import { euro, isVariableIncome, monthTitle } from '../../lib/finance';
import IncomeFields from './IncomeFields';
import SettingsSection from './SettingsSection';

const pick = data => ({
  income: data.income, variable: data.variable, cushion: data.cushion, startMonth: data.startMonth,
  incomeMode: data.incomeMode || 'fixed',
  incomes: Object.fromEntries(Object.entries(data.incomes || {}).map(([month, amount]) => [month, String(amount)])),
});

function MoneyField({ label, description, value, onChange }) {
  return <label>{label}{description && <span className="field-description">{description}</span>}<input required type="number" min="0" max="100000000" step="0.01" value={value} onChange={e => onChange(e.target.value)} /></label>;
}

/** Resumen del mes actual con el plan guardado, para ver el efecto de la configuración. */
function PlanSummary({ data, current }) {
  const rows = [
    ['Ingreso del mes', current.income],
    ['Presupuesto de vida diaria', current.variable],
    ['Colchón de seguridad', current.cushion],
    ['Gastos y reservas', current.fixed + current.provision + current.shortfall],
  ];
  return (
    <article className="panel settings-summary">
      <span className="eyebrow">CON TU PLAN GUARDADO</span>
      <h3>{monthTitle(current.key)}</h3>
      <dl>
        {rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{euro(value, 2)}</dd></div>)}
        <div className="settings-summary-total"><dt>Disponible</dt><dd className={current.available < 0 ? 'negative-text' : ''}>{euro(current.available, 2)}</dd></div>
      </dl>
      <p><Info size={14} /> {isVariableIncome(data) ? 'Ingreso variable: cada mes usa su importe o, si falta, el estimado.' : 'Ingreso fijo: el mismo importe todos los meses.'}</p>
    </article>
  );
}

export default function EconomicSettings({ data, current, onSave }) {
  const [values, setValues] = useState(() => pick(data));
  useEffect(() => { setValues(pick(data)); }, [data.income, data.variable, data.cushion, data.startMonth, data.incomeMode, data.incomes]);
  const set = key => value => setValues(v => ({ ...v, [key]: value }));
  function submit(e) {
    e.preventDefault();
    // Solo se guardan los meses con importe; el resto usa el ingreso estimado.
    const incomes = Object.fromEntries(Object.entries(values.incomes).filter(([, amount]) => amount !== '').map(([month, amount]) => [month, Number(amount)]));
    onSave({ ...values, incomes, income: Number(values.income), variable: Number(values.variable), cushion: Number(values.cushion) });
  }
  return (
    <SettingsSection icon={Wallet} title="La base de tu plan" description="Estas cifras se aplican a cada mes de la previsión." aside={<PlanSummary data={data} current={current} />}>
      <form className="panel settings-form" onSubmit={submit}>
        <IncomeFields values={values} onChange={setValues} />
        <MoneyField label="Presupuesto de vida diaria (€)" description="Comida, ocio, compras y otros gastos variables del mes." value={values.variable} onChange={set('variable')} />
        <MoneyField label="Colchón de seguridad mensual (€)" description="Una cantidad que proteges cada mes para imprevistos." value={values.cushion} onChange={set('cushion')} />
        <label>Inicio de la previsión<input required type="month" value={values.startMonth} onChange={e => set('startMonth')(e.target.value)} /><span className="field-description">Si cambias el inicio, actualiza también el saldo inicial de tus reservas.</span></label>
        <button className="button primary" type="submit"><Check size={17} /> Guardar mi plan</button>
      </form>
    </SettingsSection>
  );
}
