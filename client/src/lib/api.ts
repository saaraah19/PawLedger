const BASE = import.meta.env.VITE_API_URL || "/api";
const TIMEOUT_MS = 20_000;

let onUnauthorized: (() => void) | null = null;
/** Called when a signed-in request is rejected with 401 (an expired session), so the app can return to sign-in. */
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn;
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown; timeoutMs?: number } = {},
): Promise<T> {
  // Never wait forever: a request that gets no answer fails with a message that says what to check.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method: opts.method ?? "GET",
      credentials: "include",
      headers: opts.body ? { "Content-Type": "application/json" } : undefined,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    throw new ApiError(
      0,
      (e as Error)?.name === "AbortError"
        ? "The server is taking too long to answer. Check that PawLedger is still running in your terminal and that the database is reachable (npm run doctor)."
        : "Can't reach the server. Check that PawLedger is still running in your terminal, and your internet connection.",
    );
  } finally {
    clearTimeout(timer);
  }
  const data = res.status === 204 ? {} : await res.json().catch(() => ({}));
  if (res.status === 401 && !path.startsWith("/auth/")) onUnauthorized?.();
  if (!res.ok) {
    // A 5xx with no message of ours comes from something in between (the dev proxy, a gateway): the server isn't there.
    const fallback = res.status >= 500
      ? "The server isn't answering properly. Check that PawLedger is still running in your terminal, then try again."
      : "Something went wrong. Your data has not been changed.";
    throw new ApiError(res.status, (data as { message?: string }).message ?? fallback);
  }
  return data as T;
}
