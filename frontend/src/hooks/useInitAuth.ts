import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { authService } from '@/services/auth.service';

export function useInitAuth() {
  const { setToken, setUser, setReady } = useAuthStore();
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    async function init() {
      try {
        const result = await authService.refreshWithLock();
        setToken(result.access_token);
        if (result.user) setUser(result.user);
      } catch {
        // ✅ Falha silenciosa: cookie expirado ou inválido.
        // O ProtectedRoute cuidará de redirecionar para /login.
      } finally {
        setReady(true);
      }
    }

    init();
  }, [setToken, setUser, setReady]);
}
