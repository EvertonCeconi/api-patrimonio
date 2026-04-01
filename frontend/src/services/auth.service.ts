import { api } from '@/lib/api';
import type { AuthResponse, SignInPayload, SignUpPayload } from '@/types';

let refreshPromise: Promise<AuthResponse> | null = null;

export const authService = {
  
  async signIn(payload: SignInPayload): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/signin', payload);
    return data;
  },

  async signUp(payload: SignUpPayload): Promise<void> {
    await api.post('/auth/signup', payload);
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  async refresh(): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/refresh');
    return data;
  },

  async refreshWithLock(): Promise<AuthResponse> {
    if (!refreshPromise) {
      refreshPromise = this.refresh().finally(() => {
        refreshPromise = null;
      });
    }

    return refreshPromise;
  },
};
