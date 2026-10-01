import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthProvider } from "./features/auth/AuthContext";
import { CategoriesProvider } from "./features/categories/CategoriesContext";
import { TransactionUiProvider } from "./features/transactions/TransactionUi";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <CategoriesProvider>
          <TransactionUiProvider>
            <App />
          </TransactionUiProvider>
        </CategoriesProvider>
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
