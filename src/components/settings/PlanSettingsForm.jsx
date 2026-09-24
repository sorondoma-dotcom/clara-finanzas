import React, { useEffect, useState } from 'react';
import { ArrowDownToLine, Check, RotateCcw, Settings2, ShieldCheck, Upload } from 'lucide-react';

const pick = data => ({ income: data.income, variable: data.variable, cushion: data.cushion, startMonth: data.startMonth });

function MoneyField({ label, description, value, onChange }) {
  return <label>{label}<span className="field-description">{description}</span><input required type="number" min="0" max="100000000" step="0.01" value={value} onChange={e => onChange(e.target.value)} /></label>;
}

export default function PlanSettingsForm({ data, onSave, onExport, onImport, onReset }) {
  const [values, setValues] = useState(() => pick(data));
  useEffect(() => { setValues(pick(data)); }, [data.income, data.variable, data.cushion, data.startMonth]);
  const set = key => value => setValues(v => ({ ...v, [key]: value }));
  function submit(e) {
    e.preventDefault();
    onSave({ ...values, income: Number(values.income), variable: Number(values.variable), cushion: Number(values.cushion) });
  }
  return (
    <div className="settings-layout">
      <article className="panel settings-panel">
        <div className="panel-heading"><div><h2>La base de tu plan</h2><p>Estas cifras se aplican a cada mes de la previsión.</p></div><Settings2 size={21} /></div>
        <form onSubmit={submit}>
          <MoneyField label="Ingresos netos mensuales (€)" description="El dinero que esperas recibir cada mes." value={values.income} onChange={set('income')} />
          <MoneyField label="Presupuesto de vida diaria (€)" description="Comida, ocio, compras y otros gastos variables del mes." value={values.variable} onChange={set('variable')} />
          <MoneyField label="Colchón de seguridad mensual (€)" description="Una cantidad que proteges cada mes para imprevistos." value={values.cushion} onChange={set('cushion')} />
          <label>Inicio de la previsión<input required type="month" value={values.startMonth} onChange={e => set('startMonth')(e.target.value)} /><span className="field-description">Si cambias el inicio, actualiza también el saldo inicial de tus reservas.</span></label>
          <button className="button primary" type="submit"><Check size={17} /> Guardar mi plan</button>
        </form>
      </article>
      <div className="settings-aside">
        <article className="panel">
          <span className="metric-icon mint"><ShieldCheck size={23} /></span>
          <h2>Tu plan te acompaña.</h2>
          <p>Tu plan se guarda en tu cuenta y se actualiza entre dispositivos. Descarga una copia cuando quieras conservar también un respaldo personal.</p>
          <button className="button secondary" onClick={onExport}><ArrowDownToLine size={17} /> Descargar copia</button>
          <button className="button secondary" onClick={onImport}><Upload size={17} /> Importar copia</button>
        </article>
        <article className="panel reset-panel">
          <h2>Un nuevo comienzo</h2>
          <p>Borra el plan actual y vuelve a organizar tus cuentas.</p>
          <button className="text-button" onClick={onReset}><RotateCcw size={16} /> Empezar de cero</button>
        </article>
      </div>
    </div>
  );
}
