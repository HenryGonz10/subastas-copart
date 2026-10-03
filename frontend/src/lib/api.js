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

export async function request(path, { method = 'GET', body, form, signal } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      signal,
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(0, 'No se pudo conectar con el servidor');
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
