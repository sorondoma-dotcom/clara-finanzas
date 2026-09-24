import React, { useState } from 'react';
import { euro, monthLabel } from '../lib/finance';
import ForecastChart from '../components/charts/ForecastChart';

const YEAR = 12;

function YearSummary({ year }) {
  const total = year.reduce((s, m) => s + m.available, 0);
  return (
    <section className="forecast-summary">
      <div><span>Disponible medio · próximos 12 meses</span><strong>{euro(total / YEAR, 2)}</strong></div>
      <div><span>Margen acumulado previsto</span><strong>{euro(total, 2)}</strong></div>
      <div><span>Meses con déficit</span><strong>{year.filter(m => m.available < 0).length}<small> de 12</small></strong></div>
    </section>
  );
}

function Simulator({ available }) {
  const [extra, setExtra] = useState(0);
  const left = available - extra;
  return (
    <article className="panel simulator">
      <div><span className="eyebrow">PRUEBA ANTES DE DECIDIR</span><h2>¿Y si cambias algo?</h2><p>Simula un nuevo gasto mensual y comprueba el margen que te dejaría.</p></div>
      <div>
        <label htmlFor="simulation">Gasto mensual adicional <strong>{euro(extra)}</strong></label>
        <input id="simulation" type="range" min="0" max="2000" step="10" value={extra} onChange={e => setExtra(Number(e.target.value))} />
        <div className="range-labels"><span>0 €</span><span>2.000 €</span></div>
      </div>
      <div className={left < 0 ? 'negative-text' : ''}><span>Te quedarían este mes</span><strong>{euro(left, 2)}</strong><small>Simulación · no modifica tu plan</small></div>
    </article>
  );
}

function ForecastTable({ year }) {
  return (
    <article className="panel">
      <div className="panel-heading"><h2>Las cuentas, claras</h2></div>
      <div className="table-scroll">
        <table className="forecast-table">
          <thead><tr><th>Mes</th><th>Ingresos</th><th>Gastos directos</th><th>Reservas + ajuste</th><th>Vida diaria</th><th>Colchón</th><th>Disponible</th></tr></thead>
          <tbody>
            {year.map(m => (
              <tr key={m.key}>
                <td className="capitalize">{monthLabel(m.key)}</td>
                <td>{euro(m.income)}</td>
                <td>{euro(m.fixed, 2)}</td>
                <td>{euro(m.provision + m.shortfall, 2)}{m.shortfall > 0 && <span title={`Incluye ${euro(m.shortfall, 2)} para completar reservas`} className="gap-dot"> *</span>}</td>
                <td>{euro(m.variable)}</td>
                <td>{euro(m.cushion)}</td>
                <td className={`amount ${m.available < 0 ? 'negative-text' : 'positive-text'}`}>{euro(m.available, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

export default function ForecastPage({ view }) {
  const year = view.ahead.slice(0, YEAR);
  return (
    <>
      <YearSummary year={year} />
      <article className="panel">
        <div className="panel-heading">
          <div><h2>El año, con perspectiva</h2><p>Previsión basada en tus ingresos y gastos registrados.</p></div>
          <div className="chart-legend"><span><i className="legend-dot green" />Disponible</span><span><i className="legend-dot sand" />Comprometido</span></div>
        </div>
        <ForecastChart data={year} tall />
      </article>
      <Simulator available={view.current.available} />
      <ForecastTable year={year} />
    </>
  );
}
