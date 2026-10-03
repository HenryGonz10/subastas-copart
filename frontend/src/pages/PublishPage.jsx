import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../lib/api';
import VehicleForm from '../components/VehicleForm';

export default function PublishPage() {
  const navigate = useNavigate();

  const handleSubmit = async (form) => {
    const { vehicle } = await api.createVehicle(form);
    toast.success('¡Vehículo publicado en el inventario!');
    navigate(`/vehiculos/${vehicle.id}`);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Publicar vehículo</h1>
      <p className="mt-1 text-slate-500">Completa la ficha técnica, sube las fotografías y define los parámetros de la subasta.</p>
      <div className="mt-6">
        <VehicleForm onSubmit={handleSubmit} submitLabel="Publicar subasta" />
      </div>
    </div>
  );
}
