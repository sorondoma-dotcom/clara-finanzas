import { monthKey, validateData } from './finance';

const MAX_BACKUP_BYTES = 2_000_000;
const LEGACY_KEY = 'clara-finances-v1';

export function downloadBackup(data) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url; a.download = `clara-copia-${monthKey(new Date())}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Lee y valida una copia JSON. Lanza un error si no es una copia válida de Clara. */
export async function readBackup(file) {
  if (file.size > MAX_BACKUP_BYTES) throw new Error('too large');
  const parsed = JSON.parse(await file.text());
  if (!validateData(parsed)) throw new Error('invalid');
  return parsed;
}

/** Plan guardado en el navegador por la versión anterior (sin cuentas), si existe. */
export function readLegacyPlan() {
  try {
    const value = JSON.parse(localStorage.getItem(LEGACY_KEY));
    return validateData(value) && !value.demo ? value : null;
  } catch { return null; }
}

export const emptyPlan = () => ({ version: 1, demo: false, startMonth: monthKey(new Date()), income: 0, variable: 0, cushion: 0, expenses: [], paid: {} });
