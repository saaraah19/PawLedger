import { FormEvent, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Paw } from "../components/Paw";
import { Loading } from "../components/StatusScreens";
import { useAuth } from "../features/auth/AuthContext";
import { privateNotice } from "../features/auth/privateNotice";
import { api, ApiError } from "../lib/api";
import { useTitle } from "../lib/useTitle";

export function Login() {
  useTitle("Sign in");
  const { user, loading, signIn, signUp, expired, unavailable, retry } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState<boolean | null>(null); // null until the server has said

  useEffect(() => {
    if (loading) return; // a sleeping server can't answer yet; asking now would wrongly look like "registration is open"
    api<{ registrationOpen: boolean }>("/auth/config").then((c) => setRegistrationOpen(c.registrationOpen)).catch(() => setRegistrationOpen(true));
  }, [loading]);

  if (user) return <Navigate to="/" replace />;
  if (loading) return <Loading />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return; // prevent duplicate submissions
    setBusy(true);
    setError("");
    try {
      await (mode === "in" ? signIn : signUp)(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const field = "mt-1 w-full rounded-sm border border-rule bg-white/60 px-3 py-2 outline-none focus:border-moss";

  return (
    <div className="mx-auto max-w-sm px-5 pt-24">
      <div className="flex items-center gap-2 text-moss">
        <Paw className="h-8 w-8" />
        <span className="font-display text-3xl font-bold tracking-tight text-ink">PawLedger</span>
      </div>
      <p className="mt-2 text-stone">Your money, leaving a trail.</p>

      <div role="note" className="mt-6 border border-rule bg-white/40 p-4 text-sm leading-relaxed">
        <p>
          <strong className="font-semibold">{privateNotice(registrationOpen).lead}</strong> {privateNotice(registrationOpen).body}
        </p>
      </div>

      {unavailable && (
        <div role="alert" className="mt-8 border-l-2 border-ochre pl-3 text-sm">
          <p>{unavailable}</p>
          <button onClick={retry} className="mt-2 underline underline-offset-4">Try again</button>
        </div>
      )}
      {expired && <p role="status" className="mt-8 border-l-2 border-ochre pl-3 text-sm">Your session has ended. Please sign in again; nothing was lost.</p>}

      <form onSubmit={submit} className="mt-10 space-y-5">
        <label className="block text-sm font-medium">
          Email
          <input className={field} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block text-sm font-medium">
          Password
          <input
            className={field}
            type="password"
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            required
            minLength={mode === "up" ? 10 : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {mode === "up" && <span className="mt-1 block text-xs font-normal text-stone">At least 10 characters.</span>}
        </label>

        {error && (
          <p role="alert" className="border-l-2 border-ochre pl-3 text-sm">
            {error}
          </p>
        )}

        <button disabled={busy} className="w-full rounded-sm bg-moss px-4 py-2.5 font-medium text-white disabled:opacity-60">
          {busy ? "Working…" : mode === "in" ? "Sign in" : "Create account"}
        </button>
      </form>

      {registrationOpen === true && (
        <button
          onClick={() => {
            setMode(mode === "in" ? "up" : "in");
            setError("");
          }}
          className="mt-6 py-1 text-sm text-stone underline underline-offset-4 hover:text-ink"
        >
          {mode === "in" ? "Create the first account" : "I already have an account"}
        </button>
      )}
    </div>
  );
}
