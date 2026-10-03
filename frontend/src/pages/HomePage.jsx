import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Gavel, Search, SearchX, ShieldCheck, SlidersHorizontal, UserPlus } from 'lucide-react';
import { api } from '../lib/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import Filters, { DebouncedInput, FILTER_KEYS } from '../components/Filters';
import VehicleCard from '../components/VehicleCard';
import Spinner from '../components/Spinner';

const STATUS_TABS = [
  { value: 'OPEN', label: 'Disponibles' },
  { value: 'ACTIVE', label: 'En vivo' },
  { value: 'SCHEDULED', label: 'Próximas' },
  { value: 'CLOSED', label: 'Finalizadas' },
  { value: 'ALL', label: 'Todas' },
];

const SORTS = [
  { value: 'endingSoon', label: 'Terminan pronto' },
  { value: 'newest', label: 'Recién publicados' },
  { value: 'priceAsc', label: 'Precio: menor a mayor' },
  { value: 'priceDesc', label: 'Precio: mayor a menor' },
  { value: 'yearDesc', label: 'Año: más reciente' },
  { value: 'mostBids', label: 'Más ofertas' },
];

const PILLARS = [
  { icon: UserPlus, title: 'Regístrese', text: 'Cree su cuenta gratis para ofertar y publicar.' },
  { icon: Search, title: 'Encuentre', text: 'Inventario dinámico con filtros por ficha técnica.' },
  { icon: Gavel, title: 'Oferte', text: 'Pujas en tiempo real con alertas de estado.' },
];

