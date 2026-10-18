import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api, { AUTH_STORAGE_KEY } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get('/auth/me');
        if (!data?.user?.id || !data.user.role) {
          throw new Error('Invalid authenticated user response.');
        }
        setUser(data.user);
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (credentials, roleOrAdmin = 'MEMBER') => {
    let endpoint = '/auth/login';
    if (roleOrAdmin === true || roleOrAdmin === 'ADMIN') {
      endpoint = '/auth/admin-login';
    } else if (roleOrAdmin === 'STAFF') {
      endpoint = '/auth/staff-login';
    } else {
      endpoint = '/auth/login';
    }

    const { data } = await api.post(endpoint, {
      email: credentials.email.trim(),
      password: credentials.password,
    });

    if (!data?.token || !data?.user?.id || !data.user.role) {
      throw new Error('The login response was incomplete.');
    }

    localStorage.setItem(AUTH_STORAGE_KEY, data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async p => {
    const { data } = await api.post('/auth/register', p);
    if (!data?.token || !data?.user?.id) {
      throw new Error('The registration response was incomplete.');
    }
    localStorage.setItem(AUTH_STORAGE_KEY, data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
  };

  const refreshUser = async () => {
    const { data } = await api.get('/auth/me');
    if (!data?.user?.id || !data.user.role) {
      throw new Error('The user response was incomplete.');
    }
    setUser(data.user);
    return data.user;
  };

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refreshUser }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
