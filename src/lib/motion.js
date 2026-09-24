export const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Espera a la promesa y, como mínimo, `ms` milisegundos: evita parpadeos de las animaciones de carga. */
export async function withMinimumDuration(promise, ms) {
  const wait = prefersReducedMotion() ? 0 : ms;
  const [result] = await Promise.all([promise, new Promise(resolve => setTimeout(resolve, wait))]);
  return result;
}
