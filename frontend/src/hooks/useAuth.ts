import { useAuthStore } from '@/store/auth.store';
import { authService } from '@/services/auth.service';
import type { SignInPayload, SignUpPayload } from '@/types';
import { useNavigate } from 'react-router-dom';

export function useAuth() {
  const { accessToken, user, setToken, setUser, clear, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  async function signIn(payload: SignInPayload) {
    const { access_token, user: userData } = await authService.signIn(payload);
    setToken(access_token);
    if (userData) {
      setUser(userData);
    }
    navigate('/equipments');
  }

  async function signUp(payload: SignUpPayload) {
    await authService.signUp(payload);
    await signIn({ email: payload.email, password: payload.password });
  }

  async function logout() {
    try {
      await authService.logout();
    } finally {
      clear();
      navigate('/login');
    }
  }

  return {
    accessToken,
    user,
    isAuthenticated: isAuthenticated(),
    signIn,
    signUp,
    logout,
    setUser,
  };
}
