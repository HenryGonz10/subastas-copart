import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-6xl font-extrabold text-brand-600">404</p>
      <p className="mt-2 text-xl font-bold text-slate-800">Página no encontrada</p>
      <Link to="/" className="btn-primary mt-6">Ir al inventario</Link>
    </div>
  );
}
