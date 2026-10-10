import { ApiError } from "./api";

/** How long the app keeps trying to wake a sleeping server before it says so. */
export const WAKE_GIVE_UP_MS = 150_000;
/** One request may be held by the host while the server starts; give it longer than a normal request. */
export const WAKE_REQUEST_MS = 45_000;

/** True for the failures a sleeping server produces: no answer, or a gateway saying the app isn't up yet. */
export function isWakingError(e: unknown): boolean {
  return e instanceof ApiError && (e.status === 0 || e.status === 502 || e.status === 503 || e.status === 504);
}

type RetryOptions = {
  giveUpMs?: number;
  pauseMs?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  cancelled?: () => boolean;
};

/** Runs `attempt`; while the server looks asleep, tries again, until `giveUpMs` has passed. Any other error is returned at once. */
export async function retryWhileWaking<T>(attempt: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const { giveUpMs = WAKE_GIVE_UP_MS, pauseMs = 2000, now = Date.now, sleep = (ms) => new Promise<void>((r) => setTimeout(r, ms)), cancelled = () => false } = opts;
  const start = now();
  for (;;) {
    try {
      return await attempt();
    } catch (e) {
      if (!isWakingError(e) || cancelled() || now() - start + pauseMs >= giveUpMs) throw e;
      await sleep(pauseMs);
    }
  }
}

/** What to say on the "can't reach the server" screen. A hosted server that never woke up needs different advice than a local one that isn't running. */
export function unavailableMessage(e: unknown, hosted: boolean): string {
  if (hosted && isWakingError(e)) {
    return "The server didn't wake up in time. On a free Render plan it can need a few minutes after a long sleep. Try again in a moment; if it keeps failing, open the service on Render and read its Logs tab.";
  }
  return e instanceof ApiError ? e.message : "The server isn't answering.";
}

/** The note shown under "Opening your ledger…" once the wait is no longer instant. */
export function loadingNote(seconds: number, hosted: boolean): { title: string; detail: string } | null {
  if (seconds < 6) return null;
  if (!hosted) {
    return { title: "Still trying.", detail: "If this keeps going, the server or the database may not be running. Check the terminal where you started PawLedger." };
  }
  if (seconds < 60) {
    return {
      title: "The server is waking up.",
      detail: "It goes to sleep when nobody has used it for a while, and starting again usually takes under a minute. Your records are safe, and this page will open by itself.",
    };
  }
  return {
    title: "Still waking up.",
    detail: "This is longer than usual, but the page keeps trying and will open by itself. Your records are safe.",
  };
}
