import { ReactNode, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Paw } from "../components/Paw";
import { useAuth } from "../features/auth/AuthContext";
import { createCategory } from "../features/categories/api";
import { useCategories } from "../features/categories/CategoriesContext";
import { useExampleData } from "../features/onboarding/ExampleData";
import { alreadyExists, SUGGESTIONS, toCreate } from "../features/onboarding/suggestions";
import { useTransactionUi } from "../features/transactions/TransactionUi";
import { ApiError } from "../lib/api";
import { browserTimezone, timezoneList } from "../lib/timezones";
import { useTitle } from "../lib/useTitle";

const STEPS = ["Welcome", "The basics", "Categories", "Your first entries", "A quick tour"] as const;
const CURRENCIES = ["DZD", "EUR", "USD", "GBP"];
const field = "mt-1 w-full max-w-sm rounded-sm border border-rule bg-white/60 px-3 py-2 outline-none focus:border-moss";
const primary = "rounded-sm bg-moss px-4 py-2 text-sm font-medium text-white disabled:opacity-60";
const quiet = "px-3 py-2 text-sm text-stone hover:text-ink";

const TOUR: { to: string; name: string; question: string; what: string }[] = [
  { to: "/", name: "Home", question: "What is happening with my money right now?", what: "This month's income, spending and net, where it went, your largest purchases, and \u201cThings worth noticing\u201d. Step back through earlier months with the arrows." },
  { to: "/history", name: "History", question: "What exactly did I record?", what: "Every entry, newest first. Filter by income or expenses or by category, sort by amount, and edit or delete anything." },
  { to: "/analyze", name: "Analyze", question: "How has this changed over time?", what: "Income and spending month by month, spending by category and by type, one category over time, and the stores you use most." },
  { to: "/compare", name: "Compare", question: "What is different between two months?", what: "Set any two months (or two date ranges) side by side and see what moved, in plain sentences." },
  { to: "/plan", name: "Plan", question: "What do I expect of this month, and how is it going?", what: "At the start of a month, say how much you expect to spend, in total and by category. Then watch spending against it, with how far through the month you are." },
  { to: "/inventory", name: "Inventory", question: "Where is my money, and do my records add up?", what: "Once a month, count what you hold in cash, bank and savings. The app sets the change against what your entries explain, and tracks your savings." },
  { to: "/categories", name: "Categories", question: "How do I want to group my life?", what: "Create, nest, rename and archive categories. Archiving hides one from new entries but keeps your history intact." },
  { to: "/settings", name: "Settings", question: "How should amounts and dates be shown?", what: "Currency and timezone, the example data, and a way back to this tour." },
];

