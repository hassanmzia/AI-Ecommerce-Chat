import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (user: User, token: string, refreshToken: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  setToken: (token: string, refreshToken: string) => void;
}

const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: (user, token, refreshToken) => {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('refresh_token', refreshToken);
        set({
          user,
          token,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      logout: () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      setUser: (user) => set({ user }),

      setLoading: (isLoading) => set({ isLoading }),

      setToken: (token, refreshToken) => {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('refresh_token', refreshToken);
        set({ token, refreshToken });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
