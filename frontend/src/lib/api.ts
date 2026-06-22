import axios from 'axios';
import { useAuthStore } from '@/store/auth.store';

// instância principal
export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// ⚠️ instância separada para refresh (SEM interceptor)
const apiAuth = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// ─── Request interceptor — injeta access_token ───────────────────────────────
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// ─── Response interceptor — refresh automático ───────────────────────────────
let isRefreshing = false;

let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token!);
  });

  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const is401 = error.response?.status === 401;
    const isRefreshRoute = originalRequest.url?.includes('/auth/refresh');
    const alreadyRetried = originalRequest._retry;
    
    const isPublicAuthRoute =
      originalRequest.url?.includes('/auth/signin') ||
      originalRequest.url?.includes('/auth/signup');

    if (!is401 || isRefreshRoute || isPublicAuthRoute || alreadyRetried) {
      return Promise.reject(error);
    }
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { data } = await apiAuth.post<{ access_token: string }>('/auth/refresh');
      const newToken = data.access_token;
      useAuthStore.getState().setToken(newToken);
      processQueue(null, newToken);
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      useAuthStore.getState().clear();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);
