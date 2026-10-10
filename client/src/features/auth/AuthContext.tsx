import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { api, ApiError, setUnauthorizedHandler } from "../../lib/api";
import { retryWhileWaking, unavailableMessage, WAKE_REQUEST_MS } from "../../lib/wake";

export type User = { id: string; email: string; currency: string; timezone: string; onboarded: boolean };

type AuthState = {
  user: User | null;
  loading: boolean;
  /** True when the session ended while the app was open, so the sign-in page can say so. */
  expired: boolean;
  /** A message when the server could not be reached at all (not the same as being signed out). */
  unavailable: string | null;
  retry: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateSettings: (currency: string, timezone: string) => Promise<void>;
  completeOnboarding: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);

  const [unavailable, setUnavailable] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setUnavailable(null);
    // A hosted server may be asleep: keep asking for a while (the loading screen explains the wait) before giving up.
    retryWhileWaking(() => api<{ user: User }>("/auth/me", { timeoutMs: WAKE_REQUEST_MS }))
      .then((r) => setUser(r.user))
      .catch((e) => {
        setUser(null);
        // 401 just means "not signed in". Anything else means the server or database isn't answering.
        if (!(e instanceof ApiError && e.status === 401)) setUnavailable(unavailableMessage(e, import.meta.env.PROD));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    setUnauthorizedHandler(() => {
      setUser(null);
      setExpired(true);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const start = (path: string) => async (email: string, password: string) => {
    const r = await api<{ user: User }>(path, { method: "POST", body: { email, password } });
    setExpired(false);
    setUser(r.user);
  };

  const signOut = async () => {
    await api("/auth/logout", { method: "POST" });
    setExpired(false);
    setUser(null);
  };

  const updateSettings = async (currency: string, timezone: string) => {
    const r = await api<{ user: User }>("/settings", { method: "PUT", body: { currency, timezone } });
    setUser(r.user);
  };

  const completeOnboarding = async () => {
    const r = await api<{ user: User }>("/settings/onboarded", { method: "POST" });
    setUser(r.user);
  };

  return (
    <AuthContext.Provider value={{ user, loading, expired, unavailable, retry: load, signIn: start("/auth/login"), signUp: start("/auth/register"), signOut, updateSettings, completeOnboarding }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
