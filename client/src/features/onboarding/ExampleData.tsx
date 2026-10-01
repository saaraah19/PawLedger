import { useEffect, useState } from "react";
import { Modal } from "../../components/Modal";
import { ApiError } from "../../lib/api";
import { useCategories } from "../categories/CategoriesContext";
import { useTransactionUi } from "../transactions/TransactionUi";
import { DemoStatus, getDemo, loadDemo, removeDemo } from "./api";

/** Loads and removes example data, and keeps every page in step afterwards. */
export function useExampleData() {
  const { refresh: refreshCategories } = useCategories();
  const { refresh: refreshPages, version } = useTransactionUi();
  const [status, setStatus] = useState<DemoStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getDemo().then(setStatus).catch(() => setStatus(null));
  }, [version]);

  async function run(fn: () => Promise<unknown>, failure: string) {
    if (busy) return false;
    setBusy(true);
    setError("");
    try {
      await fn();
      setStatus(await getDemo());
      await refreshCategories();
      refreshPages();
      return true;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : failure);
      return false;
    } finally {
      setBusy(false);
    }
  }

  return {
    status, busy, error,
    load: () => run(loadDemo, "We couldn't load the example data. Nothing has been changed."),
    remove: () => run(removeDemo, "We couldn't remove the example data. Nothing has been changed."),
  };
}

export function ConfirmRemoveExample({ onConfirm, onCancel, busy }: { onConfirm: () => void; onCancel: () => void; busy: boolean }) {
  return (
    <Modal title="Remove the example data?" onClose={onCancel}>
      <p className="text-sm leading-relaxed">
        This deletes the example entries and the example categories. Anything you have edited, or added under an example category, stays.
        Your own entries are never touched.
      </p>
      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onCancel} className="px-3 py-2 text-sm text-stone hover:text-ink">Keep exploring</button>
        <button onClick={onConfirm} disabled={busy} className="rounded-sm bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-60">
          {busy ? "Removing…" : "Remove example data"}
        </button>
      </div>
    </Modal>
  );
}

/** A reminder on Home while example data is loaded, so it can never be mistaken for real spending. */
export function ExampleBanner() {
  const { status, busy, error, remove } = useExampleData();
  const [confirm, setConfirm] = useState(false);
  if (!status?.loaded) return null;
  return (
    <div className="mt-6 border-l-2 border-ochre bg-white/40 py-3 pl-4 pr-3 text-sm" role="note">
      <p className="leading-relaxed">
        <strong className="font-semibold">You're looking at example data.</strong> None of it is real. Explore freely, then remove it when you're ready to record your own.
      </p>
      <button onClick={() => setConfirm(true)} className="mt-2 text-moss underline underline-offset-4">Remove example data</button>
      {error && <p role="alert" className="mt-2">{error}</p>}
      {confirm && <ConfirmRemoveExample busy={busy} onCancel={() => setConfirm(false)} onConfirm={async () => { if (await remove()) setConfirm(false); }} />}
    </div>
  );
}
