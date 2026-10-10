import { useEffect, useState } from "react";
import { loadingNote } from "../lib/wake";

/** The wait while the app finds out who is signed in. After a few seconds it says what a long wait usually means. */
export function Loading({ label = "Opening your ledger\u2026", hosted = import.meta.env.PROD }: { label?: string; hosted?: boolean }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const note = loadingNote(seconds, hosted);
  return (
    <div className="p-10 text-stone">
      <div role="status">
        <p>{label}</p>
        {note && (
          <>
            <p className="mt-4 font-medium text-ink">{note.title}</p>
            <p className="mt-1 max-w-md text-sm leading-relaxed">{note.detail}</p>
          </>
        )}
      </div>
      {note && hosted && (
        <p aria-hidden="true" className="mt-4 text-xs tabular-nums">
          Waiting {seconds} s
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
