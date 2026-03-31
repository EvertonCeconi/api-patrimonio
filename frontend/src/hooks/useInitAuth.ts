import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { authService } from '@/services/auth.service';

export function useInitAuth() {
  const { setToken, setUser, setReady } = useAuthStore();

  useEffect(() => {
    async function init() {
      try {
        const { access_token, user } = await authService.refreshWithLock();;
        setToken(access_token);
        if (user) setUser(user);
      } catch { /* empty */ } finally {
        setReady(true);
      }
    }

    init();
  }, []);
}
