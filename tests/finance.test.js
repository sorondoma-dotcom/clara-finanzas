import test from 'node:test';
import assert from 'node:assert/strict';
import { addMonths, dueDate, forecast, isDue, validateData } from '../src/lib/finance.js';

const base = { version: 1, startMonth: '2026-09', income: 2000, variable: 300, cushion: 100, expenses: [], paid: {} };
const expense = (overrides = {}) => ({ id: 'test', name: 'Seguro', amount: 120, category: 'Seguros', frequency: 'yearly', day: 20, start: '2027-08', fund: 0, ...overrides });
const close = (a, b) => assert.ok(Math.abs(a - b) < .00001, `${a} should equal ${b}`);

test('monthly available subtracts commitments and protected budgets', () => {
  const [m] = forecast({ ...base, expenses: [expense({ frequency: 'monthly', amount: 500, start: base.startMonth })] });
  assert.equal(m.available, 1100);
  assert.equal(m.charges, 500);
});
test('annual charge is funded monthly and never deducted twice', () => {
  const months = forecast({ ...base, expenses: [expense()] });
  months.forEach(m => close(m.available, 1590));
  close(months[11].charges, 120);
  close(months[11].shortfall, 0);
  close(months[11].items[0].fundAfter, 0);
});
test('an imminent underfunded renewal reduces available by the funding gap', () => {
  const [m] = forecast({ ...base, expenses: [expense({ start: base.startMonth, fund: 20 })] });
  assert.equal(m.provision, 10);
  assert.equal(m.shortfall, 90);
  assert.equal(m.available, 1500);
  assert.equal(m.items[0].fundAfter, 0);
});
test('initial reserve covers renewal with no duplicate deduction', () => {
  const [m] = forecast({ ...base, expenses: [expense({ start: base.startMonth, fund: 110 })] });
  assert.equal(m.available, 1590);
  assert.equal(m.shortfall, 0);
});
test('non-divisible annual charges reserve whole cents and do not underfund', () => {
  const months = forecast({ ...base, expenses: [expense({ amount: 100 })] });
  assert.equal(months[0].provision, 8.34);
  assert.equal(months[0].available, 1591.66);
  assert.equal(months[11].shortfall, 0);
  assert.equal(months[11].items[0].fundAfter, 0.08);
});
test('quarterly contributions remain solvent over repeated renewals', () => {
  const months = forecast({ ...base, expenses: [expense({ frequency: 'quarterly', amount: 66, start: '2026-11' })] });
  months.forEach(m => assert.equal(m.shortfall, 0));
  assert.deepEqual(months.filter(m => m.charges > 0).map(m => m.key), ['2026-11', '2027-02', '2027-05', '2027-08']);
});
test('one-off expenses appear only in their own month', () => {
  const months = forecast({ ...base, expenses: [expense({ frequency: 'once', start: '2026-10' })] });
  assert.equal(months[0].fixed, 0);
  assert.equal(months[1].fixed, 120);
  assert.equal(months[2].fixed, 0);
});
test('ended expenses stop recurring and stop provision contributions', () => {
  const months = forecast({ ...base, expenses: [expense({ start: '2026-09', end: '2026-10', frequency: 'monthly' }), expense({ id: 'ended', start: '2026-09', end: '2026-09' })] });
  assert.equal(months[1].fixed, 120);
  assert.equal(months[1].provision, 0);
  assert.equal(months[2].fixed, 0);
});
test('paid marker does not deduct a charge a second time', () => {
  const data = { ...base, expenses: [expense({ frequency: 'monthly', start: '2026-09' })] };
  assert.equal(forecast(data)[0].available, forecast({ ...data, paid: { '2026-09:test': true } })[0].available);
});
test('deficits stay negative instead of appearing as spendable money', () => {
  assert.equal(forecast({ ...base, income: 100 })[0].available, -300);
});
test('dates handle year boundaries, 31st and leap years', () => {
  assert.equal(addMonths('2026-12', 1), '2027-01');
  assert.equal(dueDate(expense({ day: 31 }), '2027-02').getDate(), 28);
  assert.equal(dueDate(expense({ day: 31 }), '2028-02').getDate(), 29);
  assert.equal(isDue(expense({ start: '2026-10' }), '2026-09'), false);
});
test('import validates amounts, recurrence, month formats and unique IDs', () => {
  assert.equal(Boolean(validateData(base)), true);
  assert.equal(Boolean(validateData({ ...base, income: -10 })), false);
  assert.equal(Boolean(validateData({ ...base, startMonth: '2026-13' })), false);
  assert.equal(Boolean(validateData({ ...base, expenses: [expense({ frequency: 'invalid' })] })), false);
  assert.equal(Boolean(validateData({ ...base, expenses: [expense(), expense()] })), false);
  assert.equal(Boolean(validateData({ ...base, expenses: [expense({ amount: Infinity })] })), false);
});
test('variable income uses the amount of each month and the estimate otherwise', () => {
  const data = { ...base, incomeMode: 'variable', income: 900, incomes: { '2026-09': 1200, '2026-10': 0 } };
  const [sep, oct, nov] = forecast(data, 3);
  assert.equal(sep.income, 1200); assert.equal(sep.available, 800); assert.equal(sep.incomeEstimated, false);
  assert.equal(oct.income, 0); assert.equal(oct.available, -400);
  assert.equal(nov.income, 900); assert.equal(nov.incomeEstimated, true);
  assert.equal(forecast({ ...data, incomeMode: 'fixed' }, 1)[0].income, 2000 - 1100);
  assert.ok(validateData(data));
  assert.equal(validateData({ ...data, incomes: { '2026-13': 5 } }), false);
  assert.equal(validateData({ ...data, incomeMode: 'weekly' }), false);
});
