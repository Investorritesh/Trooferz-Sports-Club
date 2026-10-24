import axios from 'axios';

export const AUTH_STORAGE_KEY = 'trooferz_token';
function getApiBaseUrl() {
  let envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'https://trooferz-sports-club-api.onrender.com/api';
  }
  return (envUrl || 'http://127.0.0.1:8000/api').replace(/\/+$/, '');
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000,
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
    const isAuthRequest = /^\/auth\/(?:login|admin-login|staff-login|member-login|register)/.test(url);

    // Only redirect to login if user had a token that expired, avoiding kicking guest visitors
    if (status === 401 && !isAuthRequest) {
      const hadToken = !!localStorage.getItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(AUTH_STORAGE_KEY);
      if (hadToken && typeof window !== 'undefined' && !window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
