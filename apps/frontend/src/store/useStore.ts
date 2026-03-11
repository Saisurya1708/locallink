import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  username: string;
  rating: number;
}

interface AppState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  userLocation: { lat: number; lng: number } | null;

  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  setLocation: (lat: number, lng: number) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      userLocation: null,

      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken }),

      clearAuth: () =>
        set({ user: null, accessToken: null, refreshToken: null }),

      setLocation: (lat, lng) =>
        set({ userLocation: { lat, lng } }),
    }),
    {
      name: 'locallink-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);
