let csrfToken = '';
let expectedUser = '';
export function setCsrfToken(token, userId) { csrfToken = token || ''; if (userId !== undefined) expectedUser = userId; if (!token) expectedUser = ''; }
export async function api(path, { method = 'GET', body, signal } = {}) {
  let response;
  try { response = await fetch(`/api${path}`, {
    method, credentials: 'same-origin', cache: 'no-store', signal,
    headers: { 'Content-Type': 'application/json', 'X-Clara-Request': '1', ...(csrfToken && { 'X-CSRF-Token': csrfToken }), ...(expectedUser && { 'X-Clara-User': expectedUser }) },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  }); } catch (error) { if (error.name === 'AbortError') throw error; throw Object.assign(new Error('No hay conexión con Clara. Tus cambios siguen en esta página; no la cierres.'), { status: 0 }); }
  if (response.status === 204) return null;
  if (!response.headers.get('content-type')?.includes('application/json')) throw Object.assign(new Error('El servidor de cuentas no está disponible. Vuelve a intentarlo en unos minutos.'), { status: 503 });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(payload.error || 'No se pudo completar la petición.'), { status: response.status });
  return payload;
}
