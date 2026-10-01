import { formatMoney } from "../../lib/money";
import type { ComparedWith, Observation } from "./api";
import { monthLabel } from "./months";

const pct = (x: number) => `${Math.round(Math.abs(x) * 100)}%`;

/**
 * One factual sentence per observation. It reports what the recorded data shows, never why, and never
 * whether it is good or bad. `isCurrent` is true while the month is still running.
 */
export function describeObservation(o: Observation, ctx: { currency: string; month: string; isCurrent: boolean }): string {
  const money = (n: number) => formatMoney(n, ctx.currency);
  const when = ctx.isCurrent ? "this month" : `in ${monthLabel(ctx.month)}`;
  const against = (cw: ComparedWith) => (cw.partial ? "the same days of last month" : monthLabel(cw.month ?? cw.from.slice(0, 7)));

  switch (o.kind) {
    case "spending_change":
      return `Your spending ${o.change > 0 ? "increased" : "decreased"} by ${money(Math.abs(o.change))} (${pct(o.changePct)}) compared with ${against(o.comparedWith)}.`;

    case "unusual_high": {
      const lead = ctx.isCurrent ? "Your spending this month is already" : `Your spending in ${monthLabel(ctx.month)} was`;
      return `${lead} ${o.ratio.toFixed(1)} times your usual month: ${money(o.total)} against an average of ${money(Math.round(o.average / 100) * 100)} over the ${o.months} previous months that had spending.`;
    }

    case "highest_month":
      return ctx.isCurrent
        ? `${monthLabel(o.month)} is currently your highest-spending month of ${o.year}: ${money(o.total)}.`
        : `${monthLabel(o.month)} was your highest-spending month of ${o.year} up to then: ${money(o.total)}.`;

    case "category_increase":
      return o.previous > 0
        ? `${o.name} spending increased by ${money(o.change)} (${pct(o.changePct ?? 0)}) compared with ${against(o.comparedWith)}.`
        : `${o.name} spending was ${money(o.current)} ${when}, with nothing recorded in ${against(o.comparedWith)}.`;

    case "largest_share":
      return `Your three largest purchases represent ${pct(o.share)} of your total spending ${when}.`;

    case "spending_types": {
      const impulse = o.impulse > 0 ? ` Impulse / unplanned purchases were ${money(o.impulse)} of the optional spending.` : "";
      return o.optional > o.necessity
        ? `Among purchases with a spending type, you spent more on optional ones than on necessities ${when}: ${money(o.optional)} against ${money(o.necessity)}.${impulse}`
        : `Among purchases with a spending type, necessities were the larger part ${when}: ${money(o.necessity)} against ${money(o.optional)} for optional purchases.${impulse}`;
    }

    case "category_count":
      return `You made ${o.count} purchases in ${o.name} ${when}, ${money(o.total)} in all.`;
  }
}
