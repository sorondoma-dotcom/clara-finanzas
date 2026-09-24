import { useMemo } from 'react';
import { categories, forecast, intervals } from '../lib/finance';

export const HORIZON = 24;

/** Próximo mes (desde el inicio de `months`) en el que vence el gasto indicado. */
export const findNextDue = (months, id) => months.find(m => m.items.some(i => i.id === id && i.due));

/** Datos derivados del plan para el mes seleccionado: previsión, cobros, avisos y reparto. */
export function usePlanView(data, offset) {
  const months = useMemo(() => forecast(data, HORIZON), [data]);
  return useMemo(() => {
    const current = months[offset];
    const month = current.key;
    const due = current.items.filter(e => e.due).sort((a, b) => a.day - b.day);
    const pending = due.filter(e => !data.paid[`${month}:${e.id}`]);
    const window = months.slice(offset, offset + 3);
    const upcoming = window.flatMap(m => m.items.filter(e => e.due && intervals[e.frequency] > 1).map(e => ({ ...e, month: m.key })));
    const alerts = window.filter(m => m.shortfall > 0 || m.available < 0);
    const categoryData = categories
      .map(name => ({ name, value: current.items.filter(e => e.category === name).reduce((sum, e) => sum + ((e.frequency === 'monthly' || e.frequency === 'once') && e.due ? e.amount : e.reserve + e.gap), 0) }))
      .filter(c => c.value > 0);
    return {
      months, current, month, due, pending, upcoming, alerts, categoryData,
      ahead: months.slice(offset),
      annuals: data.expenses.filter(e => intervals[e.frequency] > 1),
      expenseTotal: current.fixed + current.provision + current.shortfall,
    };
  }, [months, offset, data.paid, data.expenses]);
}
