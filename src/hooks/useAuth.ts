import { useState, useCallback, useEffect } from "react";

const ADMIN_KEY = "trading_competition_admin";
const TOKEN_KEY = "admin_simple_token";

export function useAuth() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ email: string; name?: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(ADMIN_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed.user);
        setIsAdmin(true);
      } catch {
        localStorage.removeItem(ADMIN_KEY);
        localStorage.removeItem(TOKEN_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((result: { token: string; simpleToken: string; user: { email: string; name?: string } }) => {
    localStorage.setItem(ADMIN_KEY, JSON.stringify(result));
    localStorage.setItem(TOKEN_KEY, result.simpleToken);
    setUser(result.user);
    setIsAdmin(true);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(ADMIN_KEY);
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setIsAdmin(false);
  }, []);

  return { isAdmin, isLoading, user, login, logout };
}
