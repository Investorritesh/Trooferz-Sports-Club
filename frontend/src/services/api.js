import axios from 'axios';

export const AUTH_STORAGE_KEY = 'trooferz_token';

// Canonical deployed production backend
export const PROD_API_URL = 'https://trooferz-sports-club.onrender.com/api';

function getApiBaseUrl() {
  let envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;

  // Auto-correct any legacy or misconfigured Render backend URLs
  if (envUrl) {
    envUrl = envUrl.replace('trooferz-sports-club-api.onrender.com', 'trooferz-sports-club.onrender.com');
    envUrl = envUrl.replace('trooferz-sports-club-backend.onrender.com', 'trooferz-sports-club.onrender.com');
  }

  // If in browser outside localhost, use valid environment URL or fallback to canonical live Render backend
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
      return envUrl.replace(/\/+$/, '');
    }
    return PROD_API_URL;
  }

  // Local development fallback
  return (envUrl || 'http://127.0.0.1:8000/api').replace(/\/+$/, '');
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 60000, // 60s timeout to allow for Render free-tier cold-start wakeups
  headers: { 'Content-Type': 'application/json' }
});

// Warm up sleeping Render backend instance immediately upon page visit
if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
  try {
    fetch('https://trooferz-sports-club.onrender.com/api/health', { mode: 'cors' }).catch(() => {});
  } catch (_) {}
}

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
