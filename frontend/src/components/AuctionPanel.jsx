import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, Ban, CalendarClock, Gavel, Info, Lock, Pencil, Radio, Trophy, Users } from 'lucide-react';
import { api } from '../lib/api';
import { formatDate, formatQ } from '../lib/format';
import { liveStatus, useServerNow } from '../lib/time';
import Countdown from './Countdown';

function StatusBanner({ tone, icon: Icon, title, text }) {
  const tones = {
    green: 'bg-green-50 text-green-800 ring-green-200',
    red: 'bg-red-50 text-red-800 ring-red-200',
    blue: 'bg-brand-50 text-brand-800 ring-brand-200',
    gray: 'bg-slate-100 text-slate-700 ring-slate-200',
    amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  };
  return (
    <div className={`flex items-start gap-3 rounded-2xl p-4 ring-1 ${tones[tone]}`} role="status" aria-live="polite">
      <Icon className="mt-0.5 size-5 shrink-0" />
      <div>
        <p className="font-bold">{title}</p>
        {text && <p className="text-sm opacity-90">{text}</p>}
      </div>
    </div>
  );
}

export default function AuctionPanel({ vehicle, auction, viewer, flash, onBidPlaced, myBids }) {
  const location = useLocation();
  const now = useServerNow();
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const status = liveStatus({ ...vehicle, ...auction }, now);
  const endMs = new Date(auction.endAt).getTime() - now;
  const startMs = new Date(auction.startAt).getTime() - now;
  const hasBids = auction.currentBid !== null;
  const isClosed = status === 'SOLD' || status === 'UNSOLD';

  useEffect(() => {
    setAmount(String(auction.minNextBid));
  }, [auction.minNextBid]);

  const roundUp = (n) => Math.ceil(n / 100) * 100;
  const quick = [
    { label: 'Mínima', value: auction.minNextBid },
    { label: '+5%', value: roundUp(auction.minNextBid * 1.05) },
    { label: '+15%', value: roundUp(auction.minNextBid * 1.15) },
  ];

  const submit = async (e) => {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return toast.error('Ingresa un monto válido');
    if (value < auction.minNextBid) {
      return toast.error(`La oferta mínima es ${formatQ(auction.minNextBid)}`);
    }
    setSubmitting(true);
    try {
      const res = await api.bid(vehicle.id, value);
      toast.success(res.message);
      onBidPlaced(res);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  let banner = null;
  if (viewer.isOwner) {
    banner = <StatusBanner tone="blue" icon={Info} title="Esta es tu publicación" text="No puedes ofertar por tus propios vehículos." />;
  } else if (status === 'ACTIVE' && viewer.isLeader) {
    banner = <StatusBanner tone="green" icon={Trophy} title="¡Vas ganando esta subasta!" text="Te avisaremos al instante si alguien supera tu oferta." />;
  } else if (status === 'ACTIVE' && viewer.hasBid) {
    banner = (
      <StatusBanner
        tone="red"
        icon={AlertTriangle}
        title="Tu oferta ha sido superada"
        text="¡Haz tu oferta ahora antes de que termine el tiempo!"
      />
    );
  } else if (isClosed && viewer.isLeader) {
    banner = <StatusBanner tone="green" icon={Trophy} title="¡Ganaste esta subasta!" text={`Tu oferta de ${formatQ(auction.currentBid)} fue la más alta.`} />;
  } else if (isClosed && viewer.hasBid) {
    banner = <StatusBanner tone="gray" icon={Info} title="La subasta terminó" text="Tu oferta fue superada por otro postor." />;
  }

  return (
    <div className="card space-y-5 p-5 sm:p-6">
      <div className="flex items-center justify-between">
        {status === 'ACTIVE' ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700 ring-1 ring-green-200">
            <span className="live-dot size-2 rounded-full bg-green-500" /> Subasta en vivo
          </span>
        ) : status === 'SCHEDULED' ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700 ring-1 ring-brand-200">
            <CalendarClock className="size-3.5" /> Próximamente
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
            <Lock className="size-3.5" /> Oferta cerrada
          </span>
        )}
        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <Users className="size-3.5" /> {auction.bidCount} {auction.bidCount === 1 ? 'oferta' : 'ofertas'}
        </span>
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-500">{hasBids ? 'Oferta actual más alta' : 'Monto base de la subasta'}</p>
        <p className={`mt-1 inline-block rounded-lg px-1 text-4xl font-extrabold tracking-tight text-slate-900 ${flash ? 'flash-price' : ''}`}>
          {formatQ(hasBids ? auction.currentBid : auction.basePrice)}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Monto base: <span className="font-semibold">{formatQ(auction.basePrice)}</span> · Los postores son anónimos
        </p>
      </div>

      {status === 'ACTIVE' && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-600">
            <Radio className="size-4 text-green-600" /> Termina en
          </p>
          <Countdown ms={endMs} tone={endMs < 3_600_000 ? 'urgent' : 'brand'} />
        </div>
      )}
      {status === 'SCHEDULED' && (
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-600">La subasta inicia en</p>
          <Countdown ms={startMs} />
        </div>
      )}

      {banner}

      {isClosed && (
        <StatusBanner
          tone={status === 'SOLD' ? 'amber' : 'gray'}
          icon={status === 'SOLD' ? Gavel : Ban}
          title={status === 'SOLD' ? `Vendido por ${formatQ(auction.currentBid)}` : 'Subasta desierta / no vendida'}
          text={
            status === 'SOLD'
              ? 'La subasta finalizó. Ya no es posible ofertar.'
              : 'Llegó la hora de cierre sin alcanzar el monto base. Ya no es posible ofertar.'
          }
        />
      )}

      {status === 'ACTIVE' && !viewer.isOwner && (
        viewer.authenticated ? (
          <form onSubmit={submit} className="space-y-3">
            <label className="label" htmlFor="bid-amount">
              Tu oferta (mínimo {formatQ(auction.minNextBid)})
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">Q</span>
                <input
                  id="bid-amount"
                  type="number"
                  min={auction.minNextBid}
                  step="0.01"
                  className="input pl-8 text-lg font-bold"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={viewer.isLeader}
                />
              </div>
              <button className="btn-accent px-5 text-base" disabled={submitting || viewer.isLeader}>
                <Gavel className="size-5" /> {submitting ? 'Enviando…' : 'Ofertar'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {quick.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  disabled={viewer.isLeader}
                  onClick={() => setAmount(String(q.value))}
                  className="chip border-slate-200 bg-white text-slate-700 hover:border-brand-200 hover:bg-brand-50 disabled:opacity-50"
                >
                  {q.label}: {formatQ(q.value)}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              {hasBids
                ? 'Cada nueva oferta debe superar la actual en al menos 10%.'
                : 'La primera oferta debe ser igual o mayor al monto base.'}
            </p>
          </form>
        ) : (
          <div className="rounded-2xl bg-slate-50 p-4 text-center ring-1 ring-slate-200">
            <Lock className="mx-auto size-6 text-slate-400" />
            <p className="mt-2 font-bold text-slate-800">Inicia sesión para ofertar</p>
            <p className="text-sm text-slate-500">Los invitados solo pueden ver el inventario.</p>
            <div className="mt-3 flex justify-center gap-2">
              <Link to="/login" state={{ from: location.pathname }} className="btn-primary">Iniciar sesión</Link>
              <Link to="/registro" state={{ from: location.pathname }} className="btn-ghost">Crear cuenta</Link>
            </div>
          </div>
        )
      )}

      {viewer.isOwner && (
        <Link to={`/mis-publicaciones/${vehicle.id}/editar`} className="btn-ghost w-full">
          <Pencil className="size-4" /> Editar publicación
        </Link>
      )}

      <dl className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm">
        <div>
          <dt className="text-xs font-semibold text-slate-500">Inicio</dt>
          <dd className="font-semibold text-slate-800">{formatDate(auction.startAt)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-500">Cierre</dt>
          <dd className="font-semibold text-slate-800">{formatDate(auction.endAt)}</dd>
        </div>
      </dl>

      {myBids.length > 0 && (
        <div className="border-t border-slate-100 pt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Tus ofertas</p>
          <ul className="space-y-1.5">
            {myBids.map((b) => (
              <li key={b.id} className="flex justify-between text-sm">
                <span className="font-semibold text-slate-800">{formatQ(b.amount)}</span>
                <span className="text-slate-500">{formatDate(b.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
