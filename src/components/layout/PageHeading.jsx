import React from 'react';
import { Plus } from 'lucide-react';
import { pageCopy } from '../../config/navigation';

export default function PageHeading({ page, monthPicker, onAddExpense }) {
  const { title, dot, description } = pageCopy[page];
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">UN POCO DE ORDEN. MUCHA TRANQUILIDAD.</div>
        <h1>{title}{dot && <span className="heading-dot">.</span>}</h1>
        <p className="page-description">{description}</p>
      </div>
      <div className="heading-actions">
        {monthPicker}
        <button className="button primary" onClick={onAddExpense}><Plus size={17} /> Añadir gasto</button>
      </div>
    </div>
  );
}
