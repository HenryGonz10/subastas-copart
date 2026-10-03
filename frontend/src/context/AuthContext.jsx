import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(getToken);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  const applySession = useCallback((session) => {
    setToken(session?.token ?? null);
    setTokenState(session?.token ?? null);
    setUser(session?.user ?? null);
  }, []);

  useEffect(() => {
    if (!token || user) return;
    api
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => applySession(null))
      .finally(() => setLoading(false));
  }, [token, user, applySession]);

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isAuthenticated: Boolean(token && user),
      login: async (credentials) => applySession(await api.login(credentials)),
      register: async (data) => applySession(await api.register(data)),
      logout: () => applySession(null),
    }),
    [token, user, loading, applySession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
