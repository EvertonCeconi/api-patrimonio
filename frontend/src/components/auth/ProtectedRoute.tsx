import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';

interface ProtectedRouteProps {
  requiredRole?: 'ADMIN' | 'USER';
}

export function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  const { accessToken, user, isReady } = useAuthStore();

  // aguarda o refresh inicial antes de decidir redirecionar
  if (!isReady) return null;

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/equipments" replace />;
  }

  return <Outlet />;
}
