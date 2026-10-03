import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Car, ClipboardList, LogIn, LogOut, Menu, PlusCircle, UserPlus, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const navClass = ({ isActive }) =>
  `inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`;

export default function Layout() {
  const { user, isAuthenticated, logout } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate('/');
  };

  const links = (
    <>
      <NavLink to="/" end className={navClass} onClick={() => setOpen(false)}>
        <Car className="size-4" /> Inventario
      </NavLink>
      {isAuthenticated && (
        <>
          <NavLink to="/publicar" className={navClass} onClick={() => setOpen(false)}>
            <PlusCircle className="size-4" /> Publicar vehículo
          </NavLink>
          <NavLink to="/mis-publicaciones" className={navClass} onClick={() => setOpen(false)}>
            <ClipboardList className="size-4" /> Mis publicaciones
          </NavLink>
        </>
      )}
    </>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-brand-600 text-white shadow-sm">
              <Car className="size-5" />
            </span>
            <span className="text-lg font-extrabold tracking-tight text-slate-900">
              Auto<span className="text-brand-600">Subastas</span>
              <span className="ml-1 rounded-md bg-accent-400 px-1.5 py-0.5 text-xs font-bold text-slate-900">GT</span>
            </span>
          </Link>

          <nav className="ml-4 hidden items-center gap-1 lg:flex">{links}</nav>

          <div className="ml-auto hidden items-center gap-3 lg:flex">
            <span
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500"
              title={connected ? 'Conectado en tiempo real' : 'Reconectandoâ€¦'}
            >
              <span className={`size-2 rounded-full ${connected ? 'live-dot bg-green-500' : 'bg-slate-300'}`} />
              {connected ? 'En vivo' : 'Sin conexión'}
            </span>
            {isAuthenticated ? (
              <>
                <span className="flex items-center gap-2 rounded-xl bg-slate-100 py-1.5 pl-1.5 pr-3 text-sm font-semibold text-slate-700">
                  <span className="grid size-7 place-items-center rounded-lg bg-brand-600 text-xs font-bold text-white">
                    {user.firstName[0]}
                    {user.lastName[0]}
                  </span>
                  {user.firstName}
                </span>
                <button className="btn-ghost" onClick={handleLogout}>
                  <LogOut className="size-4" /> Salir
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-ghost">
                  <LogIn className="size-4" /> Iniciar sesión
                </Link>
                <Link to="/registro" className="btn-primary">
                  <UserPlus className="size-4" /> Regístrese
                </Link>
              </>
            )}
          </div>

          <button className="btn-ghost ml-auto px-3 lg:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menú">
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {open && (
          <div className="space-y-1 border-t border-slate-200 bg-white px-4 py-3 lg:hidden">
            <div className="flex flex-col gap-1">{links}</div>
            <div className="flex gap-2 pt-2">
              {isAuthenticated ? (
                <button className="btn-ghost w-full" onClick={handleLogout}>
                  <LogOut className="size-4" /> Salir ({user.firstName})
                </button>
              ) : (
                <>
                  <Link to="/login" className="btn-ghost flex-1" onClick={() => setOpen(false)}>Iniciar sesión</Link>
                  <Link to="/registro" className="btn-primary flex-1" onClick={() => setOpen(false)}>Regístrese</Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} AutoSubastas GT · Vehículos de subasta importados de EE. UU.</p>
          <p className="font-medium">Regístrese · Encuentre · Oferte</p>
        </div>
      </footer>
    </div>
  );
}
