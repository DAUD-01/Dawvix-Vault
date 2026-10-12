import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import axios from 'axios';
import { User } from '../types';
import { authService } from '../services/api';

const SESSION_IDLE_TIMEOUT_MS = 12 * 60 * 60 * 1000;
const ACTIVITY_HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;
const SESSION_LAST_ACTIVITY_KEY = 'sessionLastActivity';

interface AuthContextType {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user?: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('token') || null;
    } catch {
      return null;
    }
  });
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('user');
      if (!savedUser || savedUser === 'undefined' || savedUser === 'null') return null;
      return JSON.parse(savedUser);
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem(SESSION_LAST_ACTIVITY_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const login = useCallback((newToken: string, newUser?: User) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem(SESSION_LAST_ACTIVITY_KEY, String(Date.now()));
    setToken(newToken);
    if (newUser) {
      localStorage.setItem('user', JSON.stringify(newUser));
      setUser(newUser);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const lastActivity = Number(localStorage.getItem(SESSION_LAST_ACTIVITY_KEY));
      if (storedToken) {
        if (
          !Number.isFinite(lastActivity) ||
          lastActivity <= 0 ||
          Date.now() - lastActivity >= SESSION_IDLE_TIMEOUT_MS
        ) {
          logout();
        } else {
          try {
            const authPromise = authService.getMe();
            const timeoutPromise = new Promise<{ user: User }>((_, reject) =>
              setTimeout(() => reject(new Error('Auth check timeout')), 3500)
            );
            const data = await Promise.race([authPromise, timeoutPromise]);
            if (isMounted) {
              setUser(data.user);
              localStorage.setItem('user', JSON.stringify(data.user));
              localStorage.setItem(SESSION_LAST_ACTIVITY_KEY, String(Date.now()));
            }
          } catch (error) {
            console.warn('Session verification failed:', (error as Error).message);
            if (isMounted) {
              logout();
            }
          }
        }
      }
      if (isMounted) {
        setIsLoading(false);
      }
    };

    void initAuth();
    return () => {
      isMounted = false;
    };
  }, [logout]);

  useEffect(() => {
    const handleUnauthorized = () => logout();
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [logout]);

  useEffect(() => {
    if (!token || isLoading) return;

    let lastActivity = Number(localStorage.getItem(SESSION_LAST_ACTIVITY_KEY));
    let lastPersistedActivity = lastActivity;
    let idleTimer: number;

    const scheduleLogout = () => {
      window.clearTimeout(idleTimer);
      const remaining = SESSION_IDLE_TIMEOUT_MS - (Date.now() - lastActivity);
      if (remaining <= 0) {
        logout();
        return;
      }
      idleTimer = window.setTimeout(logout, remaining);
    };

    const handleActivity = () => {
      lastActivity = Date.now();
      if (lastActivity - lastPersistedActivity >= 30 * 1000) {
        lastPersistedActivity = lastActivity;
        localStorage.setItem(SESSION_LAST_ACTIVITY_KEY, String(lastActivity));
      }
      scheduleLogout();
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'token' && !event.newValue) {
        logout();
      } else if (event.key === SESSION_LAST_ACTIVITY_KEY && event.newValue) {
        const sharedLastActivity = Number(event.newValue);
        if (Number.isFinite(sharedLastActivity)) {
          lastActivity = sharedLastActivity;
          lastPersistedActivity = sharedLastActivity;
          scheduleLogout();
        }
      }
    };

    scheduleLogout();
    const heartbeat = window.setInterval(() => {
      const sharedLastActivity = Number(localStorage.getItem(SESSION_LAST_ACTIVITY_KEY));
      if (
        !Number.isFinite(sharedLastActivity) ||
        Date.now() - sharedLastActivity >= SESSION_IDLE_TIMEOUT_MS
      ) {
        logout();
        return;
      }

      lastActivity = sharedLastActivity;
      scheduleLogout();
      void authService.recordActivity().catch((error: unknown) => {
        if (axios.isAxiosError(error) && error.response?.status === 401) return;
        console.error('[Auth] Session activity heartbeat failed:', error);
      });
    }, ACTIVITY_HEARTBEAT_INTERVAL_MS);

    window.addEventListener('pointermove', handleActivity);
    window.addEventListener('pointerdown', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.clearTimeout(idleTimer);
      window.clearInterval(heartbeat);
      window.removeEventListener('pointermove', handleActivity);
      window.removeEventListener('pointerdown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [isLoading, logout, token]);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
