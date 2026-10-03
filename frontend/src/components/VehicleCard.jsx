import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Fuel, Gauge, Gavel, Settings2, Trophy } from 'lucide-react';
import { photoSrc } from '../lib/api';
import { formatQ, vehicleTitle } from '../lib/format';
import { DamageBadge, TimeLeftBadge } from './Badges';

export default function VehicleCard({ vehicle }) {
  const [hover, setHover] = useState(false);
  const [flash, setFlash] = useState(false);
  const lastBid = useRef(vehicle.currentBid);

  useEffect(() => {
    if (lastBid.current !== vehicle.currentBid) {
      lastBid.current = vehicle.currentBid;
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 1200);
      return () => clearTimeout(t);
    }
  }, [vehicle.currentBid]);

  const cover = vehicle.photos[0]?.url;
  const second = vehicle.photos[1]?.url || cover;
  const hasBids = vehicle.currentBid !== null;

  return (
    <Link
      to={`/vehiculos/${vehicle.id}`}
      className="group card flex flex-col overflow-hidden transition hover:-translate-y-1 hover:border-brand-200 hover:shadow-xl hover:shadow-brand-100/60"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        <img
          src={photoSrc(hover ? second : cover)}
          alt={vehicleTitle(vehicle)}
          loading="lazy"
          className="size-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <TimeLeftBadge vehicle={vehicle} />
          <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm">
            <Camera className="size-3.5" /> {vehicle.photos.length}
          </span>
        </div>
        {vehicle.isLeader && (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-green-500 px-2.5 py-1 text-xs font-bold text-white shadow">
            <Trophy className="size-3.5" /> Vas ganando
          </span>
        )}
        {vehicle.isOwner && (
          <span className="absolute bottom-3 left-3 rounded-full bg-brand-600 px-2.5 py-1 text-xs font-bold text-white shadow">
            Tu publicación
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Lote #{String(vehicle.id).padStart(5, '0')} · {vehicle.itemType.name}
          </p>
          <h3 className="mt-0.5 text-lg font-bold leading-tight text-slate-900 group-hover:text-brand-700">
            {vehicleTitle(vehicle)}
          </h3>
        </div>

        <DamageBadge level={vehicle.damageLevel} className="self-start" />

        <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-slate-600">
          <li className="flex items-center gap-1.5"><Gauge className="size-3.5 text-slate-400" />{vehicle.engine}</li>
          <li className="flex items-center gap-1.5"><Settings2 className="size-3.5 text-slate-400" />{vehicle.transmission.name}</li>
          <li className="flex items-center gap-1.5"><Fuel className="size-3.5 text-slate-400" />{vehicle.fuelType.name}</li>
          <li className="flex items-center gap-1.5">
            <span className="rounded bg-slate-100 px-1.5 text-[10px] font-bold text-slate-600">{vehicle.driveTrain.code}</span>
            {vehicle.cylinders > 0 ? `${vehicle.cylinders} cilindros` : 'Eléctrico'}
          </li>
        </ul>

        <div className="mt-auto flex items-end justify-between border-t border-slate-100 pt-3">
          <div>
            <p className="text-xs font-medium text-slate-500">{hasBids ? 'Oferta actual' : 'Monto base'}</p>
            <p className={`rounded-md text-xl font-extrabold text-slate-900 ${flash ? 'flash-price' : ''}`}>
              {formatQ(hasBids ? vehicle.currentBid : vehicle.basePrice)}
            </p>
            <p className="text-xs text-slate-500">
              {vehicle.bidCount} {vehicle.bidCount === 1 ? 'oferta' : 'ofertas'}
            </p>
          </div>
          <span className="btn-accent px-3 py-2">
            <Gavel className="size-4" /> Ofertar
          </span>
        </div>
      </div>
    </Link>
  );
}
