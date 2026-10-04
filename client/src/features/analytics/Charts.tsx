import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCompact, formatMoney } from "../../lib/money";
import { shortMonthLabel } from "./months";

// Palette mirrors the CSS theme (recharts wants literal colours).
const MOSS = "#4a6440";
const INK = "#1e2b26";
const RULE = "#c9cfc1";
const STONE = "#5a635b";

const axis = { fontSize: 12, fill: STONE };
const tooltipStyle = { background: "#eceFe6", border: `1px solid ${RULE}`, borderRadius: 2, fontSize: 13 };

/** Charts animate in by default; people who ask their system for less motion get them drawn at once. */
function useReducedMotion() {
  const query = "(prefers-reduced-motion: reduce)";
  const [reduced, setReduced] = useState(() => (typeof window.matchMedia === "function" ? window.matchMedia(query).matches : false));
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const m = window.matchMedia(query);
    const on = () => setReduced(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return reduced;
}

const spansYears = (months: string[]) => new Set(months.map((m) => m.slice(0, 4))).size > 1;

/** The same numbers as the chart, for screen readers. */
function DataTable({ caption, head, rows }: { caption: string; head: string[]; rows: string[][] }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead><tr>{head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
      <tbody>{rows.map((r) => <tr key={r[0]}>{r.map((c, i) => (i === 0 ? <th key={i} scope="row">{c}</th> : <td key={i}>{c}</td>))}</tr>)}</tbody>
    </table>
  );
}

export function IncomeSpendingChart({ months, currency }: {
  months: { month: string; income: number; expenses: number }[]; currency: string;
}) {
  const animate = !useReducedMotion();
  const showYear = spansYears(months.map((m) => m.month));
  const data = months.map((m) => ({ ...m, label: shortMonthLabel(m.month, showYear) }));
  return (
    <div>
      <div role="img" aria-label="Income and spending for each month in the selected period" className="h-64 w-full">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={RULE} strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={{ stroke: RULE }} interval="equidistantPreserveStart" minTickGap={14} />
            <YAxis tick={axis} tickLine={false} axisLine={false} width={44} tickFormatter={formatCompact} />
            <Tooltip cursor={{ fill: "rgba(74,100,64,0.08)" }} contentStyle={tooltipStyle} formatter={(v: number) => formatMoney(v, currency)} />
            <Legend iconType="square" wrapperStyle={{ fontSize: 13 }} />
            <Bar dataKey="income" name="Income" fill={MOSS} radius={[1, 1, 0, 0]} isAnimationActive={animate} />
            <Bar dataKey="expenses" name="Spent" fill={INK} radius={[1, 1, 0, 0]} isAnimationActive={animate} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <DataTable caption="Income and spending by month" head={["Month", "Income", "Spent"]}
        rows={months.map((m) => [m.month, formatMoney(m.income, currency), formatMoney(m.expenses, currency)])} />
    </div>
  );
}

export function CategoryTrendChart({ name, months, currency }: {
  name: string; months: { month: string; total: number }[]; currency: string;
}) {
  const animate = !useReducedMotion();
  const showYear = spansYears(months.map((m) => m.month));
  const data = months.map((m) => ({ ...m, label: shortMonthLabel(m.month, showYear) }));
  return (
    <div>
      <div role="img" aria-label={`Monthly spending on ${name} in the selected period`} className="h-56 w-full">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={RULE} strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={{ stroke: RULE }} interval="equidistantPreserveStart" minTickGap={14} />
            <YAxis tick={axis} tickLine={false} axisLine={false} width={44} tickFormatter={formatCompact} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatMoney(v, currency), name]} />
            <Line type="monotone" dataKey="total" stroke={MOSS} strokeWidth={2} dot={{ r: 3, fill: MOSS }} activeDot={{ r: 5 }} isAnimationActive={animate} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <DataTable caption={`Monthly spending on ${name}`} head={["Month", "Spent"]} rows={months.map((m) => [m.month, formatMoney(m.total, currency)])} />
    </div>
  );
}

/** What you held at each inventory: the total, and the part of it in savings. */
export function BalanceChart({ points, currency }: { points: { month: string; total: number; savings: number }[]; currency: string }) {
  const animate = !useReducedMotion();
  const showYear = spansYears(points.map((p) => p.month));
  const data = points.map((p) => ({ ...p, label: shortMonthLabel(p.month, showYear) }));
  return (
    <div>
      <div role="img" aria-label="What you held at each inventory, in total and in savings" className="h-56 w-full">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={RULE} strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={{ stroke: RULE }} interval={data.length <= 8 ? 0 : "equidistantPreserveStart"} minTickGap={14} />
            <YAxis tick={axis} tickLine={false} axisLine={false} width={48} tickFormatter={formatCompact} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatMoney(v, currency)} />
            <Legend iconType="square" wrapperStyle={{ fontSize: 13 }} />
            <Line type="monotone" dataKey="total" name="Total" stroke={INK} strokeWidth={2} dot={{ r: 3, fill: INK }} isAnimationActive={animate} />
            <Line type="monotone" dataKey="savings" name="Savings" stroke={MOSS} strokeWidth={2} dot={{ r: 3, fill: MOSS }} isAnimationActive={animate} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <DataTable caption="What you held at each inventory" head={["Start of", "Total", "Savings"]} rows={points.map((p) => [p.month, formatMoney(p.total, currency), formatMoney(p.savings, currency)])} />
    </div>
  );
}
