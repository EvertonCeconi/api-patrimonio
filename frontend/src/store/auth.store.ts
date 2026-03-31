import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

interface AuthState {
  accessToken: string | null;
  user: User | null;
  isReady: boolean;
  setToken: (token: string) => void;
  setUser: (user: User) => void;
  setReady: (ready: boolean) => void;
  clear: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      user: null,
      isReady: false,

      setToken: (token) => set({ accessToken: token }),

      setUser: (user) => set({ user }),
      
      setReady: (ready) => set({ isReady: ready }),

      clear: () => set({ accessToken: null, user: null }),

      isAuthenticated: () => !!get().accessToken,
    }),
    {
      name: 'auth',
      // persiste apenas o user — token fica só em memória por segurança
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
