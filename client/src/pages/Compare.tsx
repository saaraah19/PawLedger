import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../features/auth/AuthContext";
import { Comparison, Delta, getComparison, PeriodInfo, PeriodSel } from "../features/analytics/api";
import { describeChange, formatPct, periodLabel } from "../features/analytics/compare";
import { monthLabel, monthsBetween, shiftMonth } from "../features/analytics/months";
import { useTransactionUi } from "../features/transactions/TransactionUi";
import { ApiError } from "../lib/api";
import { useTitle } from "../lib/useTitle";
import { formatAmount, formatSigned } from "../lib/money";

type Mode = "months" | "custom";
type Sel = { month?: string; from?: string; to?: string };

const toSel = (s: Sel): PeriodSel | undefined => (s.month ? { month: s.month } : s.from && s.to ? { from: s.from, to: s.to } : undefined);
const fromInfo = (p: PeriodInfo): Sel => (p.month ? { month: p.month } : { from: p.from, to: p.to });
const valid = (s: Sel | null) => !s || Boolean(s.month) || Boolean(s.from && s.to && s.from <= s.to);

const field = "rounded-sm border border-rule bg-white/60 px-2 py-1.5 text-sm outline-none focus:border-moss";

function PeriodPicker({ label, sel, mode, months, onChange }: {
  label: string; sel: Sel; mode: Mode; months: string[]; onChange: (s: Sel) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">{label}</legend>
      {mode === "months" ? (
        <select aria-label={label} className={`${field} mt-1 w-full`} value={sel.month ?? ""} onChange={(e) => onChange({ month: e.target.value })}>
          {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
      ) : (
        <div className="mt-1 flex items-center gap-2">
          <input aria-label={`${label}, from`} type="date" className={`${field} min-w-0 flex-1`} value={sel.from ?? ""} onChange={(e) => onChange({ from: e.target.value, to: sel.to })} />
          <span className="text-sm text-stone">to</span>
          <input aria-label={`${label}, to`} type="date" className={`${field} min-w-0 flex-1`} value={sel.to ?? ""} onChange={(e) => onChange({ from: sel.from, to: e.target.value })} />
        </div>
      )}
    </fieldset>
  );
}

function Row({ name, d, indent, muted }: { name: string; d: Delta; indent?: boolean; muted?: boolean }) {
  const pct = formatPct(d);
  return (
    <tr className="border-b border-rule align-top last:border-0">
      <th scope="row" className={`py-2.5 pr-2 text-left ${indent ? "pl-4 font-normal text-stone" : "font-medium"} ${muted ? "text-stone" : ""}`}>{name}</th>
      <td className="py-2.5 pl-2 text-right">{formatAmount(d.a.total)}</td>
      <td className="py-2.5 pl-2 text-right">{formatAmount(d.b.total)}</td>
      <td className="py-2.5 pl-2 text-right">
        {formatSigned(d.change)}
        {pct && <span className="block text-xs text-stone">{pct}</span>}
      </td>
    </tr>
  );
}

function Table({ caption, labels, children }: { caption: string; labels: [string, string]; children: React.ReactNode }) {
  return (
    <table className="mt-3 w-full text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="border-y border-rule text-stone">
          <th scope="col" className="py-2 pr-2 text-left font-normal"><span className="sr-only">Item</span></th>
          <th scope="col" className="py-2 pl-2 text-right font-normal">{labels[0]}</th>
          <th scope="col" className="py-2 pl-2 text-right font-normal">{labels[1]}</th>
          <th scope="col" className="py-2 pl-2 text-right font-normal">Change</th>
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

export function Compare() {
  useTitle("Compare");
  const { user } = useAuth();
  const { version } = useTransactionUi();
  const currency = user?.currency ?? "DZD";

  const [mode, setMode] = useState<Mode>("months");
  const [selA, setSelA] = useState<Sel | null>(null); // null until the server has told us the defaults
  const [selB, setSelB] = useState<Sel | null>(null);
  const [data, setData] = useState<Comparison | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const skipNext = useRef(false);

  useEffect(() => {
    if (skipNext.current) { skipNext.current = false; return; } // the selections just came from this very response
    if (!valid(selA) || !valid(selB)) return;
    let live = true;
    setError("");
    getComparison(selA ? toSel(selA) : undefined, selB ? toSel(selB) : undefined)
      .then((d) => {
        if (!live) return;
        setData(d);
        if (!selA || !selB) {
          skipNext.current = true;
          setSelA(fromInfo(d.a));
          setSelB(fromInfo(d.b));
        }
      })
      .catch((e) => live && setError(e instanceof ApiError ? e.message : "We couldn't load this comparison."));
    return () => { live = false; };
  }, [JSON.stringify([selA, selB]), version, retry]);

  const months = useMemo(() => {
    if (!data) return [];
    const cur = data.currentMonth;
    const starts = [data.firstMonth ?? cur, selA?.month, selB?.month].filter((x): x is string => Boolean(x));
    return monthsBetween(starts.reduce((m, x) => (x < m ? x : m)), cur).reverse();
  }, [data?.firstMonth, data?.currentMonth, selA?.month, selB?.month]);

  function switchMode(next: Mode) {
    if (!data || next === mode) return;
    setMode(next);
    if (next === "custom") {
      setSelA({ from: data.a.from, to: data.a.to });
      setSelB({ from: data.b.from, to: data.b.to });
    } else {
      setSelA({ month: data.a.month ?? shiftMonth(data.currentMonth, -1) });
      setSelB({ month: data.b.month ?? data.currentMonth });
    }
  }

  const modeBtn = (m: Mode, text: string) => (
    <button aria-pressed={mode === m} onClick={() => switchMode(m)} disabled={!data}
      className={`rounded-sm border px-3 py-1 text-sm ${mode === m ? "border-moss bg-moss text-white" : "border-rule text-stone hover:text-ink"}`}>
      {text}
    </button>
  );

  const bad = !valid(selA) || !valid(selB);
  const labelA = data ? periodLabel(data.a) : "";
  const labelB = data ? periodLabel(data.b) : "";
  const same = data && data.a.from === data.b.from && data.a.to === data.b.to;
  const bothEmpty = data && data.a.transactionCount === 0 && data.b.transactionCount === 0;

  const sentences = data
    ? [
        ...([["Income", data.income], ["Spending", data.expenses]] as const)
          .filter(([, d]) => d.a.total > 0 || d.b.total > 0)
          .map(([noun, d]) => describeChange(noun, d, currency)),
        ...data.categories
          .filter((c) => c.change !== 0)
          .slice(0, 5)
          .map((c) => describeChange(`${c.categoryId === null ? "Uncategorised" : c.name} spending`, c, currency)),
      ]
    : [];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-3xl font-bold tracking-tight">Compare</h1>
        <div className="flex gap-2" role="group" aria-label="How to choose periods">
          {modeBtn("months", "Months")}
          {modeBtn("custom", "Custom dates")}
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-8 border-l-2 border-ochre pl-3 text-sm">
          {error} <button onClick={() => setRetry((n) => n + 1)} className="underline underline-offset-4">Try again</button>
        </p>
      )}
      {!data && !error && <p className="mt-8 text-stone">Setting the months side by side…</p>}

      {data && data.firstMonth === null && (
        <p className="mt-8 max-w-md leading-relaxed text-stone">
          There isn't enough history here yet. Keep recording normally; comparisons become useful once you have more than one period to set side by side.
        </p>
      )}

      {data && data.firstMonth !== null && selA && selB && (
        <>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <PeriodPicker label="First period" sel={selA} mode={mode} months={months} onChange={setSelA} />
            <PeriodPicker label="Second period" sel={selB} mode={mode} months={months} onChange={setSelB} />
          </div>
          <button onClick={() => { setSelA(selB); setSelB(selA); }} className="mt-3 text-sm text-moss underline underline-offset-4">Swap periods</button>

          {bad && <p role="alert" className="mt-4 border-l-2 border-ochre pl-3 text-sm">Each custom period needs a start date that is on or before its end date.</p>}
          {same && <p className="mt-4 text-sm text-stone">These are the same period, so nothing differs between them.</p>}
          {bothEmpty && <p className="mt-6 max-w-md leading-relaxed text-stone">Nothing recorded in either period.</p>}

          {!bothEmpty && (
            <div className={`mt-8 space-y-10 ${error || bad ? "opacity-60" : ""}`}>
              <section>
                <h2 className="font-display text-xl font-bold tracking-tight">What changed</h2>
                <ul className="mt-3 list-disc space-y-1.5 pl-5 leading-relaxed">
                  {sentences.map((s) => <li key={s}>{s}</li>)}
                </ul>
                <p className="mt-3 text-sm text-stone">Changes are the second period minus the first. Amounts are in {currency}.</p>
              </section>

              <section>
                <h2 className="font-display text-xl font-bold tracking-tight">Money in and out</h2>
                <Table caption="Income, spending and net for each period" labels={[labelA, labelB]}>
                  <Row name="Income" d={data.income} />
                  <Row name="Spent" d={data.expenses} />
                  <tr className="align-top">
                    <th scope="row" className="py-2.5 pr-2 text-left font-medium">Net</th>
                    <td className="py-2.5 pl-2 text-right">{formatSigned(data.net.a)}</td>
                    <td className="py-2.5 pl-2 text-right">{formatSigned(data.net.b)}</td>
                    <td className="py-2.5 pl-2 text-right">{formatSigned(data.net.change)}</td>
                  </tr>
                </Table>
              </section>

              {data.categories.length > 0 && (
                <section>
                  <h2 className="font-display text-xl font-bold tracking-tight">Spending by category</h2>
                  <p className="mt-1 text-sm text-stone">Largest movement first, up or down.</p>
                  <Table caption="Spending by category for each period" labels={[labelA, labelB]}>
                    {data.categories.flatMap((c) => [
                      <Row key={c.categoryId ?? "none"} name={c.name} d={c} muted={c.categoryId === null} />,
                      ...c.children.map((k) => <Row key={k.categoryId} name={k.name} d={k} indent />),
                    ])}
                  </Table>
                </section>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}
