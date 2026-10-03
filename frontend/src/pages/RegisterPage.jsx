import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Check, UserPlus, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthShell from '../components/AuthShell';

const RULES = [
  { test: (p) => p.length >= 8, label: 'Mínimo 8 caracteres' },
  { test: (p) => /[A-Z]/.test(p), label: 'Una mayúscula' },
  { test: (p) => /[a-z]/.test(p), label: 'Una minúscula' },
  { test: (p) => /\d/.test(p), label: 'Un número' },
  { test: (p) => /[^A-Za-z0-9]/.test(p), label: 'Un carácter especial' },
];

export default function RegisterPage() {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to={from} replace />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const passwordOk = RULES.every((r) => r.test(form.password));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setErrors({});
    if (!passwordOk) return setError('La contraseña no cumple los requisitos de seguridad');
    if (form.password !== form.confirm) return setErrors({ confirm: 'Las contraseñas no coinciden' });
    setLoading(true);
    try {
      const { confirm: _confirm, ...data } = form;
      await register(data);
      toast.success('¡Cuenta creada! Ya puedes ofertar y publicar.');
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
      if (err.errors) setErrors(Object.fromEntries(err.errors.map((x) => [x.field, x.message])));
    } finally {
      setLoading(false);
    }
  };

  const field = (key, label, props = {}) => (
    <div>
      <label className="label" htmlFor={key}>{label}</label>
      <input id={key} className="input" value={form[key]} onChange={set(key)} required {...props} />
      {errors[key] && <p className="mt-1 text-xs font-medium text-red-600">{errors[key]}</p>}
    </div>
  );

  return (
    <AuthShell title="Crear cuenta" subtitle="El registro es obligatorio para ofertar o publicar vehículos.">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {field('firstName', 'Nombre', { autoComplete: 'given-name' })}
          {field('lastName', 'Apellido', { autoComplete: 'family-name' })}
        </div>
        {field('email', 'Correo electrónico', { type: 'email', autoComplete: 'email' })}
        {field('phone', 'Teléfono', { type: 'tel', placeholder: '+502 5555-5555', autoComplete: 'tel' })}
        {field('password', 'Contraseña', { type: 'password', autoComplete: 'new-password' })}
        <ul className="grid grid-cols-2 gap-1 text-xs">
          {RULES.map((r) => {
            const ok = r.test(form.password);
            return (
              <li key={r.label} className={`flex items-center gap-1.5 font-medium ${ok ? 'text-green-600' : 'text-slate-400'}`}>
                {ok ? <Check className="size-3.5" /> : <X className="size-3.5" />} {r.label}
              </li>
            );
          })}
        </ul>
        {field('confirm', 'Confirmar contraseña', { type: 'password', autoComplete: 'new-password' })}
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
        <button className="btn-primary w-full py-3" disabled={loading}>
          <UserPlus className="size-4" /> {loading ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>
        <p className="text-center text-sm text-slate-500">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" state={location.state} className="font-semibold text-brand-700 hover:underline">Inicia sesión</Link>
        </p>
      </form>
    </AuthShell>
  );
}
