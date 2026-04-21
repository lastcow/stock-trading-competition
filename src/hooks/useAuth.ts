import { useState, useCallback, useEffect } from 'react';

const ADMIN_EMAIL = 'joy@zheng.me';
const ADMIN_PASSWORD = 'Paradise@188';
const STORAGE_KEY = 'trading_competition_admin';

export interface AuthState {
  isAdmin: boolean;
  adminEmail: string | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { isAdmin: true, adminEmail: parsed.email || null };
      }
    } catch {
      // ignore
    }
    return { isAdmin: false, adminEmail: null };
  });

  const login = useCallback((email: string, password: string): boolean => {
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const state = { isAdmin: true, adminEmail: email };
      setAuthState(state);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ email }));
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setAuthState({ isAdmin: false, adminEmail: null });
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const checkAdmin = useCallback((): boolean => {
    return authState.isAdmin;
  }, [authState.isAdmin]);

  // Listen for storage changes from other tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        if (e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            setAuthState({ isAdmin: true, adminEmail: parsed.email || null });
          } catch {
            setAuthState({ isAdmin: false, adminEmail: null });
          }
        } else {
          setAuthState({ isAdmin: false, adminEmail: null });
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return {
    ...authState,
    login,
    logout,
    checkAdmin,
  };
}
