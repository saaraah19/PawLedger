import { ReactNode, useEffect, useRef } from "react";

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="modal-title"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-sm border border-rule bg-paper p-6 text-ink backdrop:bg-ink/40 max-h-[90vh] overflow-y-auto"
    >
      <h2 id="modal-title" className="font-display text-2xl font-bold tracking-tight">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </dialog>
  );
}
