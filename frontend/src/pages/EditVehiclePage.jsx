import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { api } from '../lib/api';
import { vehicleTitle } from '../lib/format';
import VehicleForm from '../components/VehicleForm';
import Spinner from '../components/Spinner';

export default function EditVehiclePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .vehicle(id)
      .then(({ vehicle }) => {
        if (!vehicle.isOwner) setError('Solo puedes editar tus propias publicaciones');
        else setVehicle(vehicle);
      })
      .catch((err) => setError(err.message));
  }, [id]);

  const handleSubmit = async (form) => {
    await api.updateVehicle(id, form);
    toast.success('Publicación actualizada');
    navigate('/mis-publicaciones');
  };

  if (error) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="text-xl font-bold text-slate-800">{error}</p>
        <Link to="/mis-publicaciones" className="btn-primary mt-6">Ir a mis publicaciones</Link>
      </div>
    );
  }
  if (!vehicle) return <Spinner className="py-32" />;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link to="/mis-publicaciones" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-brand-700">
        <ArrowLeft className="size-4" /> Mis publicaciones
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Editar publicación</h1>
          <p className="mt-1 text-slate-500">{vehicleTitle(vehicle)} · Lote #{String(vehicle.id).padStart(5, '0')}</p>
        </div>
        <Link to={`/vehiculos/${vehicle.id}`} className="btn-ghost">
          <ExternalLink className="size-4" /> Ver subasta
        </Link>
      </div>
      <div className="mt-6">
        <VehicleForm vehicle={vehicle} onSubmit={handleSubmit} submitLabel="Guardar cambios" />
      </div>
    </div>
  );
}
