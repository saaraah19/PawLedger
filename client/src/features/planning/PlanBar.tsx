import { formatMoney } from "../../lib/money";

const SCALE = 1.5; // the track shows up to 150% of what was expected; the dark line is 100%

/**
 * Spending against what you expected. Past the line the bar turns dark, never red: it shows a fact, not a verdict.
 * For a running month a grey tick marks how far through the month you are.
 */
export function PlanBar({ label, expected, actual, currency, elapsedShare, strong }: {
  label: string; expected: number; actual: number; currency: string; elapsedShare?: number; strong?: boolean;
}) {
  const share = expected > 0 ? actual / expected : 0;
  const used = `${Math.round(share * 100)}% of what you expected`;
  const gone = elapsedShare !== undefined ? `, with ${Math.round(elapsedShare * 100)}% of the month gone` : "";
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <span className={strong ? "font-medium" : ""}>{label}</span>
        <span className="shrink-0">{formatMoney(actual, currency)} <span className="text-stone">of {formatMoney(expected, currency)}</span></span>
      </div>
      <div role="img" aria-label={`${label}: ${used}${gone}`} className="relative mt-1.5 h-2 w-full bg-rule">
        <div className={`h-full ${share > 1 ? "bg-ink" : "bg-moss"}`} style={{ width: `${Math.min(share / SCALE, 1) * 100}%` }} />
        <div className="absolute -bottom-1 -top-1 w-px bg-ink" style={{ left: `${100 / SCALE}%` }} />
        {elapsedShare !== undefined && <div className="absolute -top-0.5 h-3 w-0.5 bg-stone" style={{ left: `${(Math.min(elapsedShare, 1) * 100) / SCALE}%` }} />}
      </div>
      <p className="mt-1 text-sm text-stone">{used}{gone}</p>
    </div>
  );
}
