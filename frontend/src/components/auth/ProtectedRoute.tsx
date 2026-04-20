import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { useInitAuth } from '@/hooks/useInitAuth';

interface ProtectedRouteProps {
  requiredRole?: 'ADMIN' | 'USER';
}

export function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  useInitAuth();
  
  const { accessToken, user, isReady } = useAuthStore();

  if (!isReady) return null;

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/equipments" replace />;
  }

  return <Outlet />;
}
