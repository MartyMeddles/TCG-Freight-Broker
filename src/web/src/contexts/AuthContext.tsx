import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { apiClient } from '../lib/apiClient';

interface AuthUser {
  userId: string;
  username: string;
  displayName: string;
  role: string;
  mustChangePin: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (username: string, pin: string) => Promise<void>;
  logout: () => void;
  changePin: (currentPin: string, newPin: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadStoredUser(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem('user');
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadStoredUser);

  const login = useCallback(async (username: string, pin: string) => {
    const { data } = await apiClient.post<{
      token: string;
      expiresAt: string;
      userId: string;
      username: string;
      displayName: string;
      role: string;
      mustChangePin: boolean;
    }>('/auth/login', { username, pin });

    sessionStorage.setItem('jwt', data.token);
    const authUser: AuthUser = {
      userId: data.userId,
      username: data.username,
      displayName: data.displayName,
      role: data.role,
      mustChangePin: data.mustChangePin,
    };
    sessionStorage.setItem('user', JSON.stringify(authUser));
    setUser(authUser);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem('jwt');
    sessionStorage.removeItem('user');
    setUser(null);
  }, []);

  const changePin = useCallback(async (currentPin: string, newPin: string) => {
    await apiClient.post('/auth/change-pin', { currentPin, newPin });
    // Clear the mustChangePin flag in local state
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, mustChangePin: false };
      sessionStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, changePin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
