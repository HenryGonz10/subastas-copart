import { Loader2 } from 'lucide-react';

export default function Spinner({ className = '', label = 'Cargando…' }) {
  return (
    <div className={`flex items-center justify-center gap-2 text-slate-500 ${className}`}>
      <Loader2 className="size-5 animate-spin text-brand-600" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
