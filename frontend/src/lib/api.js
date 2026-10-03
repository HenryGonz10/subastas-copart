import { toast } from 'sonner';
import { syncServerTime } from './time';

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');

const TOKEN_KEY = 'subastas.token';
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) =>
  token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY);

export class ApiError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

// El plan gratuito de Render suspende el API sin tráfico y despertarlo toma ~1 minuto:
// los reintentos cubren ese arranque en frío antes de mostrar un error.
const RETRY_BUDGET_MS = 120_000;
const RETRY_DELAYS_MS = [1000, 2000, 3000, 5000];
const ATTEMPT_TIMEOUT_MS = 30_000;
const WAKEUP_TOAST_ID = 'api-wakeup';
const SAFE_METHODS = new Set(['GET', 'HEAD']);

let pendingRetries = 0;

const sleep = (ms, signal) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });

/** Respuestas que indican que el servidor aún no está listo (no que la petición sea inválida). */
const isTransientStatus = (status, safe) =>
  status === 502 || status === 503 || status === 504 || (safe && (status >= 500 || status === 408 || status === 429));

async function fetchWithTimeout(url, init, signal, timeoutMs) {
  const controller = new AbortController();
  const onAbort = () => controller.abort(signal.reason);
  signal?.addEventListener('abort', onAbort, { once: true });
  const timer = timeoutMs ? setTimeout(() => controller.abort(new DOMException('Timeout', 'TimeoutError')), timeoutMs) : null;
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

function startWaiting() {
  if (pendingRetries++ === 0) {
    toast.loading('Conectando con el servidor…', {
      id: WAKEUP_TOAST_ID,
      description: 'Si estuvo inactivo puede tardar hasta un minuto en despertar.',
      duration: Infinity,
    });
  }
}

function stopWaiting() {
  if (--pendingRetries === 0) toast.dismiss(WAKEUP_TOAST_ID);
}

export async function request(path, { method = 'GET', body, form, signal } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const init = { method, headers, body: form ?? (body !== undefined ? JSON.stringify(body) : undefined) };
  // Una escritura que expira por tiempo pudo haberse aplicado: solo las lecturas se cortan y repiten.
  const safe = SAFE_METHODS.has(method);
  const deadline = Date.now() + RETRY_BUDGET_MS;

  let res;
  let waiting = false;
  try {
    for (let attempt = 0; ; attempt++) {
      let failure;
      try {
        res = await fetchWithTimeout(`${API_URL}${path}`, init, signal, safe ? ATTEMPT_TIMEOUT_MS : 0);
        if (!isTransientStatus(res.status, safe)) break;
        failure = res;
      } catch (err) {
        if (signal?.aborted) throw err;
        failure = err;
      }

      const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];
      if (Date.now() + delay > deadline) {
        if (failure instanceof Response) break;
        throw new ApiError(0, 'No se pudo conectar con el servidor. Intenta de nuevo en unos segundos.');
      }
      if (!waiting) {
        waiting = true;
        startWaiting();
      }
      await sleep(delay, signal);
    }
  } finally {
    if (waiting) stopWaiting();
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.message || 'Ocurrió un error', data.errors);
  if (data?.serverTime) syncServerTime(data.serverTime);
  return data;
}

export const photoSrc = (url) => (url?.startsWith('/') ? `${API_URL}${url}` : url);

export const api = {
  login: (body) => request('/api/auth/login', { method: 'POST', body }),
  register: (body) => request('/api/auth/register', { method: 'POST', body }),
  me: () => request('/api/auth/me'),
  catalogs: () => request('/api/catalogs'),
  addMake: (name) => request('/api/catalogs/makes', { method: 'POST', body: { name } }),
  addModel: (makeId, name) => request(`/api/catalogs/makes/${makeId}/models`, { method: 'POST', body: { name } }),
  vehicles: (params, signal) => request(`/api/vehicles?${new URLSearchParams(params)}`, { signal }),
  myVehicles: (params) => request(`/api/vehicles/mine?${new URLSearchParams(params)}`),
  vehicle: (id) => request(`/api/vehicles/${id}`),
  createVehicle: (form) => request('/api/vehicles', { method: 'POST', form }),
  updateVehicle: (id, form) => request(`/api/vehicles/${id}`, { method: 'PUT', form }),
  deleteVehicle: (id) => request(`/api/vehicles/${id}`, { method: 'DELETE' }),
  bid: (id, amount) => request(`/api/vehicles/${id}/bids`, { method: 'POST', body: { amount } }),
  myBids: (id) => request(`/api/vehicles/${id}/my-bids`),
};
