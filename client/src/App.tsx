import { lazy, Suspense } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Loading, Unavailable } from "./components/StatusScreens";
import { useAuth } from "./features/auth/AuthContext";
import { Categories } from "./pages/Categories";
import { Settings } from "./pages/Settings";
import { Welcome } from "./pages/Welcome";
import { Compare } from "./pages/Compare";
import { History } from "./pages/History";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { Plan } from "./pages/Plan";

const Analyze = lazy(() => import("./pages/Analyze").then((m) => ({ default: m.Analyze })));

const Inventory = lazy(() => import("./pages/Inventory").then((m) => ({ default: m.Inventory })));

function Protected() {
  const { user, loading, unavailable, retry } = useAuth();
  const { pathname } = useLocation();
  if (loading) return <Loading />;
  if (unavailable) return <Unavailable message={unavailable} onRetry={retry} />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.onboarded && pathname !== "/welcome") return <Navigate to="/welcome" replace />; // first sign-in: start with the welcome flow
  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protected />}>
        <Route path="welcome" element={<Welcome />} />
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="history" element={<History />} />
          <Route path="analyze" element={<Suspense fallback={<p className="text-stone">Opening Analyze…</p>}><Analyze /></Suspense>} />
          <Route path="compare" element={<Compare />} />
          <Route path="plan" element={<Plan />} />
          <Route path="inventory" element={<Suspense fallback={<p className="text-stone">Opening Inventory{"\u2026"}</p>}><Inventory /></Suspense>} />
          <Route path="categories" element={<Categories />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
