import { useEffect, useState } from 'react';

// Diferencia entre el reloj del servidor y el del navegador: el temporizador
// siempre se calcula con la hora del servidor, no con la de la máquina del usuario.
let offset = 0;

export function syncServerTime(serverTime) {
  const t = new Date(serverTime).getTime();
  if (Number.isFinite(t)) offset = t - Date.now();
}

export const serverNow = () => Date.now() + offset;

const listeners = new Set();
let timer = null;

function subscribe(fn) {
  listeners.add(fn);
  if (!timer) timer = setInterval(() => listeners.forEach((l) => l(serverNow())), 1000);
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/** Hora del servidor que se actualiza cada segundo (un solo intervalo compartido). */
export function useServerNow() {
  const [now, setNow] = useState(serverNow);
  useEffect(() => subscribe(setNow), []);
  return now;
}

export function splitDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

export function shortDuration(ms) {
  const { days, hours, minutes, seconds } = splitDuration(ms);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

/** Estado efectivo según el reloj: el servidor confirma el cierre, pero la UI no espera. */
export function liveStatus(v, now) {
  if (v.status === 'SOLD' || v.status === 'UNSOLD') return v.status;
  const start = new Date(v.startAt).getTime();
  const end = new Date(v.endAt).getTime();
  if (now < start) return 'SCHEDULED';
  if (now >= end) return v.bidCount > 0 ? 'SOLD' : 'UNSOLD';
  return 'ACTIVE';
}
