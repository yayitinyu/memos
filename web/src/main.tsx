import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { LoaderCircleIcon } from "lucide-react";
import React, { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "react-hot-toast";
import { RouterProvider } from "react-router-dom";
import "./i18n";
import "./index.css";
import { isTokenExpired } from "@/auth-state";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { InstanceProvider, useInstance } from "@/contexts/InstanceContext";
import { ViewProvider } from "@/contexts/ViewContext";
import { queryClient } from "@/lib/query-client";
import { useTranslate } from "@/utils/i18n";
import router from "./router";
import { applyLocaleEarly } from "./utils/i18n";
import { applyThemeEarly } from "./utils/theme";
import "leaflet/dist/leaflet.css";

// Apply theme and locale early to prevent flash
applyThemeEarly();
applyLocaleEarly();

// Inner component that initializes contexts
function AppInitializer({ children }: { children: React.ReactNode }) {
  const t = useTranslate();
  const { isInitialized: authInitialized, initialize: initAuth } = useAuth();
  const { isInitialized: instanceInitialized, initialize: initInstance } = useInstance();
  const initStartedRef = useRef(false);

  // Initialize on mount - run in parallel for better performance
  useEffect(() => {
    if (initStartedRef.current) return;
    initStartedRef.current = true;

    const init = async () => {
      await Promise.all([initInstance(), initAuth()]);
    };
    init();
  }, [initAuth, initInstance]);

  // Re-validate auth when page becomes visible after being hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && authInitialized && isTokenExpired()) {
        // Refresh only when needed; transient failures preserve the current user.
        initAuth();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [authInitialized, initAuth]);

  if (!authInitialized || !instanceInitialized) {
    return (
      <div className="min-h-svh w-full flex items-center justify-center text-muted-foreground" role="status">
        <LoaderCircleIcon className="mr-2 size-5 animate-spin" aria-hidden="true" />
        <span>{t("common.loading")}</span>
      </div>
    );
  }

  return <>{children}</>;
}

function Main() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <InstanceProvider>
          <AuthProvider>
            <ViewProvider>
              <AppInitializer>
                <RouterProvider router={router} />
                <Toaster position="top-right" />
              </AppInitializer>
            </ViewProvider>
          </AuthProvider>
        </InstanceProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const container = document.getElementById("root");
const root = createRoot(container as HTMLElement);
root.render(<Main />);
