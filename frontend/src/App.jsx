import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import VehicleDetailPage from './pages/VehicleDetailPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PublishPage from './pages/PublishPage';
import MyListingsPage from './pages/MyListingsPage';
import EditVehiclePage from './pages/EditVehiclePage';
import NotFoundPage from './pages/NotFoundPage';
import { useAuth } from './context/AuthContext';
import Spinner from './components/Spinner';

function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner className="py-32" />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="vehiculos/:id" element={<VehicleDetailPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="registro" element={<RegisterPage />} />
        <Route path="publicar" element={<RequireAuth><PublishPage /></RequireAuth>} />
        <Route path="mis-publicaciones" element={<RequireAuth><MyListingsPage /></RequireAuth>} />
        <Route path="mis-publicaciones/:id/editar" element={<RequireAuth><EditVehiclePage /></RequireAuth>} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
