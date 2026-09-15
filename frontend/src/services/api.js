import axios from 'axios';

export const AUTH_STORAGE_KEY = 'trooferz_token';
const configuredApiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: configuredApiUrl.replace(/\/+$/, ''),
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_STORAGE_KEY);
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = String(error.config?.url || '');
    const isAuthRequest = /^\/auth\/(?:login|admin-login|register)$/.test(url);

    // Do not redirect during login/register failures; let the auth page show the API message.
    if (status === 401 && !isAuthRequest) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
