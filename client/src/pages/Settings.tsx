import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { ConfirmRemoveExample, useExampleData } from "../features/onboarding/ExampleData";
import { ApiError } from "../lib/api";
import { timezoneList } from "../lib/timezones";
import { useTitle } from "../lib/useTitle";

const CURRENCIES = ["DZD", "EUR", "USD", "GBP"];

export function Settings() {
  useTitle("Settings");
  const example = useExampleData();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const { user, updateSettings } = useAuth();
  const [currency, setCurrency] = useState(user?.currency ?? "DZD");
  const [timezone, setTimezone] = useState(user?.timezone ?? "Africa/Algiers");
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  if (!user) return null;
  const changed = currency !== user.currency || timezone !== user.timezone;
  const field = "mt-1 w-full max-w-sm rounded-sm border border-rule bg-white/60 px-3 py-2 outline-none focus:border-moss";

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || !changed) return;
    setBusy(true);
    setStatus("idle");
    try {
      await updateSettings(currency, timezone);
      setStatus("saved");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof ApiError ? err.message : "We couldn't save your settings. Nothing has been changed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">Settings</h1>
      <p className="mt-2 text-sm text-stone">Signed in as {user.email}</p>

      <form onSubmit={submit} className="mt-8 space-y-6">
        <label className="block text-sm font-medium">
          Currency
          <select className={field} value={currency} onChange={(e) => { setCurrency(e.target.value); setStatus("idle"); }}>
            {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <span className="mt-1 block max-w-sm text-xs font-normal leading-relaxed text-stone">
            This changes the label shown on every amount. It does not convert them: 8,500 DZD would become 8,500 EUR.
          </span>
        </label>

        <label className="block text-sm font-medium">
          Timezone
          <select className={field} value={timezone} onChange={(e) => { setTimezone(e.target.value); setStatus("idle"); }}>
            {timezoneList(user.timezone).map((z) => <option key={z}>{z}</option>)}
          </select>
          <span className="mt-1 block max-w-sm text-xs font-normal leading-relaxed text-stone">
            Decides which month counts as "this month" and what today's date is in the forms.
          </span>
        </label>

        {status === "error" && <p role="alert" className="border-l-2 border-ochre pl-3 text-sm">{message}</p>}
        {status === "saved" && <p role="status" className="text-sm text-moss">Saved.</p>}

        <button disabled={busy || !changed} className="rounded-sm bg-moss px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {busy ? "Saving…" : "Save settings"}
        </button>
      </form>

      <section className="mt-12 max-w-sm border-t border-rule pt-6">
        <h2 className="font-display text-xl font-bold tracking-tight">Example data</h2>
        <p className="mt-2 text-sm leading-relaxed text-stone">
          Five months of clearly marked example entries, for exploring the app. It can only be loaded before you have entries of your own, and it can be removed in one click.
        </p>
        {example.status?.loaded ? (
          <button onClick={() => setConfirmRemove(true)} className="mt-3 rounded-sm border border-ink px-3 py-1.5 text-sm font-medium hover:bg-ink hover:text-paper">Remove example data</button>
        ) : example.status?.canLoad ? (
          <button onClick={() => void example.load()} disabled={example.busy} className="mt-3 rounded-sm border border-ink px-3 py-1.5 text-sm font-medium hover:bg-ink hover:text-paper disabled:opacity-60">
            {example.busy ? "Loading\u2026" : "Load example data"}
          </button>
        ) : example.status ? (
          <p className="mt-3 text-sm">Not available: your ledger already has entries of its own.</p>
        ) : null}
        {example.error && <p role="alert" className="mt-3 border-l-2 border-ochre pl-3 text-sm">{example.error}</p>}
      </section>

      <section className="mt-10 max-w-sm border-t border-rule pt-6">
        <h2 className="font-display text-xl font-bold tracking-tight">Welcome tour</h2>
        <p className="mt-2 text-sm leading-relaxed text-stone">A short walk through what each part of the app is for.</p>
        <Link to="/welcome" className="mt-3 inline-block text-sm text-moss underline underline-offset-4">Replay the tour</Link>
      </section>

      {confirmRemove && (
        <ConfirmRemoveExample busy={example.busy} onCancel={() => setConfirmRemove(false)} onConfirm={async () => { if (await example.remove()) setConfirmRemove(false); }} />
      )}
    </>
  );
}
