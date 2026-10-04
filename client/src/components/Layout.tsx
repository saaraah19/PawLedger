import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { useTransactionUi } from "../features/transactions/TransactionUi";
import { Paw } from "./Paw";

const links = [
  ["/", "Home"],
  ["/history", "History"],
  ["/analyze", "Analyze"],
  ["/compare", "Compare"],
  ["/plan", "Plan"],
  ["/inventory", "Inventory"],
  ["/categories", "Categories"],
  ["/settings", "Settings"],
] as const;

function QuickActions({ className = "" }: { className?: string }) {
  const { openForm } = useTransactionUi();
  return (
    <div className={`gap-2 ${className}`}>
      <button onClick={() => openForm("expense")} className="rounded-sm border border-ink px-3 py-1.5 text-sm font-medium hover:bg-ink hover:text-paper">
        + Expense
      </button>
      <button onClick={() => openForm("income")} className="rounded-sm border border-ink px-3 py-1.5 text-sm font-medium hover:bg-ink hover:text-paper">
        + Income
      </button>
    </div>
  );
}

export function Layout() {
  const { signOut } = useAuth();
  return (
    <div className="mx-auto min-h-screen max-w-4xl px-5 pb-24 md:pb-10">
      <a href="#main" className="sr-only rounded-sm bg-ink px-3 py-2 text-sm text-paper focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50">Skip to content</a>
      <header className="flex items-center justify-between pt-6">
        <div className="flex items-center gap-2 text-moss">
          <Paw className="h-6 w-6" />
          <span className="font-display text-xl font-bold tracking-tight text-ink">PawLedger</span>
        </div>
        <QuickActions className="hidden md:flex" />
      </header>

      <nav aria-label="Main" className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-rule text-sm">
        {links.map(([to, label]) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `whitespace-nowrap border-b-2 py-1.5 ${isActive ? "border-moss font-semibold" : "border-transparent text-stone hover:text-ink"}`
            }
          >
            {label}
          </NavLink>
        ))}
        <button onClick={signOut} className="ml-auto whitespace-nowrap py-1.5 text-stone hover:text-ink">
          Sign out
        </button>
      </nav>

      <main id="main" tabIndex={-1} className="pt-10 outline-none">
        <Outlet />
      </main>

      <QuickActions className="fixed inset-x-0 bottom-0 flex border-t border-rule bg-paper p-3 md:hidden [&>button]:flex-1" />
    </div>
  );
}
