import { createContext, ReactNode, useCallback, useContext, useState } from "react";
import { Modal } from "../../components/Modal";
import { Transaction, TxType } from "./api";
import { TransactionForm } from "./TransactionForm";

type Ctx = { openForm: (type: TxType, editing?: Transaction) => void; version: number; refresh: () => void };
const UiContext = createContext<Ctx | null>(null);

/** Owns the add/edit dialog so any page or the header can open it. `version` bumps after each save. */
export function TransactionUiProvider({ children }: { children: ReactNode }) {
  const [form, setForm] = useState<{ type: TxType; editing?: Transaction } | null>(null);
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const openForm = useCallback((type: TxType, editing?: Transaction) => setForm({ type, editing }), []);

  return (
    <UiContext.Provider value={{ openForm, version, refresh }}>
      {children}
      {form && (
        <Modal title={form.editing ? "Edit transaction" : form.type === "expense" ? "Add expense" : "Add income"} onClose={() => setForm(null)}>
          <TransactionForm
            type={form.type}
            editing={form.editing}
            onCancel={() => setForm(null)}
            onSaved={() => { setForm(null); setVersion((v) => v + 1); }}
          />
        </Modal>
      )}
    </UiContext.Provider>
  );
}

export function useTransactionUi() {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error("useTransactionUi must be used inside TransactionUiProvider");
  return ctx;
}
