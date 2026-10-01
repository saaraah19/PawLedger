import { Component, ReactNode } from "react";

/** Last line of defence: an unexpected crash shows a calm page instead of a blank screen. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error("Unexpected error:", error instanceof Error ? error.message : error);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="mx-auto max-w-md px-5 pt-24">
        <h1 className="font-display text-3xl font-bold tracking-tight">Something went wrong.</h1>
        <p className="mt-3 leading-relaxed text-stone">
          The page hit an unexpected problem. Nothing you recorded has been lost or changed. Reloading usually fixes it.
        </p>
        <button onClick={() => window.location.reload()} className="mt-6 rounded-sm bg-moss px-4 py-2 text-sm font-medium text-white">
          Reload the page
        </button>
      </div>
    );
  }
}