function Card({ title, done, children }: { title: string; done?: boolean; children: ReactNode }) {
  return (
    <section className={`border border-rule p-4 ${done ? "bg-white/50" : ""}`}>
      <h3 className="font-display text-lg font-bold tracking-tight">{title}{done && <span className="ml-2 text-sm font-normal text-moss">Done</span>}</h3>
      <div className="mt-2 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

export function Welcome() {
  useTitle("Welcome");
  const navigate = useNavigate();
  const { user, updateSettings, completeOnboarding } = useAuth();
  const { categories, refresh: refreshCategories } = useCategories();
  const { openForm, version } = useTransactionUi();
  const example = useExampleData();

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const startVersion = useRef(version);

  // basics
  const detected = browserTimezone();
  const [currency, setCurrency] = useState(user?.currency ?? "DZD");
  const [timezone, setTimezone] = useState(user?.onboarded ? user.timezone : detected ?? user?.timezone ?? "Africa/Algiers");

  // categories
  const key = (s: { kind: string; name: string }) => `${s.kind}:${s.name}`;
  const [picked, setPicked] = useState(() => new Set(SUGGESTIONS.filter((s) => s.preselected).map(key)));

  const recorded = version !== startVersion.current && !example.status?.loaded;

  useEffect(() => {
    headingRef.current?.focus();
    setError("");
  }, [step]);

  // Finishing the tour page (or leaving it through a link) must not bounce the person back here.
  useEffect(() => {
    if (step === STEPS.length - 1 && user && !user.onboarded) completeOnboarding().catch(() => undefined);
  }, [step]);

  const go = (n: number) => setStep(Math.max(0, Math.min(STEPS.length - 1, n)));

  async function leave() {
    if (user && !user.onboarded) await completeOnboarding().catch(() => undefined);
    navigate("/");
  }

  async function saveBasics() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (user && (currency !== user.currency || timezone !== user.timezone)) await updateSettings(currency, timezone);
      go(step + 1);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "We couldn't save these settings. Nothing has been changed.");
    } finally {
      setBusy(false);
    }
  }

  const chosen = SUGGESTIONS.filter((s) => picked.has(key(s)) && !alreadyExists(categories, s));
  async function saveCategories() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      for (const s of toCreate(categories, chosen)) await createCategory({ name: s.name, kind: s.kind });
      await refreshCategories();
      go(step + 1);
    } catch (e) {
      await refreshCategories();
      setError(e instanceof ApiError ? e.message : "We couldn't create every category. Nothing else has been changed.");
    } finally {
      setBusy(false);
    }
  }

  const nav = (next: ReactNode) => (
    <div className="mt-8 flex flex-wrap items-center gap-3">
      {step > 0 && <button onClick={() => go(step - 1)} className={quiet}>Back</button>}
      <div className="ml-auto flex flex-wrap items-center gap-3">{next}</div>
    </div>
  );
  const errorNote = error && <p role="alert" className="mt-4 border-l-2 border-ochre pl-3 text-sm">{error}</p>;

  return (
    <div className="mx-auto min-h-screen max-w-xl px-5 pb-16 pt-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-moss">
          <Paw className="h-6 w-6" />
          <span className="font-display text-xl font-bold tracking-tight text-ink">PawLedger</span>
        </div>
        <button onClick={leave} className="text-sm text-stone underline underline-offset-4 hover:text-ink">
          {user?.onboarded ? "Close tour" : "Skip setup"}
        </button>
      </header>

      <ol aria-label="Progress" className="mt-6 flex gap-1.5">
        {STEPS.map((name, i) => (
          <li key={name} aria-current={i === step ? "step" : undefined} className={`h-1 flex-1 ${i <= step ? "bg-moss" : "bg-rule"}`}>
            <span className="sr-only">{name}</span>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-sm text-stone">Step {step + 1} of {STEPS.length}</p>

      <h1 ref={headingRef} tabIndex={-1} className="mt-6 font-display text-3xl font-bold tracking-tight outline-none md:text-4xl">
        {step === 0 ? "Welcome to PawLedger." : STEPS[step]}
      </h1>

      {step === 0 && (
        <>
          <p className="mt-5 leading-relaxed">
            Think of a field journal kept by someone who studies one thing closely: where your money goes. You write down what happened.
            The journal never scolds you. Over time the entries add up to a trail you can read.
          </p>
          <ul className="mt-5 space-y-2 leading-relaxed">
            <li><strong className="font-semibold">Record</strong> income and spending in under a minute.</li>
            <li><strong className="font-semibold">See</strong> where money went, and how months differ.</li>
            <li><strong className="font-semibold">Notice</strong> patterns. It offers observations from your own data, never orders. No streaks, no badges, no shaming.</li>
          </ul>
          <p className="mt-5 text-sm text-stone">This takes about three minutes, and everything can be changed later.</p>
          {nav(<button onClick={() => go(1)} className={primary}>Set things up</button>)}
        </>
      )}

      {step === 1 && (
        <>
          <p className="mt-5 leading-relaxed">Two settings decide how amounts and dates are shown.</p>
          <label className="mt-5 block text-sm font-medium">
            Currency
            <select className={field} value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <span className="mt-1 block max-w-sm text-xs font-normal leading-relaxed text-stone">
              This is a label. Changing it later relabels your amounts; it never converts them.
            </span>
          </label>
          <label className="mt-5 block text-sm font-medium">
            Timezone
            <select className={field} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              {timezoneList(timezone).map((z) => <option key={z}>{z}</option>)}
            </select>
            <span className="mt-1 block max-w-sm text-xs font-normal leading-relaxed text-stone">
              {detected && detected === timezone ? `We picked ${detected} from your browser. ` : ""}It decides which month counts as "this month".
            </span>
          </label>
          {errorNote}
          {nav(<button onClick={saveBasics} disabled={busy} className={primary}>{busy ? "Saving\u2026" : "Save and continue"}</button>)}
        </>
      )}

      {step === 2 && (
        <>
          <p className="mt-5 leading-relaxed">
            Categories are how patterns become visible: "How much went to hiking?" needs a Hiking category. They are optional on every entry.
            Tick the ones that fit your life; you can rename, nest or archive any of them later.
          </p>
          {(["expense", "income"] as const).map((kind) => (
            <fieldset key={kind} className="mt-6">
              <legend className="text-sm font-medium">{kind === "expense" ? "Spending categories" : "Income categories"}</legend>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                {SUGGESTIONS.filter((s) => s.kind === kind).map((s) => {
                  const exists = alreadyExists(categories, s);
                  return (
                    <label key={s.name} className="flex items-center gap-2 py-1.5 text-sm">
                      <input type="checkbox" checked={exists || picked.has(key(s))} disabled={exists}
                        onChange={(e) => setPicked((p) => { const n = new Set(p); e.target.checked ? n.add(key(s)) : n.delete(key(s)); return n; })} />
                      <span>{s.name}{exists && <span className="ml-1 text-xs text-stone">(already added)</span>}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
          {errorNote}
          {nav(
            <>
              <button onClick={() => go(step + 1)} className={quiet}>Skip for now</button>
              <button onClick={saveCategories} disabled={busy} className={primary}>
                {busy ? "Creating\u2026" : chosen.length > 0 ? `Create ${chosen.length} ${chosen.length === 1 ? "category" : "categories"}` : "Continue"}
              </button>
            </>,
          )}
        </>
      )}

      {step === 3 && (
        <>
          <p className="mt-5 leading-relaxed">A ledger only becomes interesting once it has entries. Pick whichever suits you; you can do both, or neither.</p>
          <div className="mt-6 space-y-4">
            <Card title="Record something real" done={recorded}>
              <p>Log the last thing you bought. Only what and how much are required; store, category and notes are optional.</p>
              {recorded
                ? <p className="mt-2 text-moss">That is now the first line of your financial history.</p>
                : <button onClick={() => openForm("expense")} className="mt-3 rounded-sm border border-ink px-3 py-1.5 font-medium hover:bg-ink hover:text-paper">+ Add an expense</button>}
            </Card>
            <Card title="Explore with example data" done={example.status?.loaded}>
              <p>Loads five months of clearly marked example entries, so every page has something to show. Remove them in one click, any time; your own entries are never touched.</p>
              {example.status?.loaded ? (
                <p className="mt-2 text-moss">Loaded. A reminder stays on Home until you remove it.</p>
              ) : example.status && !example.status.canLoad ? (
                <p className="mt-2 text-stone">Your ledger already has entries, so example data isn't offered.</p>
              ) : (
                <button onClick={() => void example.load()} disabled={example.busy || !example.status} className="mt-3 rounded-sm border border-ink px-3 py-1.5 font-medium hover:bg-ink hover:text-paper disabled:opacity-60">
                  {example.busy ? "Loading\u2026" : "Load example data"}
                </button>
              )}
              {example.error && <p role="alert" className="mt-2 border-l-2 border-ochre pl-3">{example.error}</p>}
            </Card>
          </div>
          {nav(<button onClick={() => go(step + 1)} className={primary}>Continue to the tour</button>)}
        </>
      )}

      {step === 4 && (
        <>
          <p className="mt-5 leading-relaxed">Each part of the app answers one question. Open any of them now, or come back through Settings whenever you like.</p>
          <ul className="mt-6 divide-y divide-rule border-y border-rule">
            {TOUR.map((t) => (
              <li key={t.to} className="py-4">
                <p className="font-display text-lg font-bold tracking-tight">{t.name}</p>
                <p className="text-sm italic text-stone">{t.question}</p>
                <p className="mt-1 text-sm leading-relaxed">{t.what}</p>
                <Link to={t.to} className="mt-1 inline-block py-1 text-sm text-moss underline underline-offset-4">Open {t.name}</Link>
              </li>
            ))}
          </ul>
          <div className="mt-6 space-y-2 text-sm leading-relaxed">
            <p className="font-medium">Three habits that make it work</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Log entries when you buy things. One a day is plenty; the patterns appear on their own.</li>
              <li>Bought several things in one shop? Use <em>+ Add items</em> and the total adds itself.</li>
              <li>Give purchases a spending type when you can. It is what powers "necessity or impulse" observations later.</li>
            </ul>
          </div>
          {nav(<button onClick={leave} className={primary}>Start using PawLedger</button>)}
        </>
      )}
    </div>
  );
}
