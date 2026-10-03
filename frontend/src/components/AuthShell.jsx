import { Gavel, Search, UserPlus } from 'lucide-react';

export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:py-16">
      <div className="hidden flex-col justify-center rounded-3xl bg-gradient-to-br from-brand-50 via-white to-amber-50 p-10 ring-1 ring-slate-200 lg:flex">
        <h2 className="text-3xl font-extrabold leading-tight text-slate-900">
          Subastas de vehículos de EE. UU. <span className="text-brand-600">en tiempo real</span>
        </h2>
        <ul className="mt-8 space-y-5">
          {[
            { icon: UserPlus, t: 'Regístrese', d: 'Su cuenta le permite ofertar y publicar vehículos.' },
            { icon: Search, t: 'Encuentre', d: 'Filtre por marca, modelo, año, combustible y nivel de daño.' },
            { icon: Gavel, t: 'Oferte', d: 'Vea la oferta más alta al instante y sepa si va ganando.' },
          ].map(({ icon: Icon, t, d }) => (
            <li key={t} className="flex gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-600 text-white"><Icon className="size-5" /></span>
              <div>
                <p className="font-bold text-slate-900">{t}</p>
                <p className="text-sm text-slate-600">{d}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="card p-6 sm:p-10">
        <h1 className="text-2xl font-extrabold text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
