import { createContext, useContext, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";

interface AuthContextType {
  isAdmin: boolean;
  isLoading: boolean;
  user: { email: string; name?: string } | null;
  login: (result: { token: string; simpleToken: string; user: { email: string; name?: string } }) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}
