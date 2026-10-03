import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { api } from '../lib/api';
import { formatKm, vehicleTitle } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Carousel from '../components/Carousel';
import AuctionPanel from '../components/AuctionPanel';
import { DamageBadge } from '../components/Badges';
import Spinner from '../components/Spinner';

function Spec({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-bold text-slate-900">{value ?? '—'}</dd>
    </div>
  );
}

const pickAuction = (v) => ({
  status: v.status,
  basePrice: v.basePrice,
  currentBid: v.currentBid,
  bidCount: v.bidCount,
  minNextBid: v.minNextBid,
  startAt: v.startAt,
  endAt: v.endAt,
});

export default function VehicleDetailPage() {
  const { id } = useParams();
  const vehicleId = Number(id);
  const { isAuthenticated, token } = useAuth();
  const { socket } = useSocket();

  const [vehicle, setVehicle] = useState(null);
  const [auction, setAuction] = useState(null);
  const [viewer, setViewer] = useState({ authenticated: false, isOwner: false, isLeader: false, hasBid: false });
  const [myBids, setMyBids] = useState([]);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState(false);
  const viewerRef = useRef(viewer);
  viewerRef.current = viewer;

  const triggerFlash = () => {
    setFlash(true);
    setTimeout(() => setFlash(false), 1200);
  };

  const loadMyBids = useCallback(() => {
    if (!isAuthenticated) return setMyBids([]);
    api.myBids(vehicleId).then(setMyBids).catch(() => {});
  }, [vehicleId, isAuthenticated]);

  useEffect(() => {
    setError('');
    api
      .vehicle(vehicleId)
      .then(({ vehicle }) => {
        setVehicle(vehicle);
        setAuction(pickAuction(vehicle));
        setViewer((v) => ({ ...v, authenticated: Boolean(token), isOwner: vehicle.isOwner, isLeader: vehicle.isLeader }));
      })
      .catch((err) => setError(err.message));
    loadMyBids();
  }, [vehicleId, token, loadMyBids]);

  // Sala de tiempo real de esta subasta.
  useEffect(() => {
    if (!socket) return;
    const join = () =>
      socket.emit('auction:join', vehicleId, (res) => {
        if (!res?.ok) return;
        setAuction((a) => ({ ...a, ...res.state }));
        setViewer(res.viewer);
      });

    const onState = (state) => {
      if (state.vehicleId !== vehicleId) return;
      setAuction((prev) => {
        if (prev && prev.bidCount !== state.bidCount) triggerFlash();
        return { ...prev, ...state };
      });
    };
    const onClosed = (state) => {
      if (state.vehicleId !== vehicleId) return;
      onState(state);
      toast.info(state.status === 'SOLD' ? 'La subasta ha finalizado: vehículo vendido' : 'La subasta finalizó sin ofertas: desierta');
    };
    const onViewer = (next) => {
      if (next.vehicleId !== vehicleId) return;
      const prev = viewerRef.current;
      if (prev.isLeader && !next.isLeader && next.hasBid) {
        toast.error('Tu oferta ha sido superada. ¡Haz tu oferta ahora antes de que termine el tiempo!', { duration: 6000 });
      }
      setViewer(next);
    };

    if (socket.connected) join();
    socket.on('connect', join);
    socket.on('auction:update', onState);
    socket.on('auction:closed', onClosed);
    socket.on('auction:viewer', onViewer);
    return () => {
      socket.emit('auction:leave', vehicleId);
      socket.off('connect', join);
      socket.off('auction:update', onState);
      socket.off('auction:closed', onClosed);
      socket.off('auction:viewer', onViewer);
    };
  }, [socket, vehicleId]);

  const onBidPlaced = (res) => {
    setAuction((a) => ({ ...a, currentBid: res.currentBid, bidCount: res.bidCount, minNextBid: res.minNextBid }));
    setViewer((v) => ({ ...v, isLeader: true, hasBid: true }));
    loadMyBids();
  };

  if (error) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="text-xl font-bold text-slate-800">{error}</p>
        <Link to="/" className="btn-primary mt-6">Volver al inventario</Link>
      </div>
    );
  }
  if (!vehicle || !auction) return <Spinner className="py-32" />;

  const title = vehicleTitle(vehicle);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-brand-700">
        <ArrowLeft className="size-4" /> Volver al inventario
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Lote #{String(vehicle.id).padStart(5, '0')} · {vehicle.itemType.name}
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
        </div>
        <DamageBadge level={vehicle.damageLevel} className="px-3 py-1.5 text-sm" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          <Carousel photos={vehicle.photos} alt={title} />

          <section className="card p-5 sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">Ficha técnica</h2>
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Spec label="Año" value={vehicle.year} />
              <Spec label="Tipo de artículo" value={vehicle.itemType.name} />
              <Spec label="Marca" value={vehicle.make.name} />
              <Spec label="Modelo" value={vehicle.model.name} />
              <Spec label="Motor" value={vehicle.engine} />
              <Spec label="Transmisión" value={vehicle.transmission.name} />
              <Spec label="Combustible" value={vehicle.fuelType.name} />
              <Spec label="Tren de manejo" value={`${vehicle.driveTrain.code} · ${vehicle.driveTrain.description}`} />
              <Spec label="Cilindros" value={vehicle.cylinders > 0 ? vehicle.cylinders : 'N/A (eléctrico)'} />
              <Spec label="Millaje" value={formatKm(vehicle.mileage)} />
              <Spec label="Color" value={vehicle.color} />
              <Spec label="VIN" value={vehicle.vin} />
            </dl>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">Estado de daño</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                { code: 'GREEN', name: 'Verde', text: 'Daño menor / Limpio', cls: 'bg-green-50 ring-green-200 text-green-800', dot: 'bg-green-500' },
                { code: 'YELLOW', name: 'Amarillo', text: 'Daño medio / Reparable', cls: 'bg-yellow-50 ring-yellow-200 text-yellow-800', dot: 'bg-yellow-400' },
                { code: 'RED', name: 'Rojo', text: 'Daño severo / Salvamento', cls: 'bg-red-50 ring-red-200 text-red-800', dot: 'bg-red-500' },
              ].map((d) => {
                const active = d.code === vehicle.damageLevel.code;
                return (
                  <div key={d.code} className={`rounded-xl p-3 ring-1 transition ${active ? `${d.cls} ring-2` : 'bg-white text-slate-400 ring-slate-100'}`}>
                    <p className="flex items-center gap-2 font-bold">
                      <span className={`size-3 rounded-full ${active ? d.dot : 'bg-slate-200'}`} /> {d.name}
                    </p>
                    <p className="text-sm">{d.text}</p>
                  </div>
                );
              })}
            </div>
            {vehicle.description && (
              <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-600">{vehicle.description}</p>
            )}
          </section>
        </div>

        <div className="lg:sticky lg:top-20 lg:self-start">
          <AuctionPanel
            vehicle={vehicle}
            auction={auction}
            viewer={viewer}
            flash={flash}
            onBidPlaced={onBidPlaced}
            myBids={myBids}
          />
        </div>
      </div>
    </div>
  );
}
