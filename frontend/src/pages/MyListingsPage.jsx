import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ClipboardList, Eye, Pencil, PlusCircle, Search, Trash2 } from 'lucide-react';
import { api, photoSrc } from '../lib/api';
import { formatDate, formatQ, vehicleTitle } from '../lib/format';
import { useSocket } from '../context/SocketContext';
import { DamageBadge, TimeLeftBadge } from '../components/Badges';
import { DebouncedInput } from '../components/Filters';
import Spinner from '../components/Spinner';

const STATUS = [
  { value: 'ALL', label: 'Todas' },
  { value: 'ACTIVE', label: 'En vivo' },
  { value: 'SCHEDULED', label: 'Próximas' },
  { value: 'CLOSED', label: 'Finalizadas' },
];

export default function MyListingsPage() {
  const { socket } = useSocket();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('ALL');
  const [items, setItems] = useState(null);

  const load = useCallback(() => {
    api
      .myVehicles({ q, status })
      .then((r) => setItems(r.items))
      .catch((err) => toast.error(err.message));
  }, [q, status]);

  useEffect(load, [load]);

  useEffect(() => {
    if (!socket) return;
    const onUpdate = (state) =>
      setItems((prev) =>
        prev?.map((v) =>
          v.id === state.vehicleId ? { ...v, currentBid: state.currentBid, bidCount: state.bidCount, status: state.status } : v,
        ),
      );
    socket.on('inventory:update', onUpdate);
    return () => socket.off('inventory:update', onUpdate);
  }, [socket]);

  const remove = async (v) => {
    if (!confirm(`¿Eliminar la publicación "${vehicleTitle(v)}"?`)) return;
    try {
      await api.deleteVehicle(v.id);
      toast.success('Publicación eliminada');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-extrabold tracking-tight text-slate-900">
            <ClipboardList className="size-7 text-brand-600" /> Mis publicaciones
          </h1>
          <p className="mt-1 text-slate-500">Busca tus vehículos publicados y edítalos.</p>
        </div>
        <Link to="/publicar" className="btn-primary">
          <PlusCircle className="size-4" /> Publicar vehículo
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <DebouncedInput value={q} onChange={setQ} placeholder="Buscar por marca, modelo, VIN, año o lote…" className="input pl-10" />
        </div>
        <div className="flex gap-1 rounded-2xl bg-white p-1 ring-1 ring-slate-200">
          {STATUS.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatus(s.value)}
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${status === s.value ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {items === null ? (
          <Spinner className="py-20" />
        ) : items.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-lg font-bold text-slate-800">No encontramos publicaciones</p>
            <p className="mt-1 text-sm text-slate-500">Publica tu primer vehículo para subastarlo.</p>
          </div>
        ) : (
          items.map((v) => (
            <div key={v.id} className="card flex flex-col gap-4 p-3 sm:flex-row sm:items-center">
              <img src={photoSrc(v.photos[0]?.url)} alt="" className="aspect-[4/3] w-full rounded-xl object-cover sm:w-40" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-slate-900">{vehicleTitle(v)}</p>
                  <TimeLeftBadge vehicle={v} />
                </div>
                <p className="text-xs text-slate-500">
                  Lote #{String(v.id).padStart(5, '0')} · {v.engine} · {v.transmission.name} · {v.fuelType.name} · Cierre: {formatDate(v.endAt)}
                </p>
                <DamageBadge level={v.damageLevel} />
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs text-slate-500">{v.currentBid ? 'Oferta actual' : 'Monto base'}</p>
                <p className="text-lg font-extrabold text-slate-900">{formatQ(v.currentBid ?? v.basePrice)}</p>
                <p className="text-xs text-slate-500">{v.bidCount} ofertas</p>
              </div>
              <div className="flex gap-2 sm:flex-col">
                <Link to={`/mis-publicaciones/${v.id}/editar`} className="btn-primary flex-1 px-3 py-2">
                  <Pencil className="size-4" /> Editar
                </Link>
                <Link to={`/vehiculos/${v.id}`} className="btn-ghost flex-1 px-3 py-2">
                  <Eye className="size-4" /> Ver
                </Link>
                {v.bidCount === 0 && (
                  <button onClick={() => remove(v)} className="btn-ghost flex-1 px-3 py-2 text-red-600 hover:border-red-200 hover:bg-red-50">
                    <Trash2 className="size-4" /> Eliminar
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
