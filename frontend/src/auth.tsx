import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { api, tokenStore } from './api';
import { Role, SessionUser } from './types';

interface AuthState {
  user: SessionUser | null;
  loading: boolean;
  login(email: string, password: string): Promise<SessionUser>;
  logout(): void;
}
const Ctx = createContext<AuthState>(null as never);
export const useAuth = () => useContext(Ctx);

export const homeFor = (role: Role) => (role === 'ADMIN' ? '/users' : '/workshops');

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(!!tokenStore.get());

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    if (tokenStore.get()) {
      api<SessionUser>('/auth/me').then(setUser).catch(logout).finally(() => setLoading(false));
    }
    window.addEventListener('auth:expired', logout);
    return () => window.removeEventListener('auth:expired', logout);
  }, [logout]);

  const login = async (email: string, password: string) => {
    const res = await api<{ accessToken: string; user: SessionUser }>('/auth/login', { method: 'POST', body: { email, password } });
    tokenStore.set(res.accessToken);
    setUser(res.user);
    return res.user;
  };

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
}