export default function HomePage() {
  const [params, setParams] = useSearchParams();
  const { socket } = useSocket();
  const { isAuthenticated, token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const itemsRef = useRef([]);

  const values = useMemo(() => Object.fromEntries(params.entries()), [params]);
  const status = values.status || 'OPEN';
  const sort = values.sort || 'endingSoon';
  const page = Number(values.page) || 1;
  const activeCount = FILTER_KEYS.filter((k) => k !== 'q' && values[k]).length;

  const update = useCallback(
    (patch, resetPage = true) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (v === '' || v === null || v === undefined) next.delete(k);
            else next.set(k, v);
          }
          if (resetPage && !('page' in patch)) next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const load = useCallback(
    async (signal, silent = false) => {
      if (!silent) setLoading(true);
      try {
        const result = await api.vehicles({ ...values, status, sort, page, pageSize: 12 }, signal);
        setData(result);
        itemsRef.current = result.items;
        setError('');
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [values, status, sort, page],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load, token]);

  // Tiempo real en el inventario: precios y estados sin recargar la página.
  useEffect(() => {
    if (!socket) return;
    let refetchTimer = null;
    const scheduleRefetch = () => {
      clearTimeout(refetchTimer);
      refetchTimer = setTimeout(() => load(undefined, true), 600);
    };
    const onUpdate = (state) => {
      const item = itemsRef.current.find((v) => v.id === state.vehicleId);
      if (!item) return;
      if (item.isLeader && state.bidCount !== item.bidCount) return scheduleRefetch();
      setData((prev) =>
        prev && {
          ...prev,
          items: prev.items.map((v) =>
            v.id === state.vehicleId
              ? { ...v, currentBid: state.currentBid, bidCount: state.bidCount, status: state.status, startAt: state.startAt, endAt: state.endAt, basePrice: state.basePrice }
              : v,
          ),
        },
      );
    };
    socket.on('inventory:update', onUpdate);
    socket.on('inventory:changed', scheduleRefetch);
    return () => {
      clearTimeout(refetchTimer);
      socket.off('inventory:update', onUpdate);
      socket.off('inventory:changed', scheduleRefetch);
    };
  }, [socket, load]);

  useEffect(() => {
    if (data) itemsRef.current = data.items;
  }, [data]);

  const resetFilters = () => setParams(new URLSearchParams(status !== 'OPEN' ? { status } : {}), { replace: true });

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-brand-50 via-white to-amber-50">
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-brand-100/70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-10 size-80 rounded-full bg-amber-100/80 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-brand-700 shadow-sm ring-1 ring-brand-100">
              <span className="live-dot size-2 rounded-full bg-green-500" /> Subastas en vivo desde EE. UU.
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
              Tu próximo vehículo está a <span className="text-brand-600">una oferta</span> de distancia
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              Autos, SUVs y pickups de subasta con ficha técnica completa, clasificación de daño y pujas en tiempo real.
            </p>
            <div className="mt-6 flex max-w-xl items-center gap-2 rounded-2xl bg-white p-2 shadow-lg shadow-brand-100 ring-1 ring-slate-200">
              <Search className="ml-2 size-5 shrink-0 text-slate-400" />
              <DebouncedInput
                value={values.q}
                onChange={(q) => update({ q })}
                placeholder="Busca por marca, modelo, VIN, color o lote…"
                className="w-full border-0 bg-transparent px-1 py-2 text-sm outline-none"
              />
            </div>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {PILLARS.map(({ icon: Icon, title, text }, i) => (
              <div key={title} className="flex items-start gap-3 rounded-2xl bg-white/80 p-4 ring-1 ring-slate-200 backdrop-blur">
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${i === 1 ? 'bg-accent-400 text-slate-900' : 'bg-brand-600 text-white'}`}>
                  <Icon className="size-5" />
                </span>
                <div>
                  <p className="font-bold text-slate-900">{i + 1}. {title}</p>
                  <p className="text-sm text-slate-600">{text}</p>
                </div>
              </div>
            ))}
          </div>

          {!isAuthenticated && (
            <p className="mt-6 flex items-center gap-2 text-sm text-slate-600">
              <ShieldCheck className="size-4 text-brand-600" />
              Estás navegando como invitado.{' '}
              <Link to="/registro" className="font-semibold text-brand-700 hover:underline">Crea tu cuenta</Link> o{' '}
              <Link to="/login" className="font-semibold text-brand-700 hover:underline">inicia sesión</Link> para ofertar o publicar.
            </p>
          )}
        </div>
      </section>

      {/* Inventario */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-1 overflow-x-auto rounded-2xl bg-white p-1 ring-1 ring-slate-200">
            {STATUS_TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => update({ status: t.value === 'OPEN' ? '' : t.value })}
                className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  status === t.value ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-ghost lg:hidden" onClick={() => setShowFilters((s) => !s)}>
              <SlidersHorizontal className="size-4" /> Filtros {activeCount > 0 && `(${activeCount})`}
            </button>
            <select className="input w-auto" value={sort} onChange={(e) => update({ sort: e.target.value === 'endingSoon' ? '' : e.target.value })}>
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className={`${showFilters ? 'block' : 'hidden'} lg:block`}>
            <div className="lg:sticky lg:top-20">
              <Filters values={values} onChange={update} onReset={resetFilters} activeCount={activeCount} />
            </div>
          </div>

          <div>
            <p className="mb-4 text-sm text-slate-500">
              {data ? (
                <>
                  <span className="font-bold text-slate-800">{data.total}</span> vehículo{data.total === 1 ? '' : 's'} encontrado{data.total === 1 ? '' : 's'}
                </>
              ) : '\u00a0'}
            </p>

            {error && <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

            {loading && !data ? (
              <Spinner className="py-24" />
            ) : data?.items.length === 0 ? (
              <div className="card flex flex-col items-center gap-3 p-12 text-center">
                <SearchX className="size-10 text-slate-300" />
                <p className="text-lg font-bold text-slate-800">No hay vehículos con esos filtros</p>
                <p className="text-sm text-slate-500">Prueba ampliar la búsqueda o limpiar los filtros.</p>
                <button className="btn-ghost mt-2" onClick={resetFilters}>Limpiar filtros</button>
              </div>
            ) : (
              <div className={`grid gap-5 sm:grid-cols-2 xl:grid-cols-3 ${loading ? 'opacity-60' : ''}`}>
                {data?.items.map((v) => <VehicleCard key={v.id} vehicle={v} />)}
              </div>
            )}

            {data && data.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button className="btn-ghost" disabled={page <= 1} onClick={() => update({ page: page - 1 }, false)}>
                  <ChevronLeft className="size-4" /> Anterior
                </button>
                <span className="px-3 text-sm font-semibold text-slate-600">
                  Página {page} de {data.totalPages}
                </span>
                <button className="btn-ghost" disabled={page >= data.totalPages} onClick={() => update({ page: page + 1 }, false)}>
                  Siguiente <ChevronRight className="size-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
