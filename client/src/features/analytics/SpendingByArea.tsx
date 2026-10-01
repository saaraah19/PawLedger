import { formatMoney } from "../../lib/money";
import type { AreaRow } from "./api";

const purchases = (n: number) => `${n} ${n === 1 ? "purchase" : "purchases"}`;

function Bar({ share, muted }: { share: number; muted?: boolean }) {
  return (
    <div className="mt-1.5 h-1.5 w-full bg-rule" aria-hidden="true">
      <div className={muted ? "h-full bg-stone" : "h-full bg-moss"} style={{ width: `${Math.max(share, 1.5)}%` }} />
    </div>
  );
}

/** Where the month's spending went, largest first. Parents expand to show their sub-categories. */
export function SpendingByArea({ rows, total, currency }: { rows: AreaRow[]; total: number; currency: string }) {
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);

  const head = (name: string, amount: number, count: number) => (
    <>
      <span className="flex items-baseline justify-between gap-4">
        <span className="font-medium">{name}</span>
        <span className="shrink-0">{formatMoney(amount, currency)}</span>
      </span>
      <span className="mt-0.5 block text-sm text-stone">
        {purchases(count)}, {Math.round(pct(amount))}% of spending
      </span>
    </>
  );

  return (
    <ul className="divide-y divide-rule border-y border-rule">
      {rows.map((r) => (
        <li key={r.categoryId ?? "none"} className="py-3">
          {r.children.length > 0 ? (
            <details>
              <summary className="cursor-pointer list-none">
                {head(r.name, r.total, r.count)}
                <Bar share={pct(r.total)} />
              </summary>
              <ul className="mt-3 space-y-2 border-l border-rule pl-4 text-sm">
                {r.children.map((c) => (
                  <li key={c.categoryId} className="flex justify-between gap-4">
                    <span>{c.name} <span className="text-stone">({purchases(c.count)})</span></span>
                    <span>{formatMoney(c.total, currency)}</span>
                  </li>
                ))}
              </ul>
            </details>
          ) : (
            <div>
              {head(r.name, r.total, r.count)}
              <Bar share={pct(r.total)} muted={r.categoryId === null} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
