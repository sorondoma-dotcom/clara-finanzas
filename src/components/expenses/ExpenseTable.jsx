import React from 'react';
import { Ellipsis, Search } from 'lucide-react';
import { dueDate, euro, frequencyLabels } from '../../lib/finance';
import { findNextDue } from '../../hooks/usePlanView';
import ExpenseIcon from './ExpenseIcon';

/** Tabla de gastos. `ahead` son los meses de la previsión desde el mes seleccionado. */
export default function ExpenseTable({ items, ahead, compact = false, onOpen }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Gasto</th>
            {!compact && <th>Categoría</th>}
            <th>Frecuencia</th>
            <th>{compact ? 'Cobro' : 'Próximo cobro'}</th>
            <th className="align-right">Importe</th>
            <th aria-label="Acciones" />
          </tr>
        </thead>
        <tbody>
          {items.map(e => {
            const next = findNextDue(ahead, e.id);
            return (
              <tr key={e.id}>
                <td><button className="expense-name" onClick={() => onOpen(e)}><ExpenseIcon expense={e} /><span>{e.name}{compact && <small>{e.category}</small>}</span></button></td>
                {!compact && <td><span className="category-tag">{e.category}</span></td>}
                <td><span className={`frequency-tag ${e.frequency !== 'monthly' ? 'frequency-special' : ''}`}>{frequencyLabels[e.frequency]}</span></td>
                <td className="muted">{next ? dueDate(e, next.key).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : 'Fuera del horizonte'}</td>
                <td className="align-right amount">{euro(e.amount, 2)}</td>
                <td><button className="icon-button" title={`Editar ${e.name}`} aria-label={`Editar ${e.name}`} onClick={() => onOpen(e)}><Ellipsis size={19} /></button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!items.length && (
        <div className="empty-state">
          <Search size={28} />
          <h3>No hay gastos aquí todavía</h3>
          <p>Añade un gasto o prueba con otro filtro.</p>
          <button className="button secondary" onClick={() => onOpen()}>Añadir gasto</button>
        </div>
      )}
    </div>
  );
}
