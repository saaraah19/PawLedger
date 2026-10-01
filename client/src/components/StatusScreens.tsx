import { useEffect, useState } from "react";

/** The wait while the app finds out who is signed in. After a few seconds it says what a long wait usually means. */
export function Loading({ label = "Opening your ledger\u2026" }: { label?: string }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 6000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div role="status" className="p-10 text-stone">
      <p>{label}</p>
      {slow && (
        <p className="mt-3 max-w-md text-sm leading-relaxed">
          Still trying. If this keeps going, the server or the database may not be running. Check the terminal where you started PawLedger.
        </p>
      )}
    </div>
  );
}

/** Shown instead of a blank page or a misleading sign-in screen when the server can't be reached. */
export function Unavailable({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-md px-5 pt-24">
      <h1 className="font-display text-3xl font-bold tracking-tight">Can't reach the server.</h1>
      <p className="mt-3 leading-relaxed">{message}</p>
      <p className="mt-3 text-sm leading-relaxed text-stone">Your records are safe. Once the cause is fixed, try again.</p>
      <button onClick={onRetry} className="mt-6 rounded-sm bg-moss px-4 py-2 text-sm font-medium text-white">Try again</button>
    </div>
  );
}
