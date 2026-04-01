import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginPage }      from '@/pages/LoginPage';
import { SignUpPage }     from '@/pages/SignUpPage';
import { EquipmentsPage } from '@/pages/EquipmentsPage';
import { AppLayout }      from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useInitAuth }    from '@/hooks/useInitAuth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 30,
    },
  },
});

function Root() {
  useInitAuth();

  return (
    <Routes>
      <Route path="/login"  element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/equipments" element={<EquipmentsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/equipments" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Root />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
