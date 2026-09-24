export const euro = (value, decimals = 0) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
export const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
export const addMonths = (key, amount) => { const [year, month] = key.split('-').map(Number); return monthKey(new Date(year, month - 1 + amount, 1)); };
export const monthLabel = (key, short = false) => new Date(`${key}-01T12:00:00`).toLocaleDateString('es-ES', { month: short ? 'short' : 'long', ...(!short && { year: 'numeric' }) });
export const monthDistance = (a, b) => { const [ay, am] = a.split('-').map(Number); const [by, bm] = b.split('-').map(Number); return (by - ay) * 12 + bm - am; };
export const intervals = { monthly: 1, quarterly: 3, yearly: 12, once: 0 };
export const monthlyReserve = expense => intervals[expense.frequency] > 1 ? Math.ceil(Math.round(expense.amount * 100) / intervals[expense.frequency]) / 100 : 0;
export const frequencyLabels = { monthly: 'Mensual', quarterly: 'Trimestral', yearly: 'Anual', once: 'Puntual' };
export const categories = ['Vivienda', 'Suscripciones', 'Suministros', 'Transporte', 'Salud', 'Seguros', 'Otros'];
export const colors = { Vivienda: '#234c3c', Suscripciones: '#b9d981', Suministros: '#e9be7e', Transporte: '#a6c6bc', Salud: '#c6b8dc', Seguros: '#8ba384', Otros: '#d8d6c6' };
export function isDue(expense, month) {
  const elapsed = monthDistance(expense.start, month);
  if (elapsed < 0 || (expense.end && month > expense.end)) return false;
  const interval = intervals[expense.frequency];
  return interval === 0 ? elapsed === 0 : elapsed % interval === 0;
}
export function dueDate(expense, month) {
  const [year, m] = month.split('-').map(Number);
  return new Date(year, m - 1, Math.min(expense.day, new Date(year, m, 0).getDate()), 12);
}
/** Ingreso de un mes: el registrado si el ingreso es variable, o el ingreso habitual/estimado. */
export const incomeFor = (data, key) => data.incomeMode === 'variable' && Object.hasOwn(data.incomes ?? {}, key) ? data.incomes[key] : data.income;
export const isVariableIncome = data => data.incomeMode === 'variable';

export function forecast(data, months = 12) {
  const cents = amount => Math.round(amount * 100);
  const funds = Object.fromEntries(data.expenses.map(e => [e.id, cents(e.fund || 0)]));
  return Array.from({ length: months }, (_, index) => {
    const key = addMonths(data.startMonth, index);
    let fixedCents = 0, provisionCents = 0, shortfallCents = 0, chargesCents = 0;
    const items = data.expenses.map(e => {
      const due = isDue(e, key);
      const interval = intervals[e.frequency];
      let reserve = 0, gap = 0;
      if (interval > 1 && (!e.end || key <= e.end)) {
        reserve = cents(monthlyReserve(e));
        funds[e.id] += reserve;
        if (due) { gap = Math.max(0, cents(e.amount) - funds[e.id]); funds[e.id] = Math.max(0, funds[e.id] - cents(e.amount)); }
        provisionCents += reserve;
        shortfallCents += gap;
      } else if (due) fixedCents += cents(e.amount);
      if (due) chargesCents += cents(e.amount);
      return { ...e, due, reserve: reserve / 100, gap: gap / 100, fundAfter: funds[e.id] / 100, date: dueDate(e, key) };
    });
    const income = incomeFor(data, key);
    const available = (cents(income) - fixedCents - provisionCents - shortfallCents - cents(data.variable) - cents(data.cushion)) / 100;
    return { key, name: monthLabel(key, true).replace('.', ''), income, incomeEstimated: isVariableIncome(data) && !Object.hasOwn(data.incomes ?? {}, key), fixed: fixedCents / 100, provision: provisionCents / 100, shortfall: shortfallCents / 100, charges: chargesCents / 100, variable: data.variable, cushion: data.cushion, available, committed: (cents(income) - cents(available)) / 100, items };
  });
}
export function demoData() {
  const start = monthKey(new Date());
  return { version: 1, demo: true, startMonth: start, incomeMode: 'fixed', incomes: {}, income: 2850, variable: 420, cushion: 200, paid: {}, expenses: [
    { id: 'rent', name: 'Alquiler de casa', amount: 750, category: 'Vivienda', frequency: 'monthly', day: 1, start, fund: 0 },
    { id: 'power', name: 'Electricidad', amount: 58, category: 'Suministros', frequency: 'monthly', day: 12, start, fund: 0 },
    { id: 'internet', name: 'Fibra + móvil', amount: 39.90, category: 'Suministros', frequency: 'monthly', day: 15, start, fund: 0 },
    { id: 'spotify', name: 'Spotify Premium', amount: 10.99, category: 'Suscripciones', frequency: 'monthly', day: 18, start, fund: 0 },
    { id: 'netflix', name: 'Netflix', amount: 13.99, category: 'Suscripciones', frequency: 'monthly', day: 22, start, fund: 0 },
    { id: 'gym', name: 'Gimnasio', amount: 35, category: 'Salud', frequency: 'monthly', day: 5, start, fund: 0 },
    { id: 'transport', name: 'Abono transporte', amount: 32, category: 'Transporte', frequency: 'monthly', day: 3, start, fund: 0 },
    { id: 'car', name: 'Seguro del coche', amount: 360, category: 'Seguros', frequency: 'yearly', day: 24, start: addMonths(start, 1), fund: 300 },
    { id: 'home', name: 'Seguro del hogar', amount: 180, category: 'Seguros', frequency: 'yearly', day: 10, start: addMonths(start, 4), fund: 105 },
    { id: 'water', name: 'Agua', amount: 66, category: 'Suministros', frequency: 'quarterly', day: 20, start: addMonths(start, 2), fund: 0 },
    { id: 'trip', name: 'Escapada de otoño', amount: 290, category: 'Otros', frequency: 'once', day: 28, start: addMonths(start, 1), fund: 0 },
    { id: 'gifts', name: 'Regalos y celebraciones', amount: 420, category: 'Otros', frequency: 'once', day: 15, start: addMonths(start, 3), fund: 0 },
    { id: 'maintenance', name: 'Revisión del coche', amount: 190, category: 'Transporte', frequency: 'once', day: 18, start: addMonths(start, 5), fund: 0 },
  ] };
}
export function validateData(value) {
  const money = n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 100000000;
  const month = s => typeof s === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
  const incomesValid = value?.incomes === undefined || (value.incomes && typeof value.incomes === 'object' && !Array.isArray(value.incomes) && Object.keys(value.incomes).length <= 600 && Object.entries(value.incomes).every(([k, v]) => month(k) && money(v)));
  return value && value.version === 1 && month(value.startMonth) && money(value.income) && [undefined, 'fixed', 'variable'].includes(value.incomeMode) && incomesValid && money(value.variable) && money(value.cushion) && Array.isArray(value.expenses) && value.expenses.length <= 1000 && new Set(value.expenses.map(e => e.id)).size === value.expenses.length && value.expenses.every(e => e && typeof e.id === 'string' && typeof e.name === 'string' && e.name.length > 0 && e.name.length <= 100 && money(e.amount) && money(e.fund ?? 0) && categories.includes(e.category) && Object.hasOwn(intervals, e.frequency) && Number.isInteger(e.day) && e.day >= 1 && e.day <= 31 && month(e.start) && (!e.end || (month(e.end) && e.end >= e.start))) && value.paid && typeof value.paid === 'object' && !Array.isArray(value.paid) && Object.values(value.paid).every(v => typeof v === 'boolean');
}
