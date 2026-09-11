"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface User {
  srn: string;
  name: string;
  role: "admin" | "member";
  branch: string;
  semester: string;
}

export interface PESUProfile {
  name: string;
  srn: string;
  prn: string;
  program: string;
  branch: string;
  semester: string;
  section: string;
  email: string;
  phone: string;
  campus: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  profile: PESUProfile | null;
  login: (
    userName: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<PESUProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      if (!res.ok) {
        setUser(null);
        setProfile(null);
        return;
      }
      const data = await res.json();
      setUser(data.user ?? null);
      setProfile(data.profile ?? null);
    } catch {
      setUser(null);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(
    async (userName: string, password: string) => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userName, password }),
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          return { success: false, error: data.error ?? "Login failed" };
        }

        setUser(data.user ?? null);
        setProfile(data.profile ?? null);
        return { success: true };
      } catch {
        return {
          success: false,
          error: "Could not reach the authentication service",
        };
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      setProfile(null);
    }
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, isLoading, profile, login, logout, refresh }),
    [user, isLoading, profile, login, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
