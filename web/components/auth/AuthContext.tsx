"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "@/lib/api";

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  avatarUrl: string | null;
  dateOfBirth: string | null;
  gender: string | null;
};

type AuthState = {
  user: User | null;
  loading: boolean;
  setUser: (u: User | null) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ user: User }>("/api/auth/me")
      .then((d) => setUser(d.user))
      .catch(async () => {
        // Access token may have expired — try one silent refresh.
        try {
          await api("/api/auth/refresh", { method: "POST" });
          const d = await api<{ user: User }>("/api/auth/me");
          setUser(d.user);
        } catch {
          setUser(null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const logout = useCallback(async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
  }, []);

  // Without this, every AuthProvider render (including ones nothing here
  // caused — a parent re-rendering for its own reasons) hands consumers a
  // brand-new object. Anything depending on the return of useAuth() then
  // sees a "change" on every one of those renders even when user and
  // loading are unchanged, which is exactly what was re-firing effects that
  // should only run when the session actually changes.
  const value = useMemo(
    () => ({ user, loading, setUser, logout }),
    [user, loading, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
