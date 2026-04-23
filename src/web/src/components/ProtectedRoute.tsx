import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ForcedPinChange from './ForcedPinChange';

export default function ProtectedRoute() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePin) return <ForcedPinChange />;
  return <Outlet />;
}
