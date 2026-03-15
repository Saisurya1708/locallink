import axios from 'axios';
import { useStore } from '../store/useStore';

const API_URL = 'https://locallink-production-88e8.up.railway.app/api';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: false,
});

// Inject access token on every request
api.interceptors.request.use((config) => {
  const token = useStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const { refreshToken, setAuth, clearAuth, user } = useStore.getState();
      if (!refreshToken) { clearAuth(); return Promise.reject(error); }
      try {
        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        setAuth(user!, data.accessToken, data.refreshToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        clearAuth();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
