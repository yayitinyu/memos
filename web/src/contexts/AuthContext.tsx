import { Code, ConnectError } from "@connectrpc/connect";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { clearAccessToken, getAccessToken, isTokenExpired } from "@/auth-state";
import { authServiceClient, isDefinitiveAuthFailure, refreshAccessToken, shortcutServiceClient, userServiceClient } from "@/connect";
import { userKeys } from "@/hooks/useUserQueries";
import type { Shortcut } from "@/types/proto/api/v1/shortcut_service_pb";
import type { User, UserSetting_GeneralSetting, UserSetting_WebhooksSetting } from "@/types/proto/api/v1/user_service_pb";
import { redirectOnAuthFailure } from "@/utils/auth-redirect";

interface AuthState {
  currentUser: User | undefined;
  userGeneralSetting: UserSetting_GeneralSetting | undefined;
  userWebhooksSetting: UserSetting_WebhooksSetting | undefined;
  shortcuts: Shortcut[];
  isInitialized: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  initialize: () => Promise<void>;
  logout: () => Promise<void>;
  refetchSettings: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const signedOutState: AuthState = {
  currentUser: undefined,
  userGeneralSetting: undefined,
  userWebhooksSetting: undefined,
  shortcuts: [],
  isInitialized: true,
  isLoading: false,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({
    currentUser: undefined,
    userGeneralSetting: undefined,
    userWebhooksSetting: undefined,
    shortcuts: [],
    isInitialized: false,
    isLoading: true,
  });

  const fetchUserSettings = useCallback(async (userName: string) => {
    const [{ settings }, { shortcuts }] = await Promise.all([
      userServiceClient.listUserSettings({ parent: userName }),
      shortcutServiceClient.listShortcuts({ parent: userName }),
    ]);

    const generalSetting = settings.find((s) => s.value.case === "generalSetting");
    const webhooksSetting = settings.find((s) => s.value.case === "webhooksSetting");

    return {
      userGeneralSetting: generalSetting?.value.case === "generalSetting" ? generalSetting.value.value : undefined,
      userWebhooksSetting: webhooksSetting?.value.case === "webhooksSetting" ? webhooksSetting.value.value : undefined,
      shortcuts,
    };
  }, []);

  const initialize = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      if (!getAccessToken() || isTokenExpired()) {
        try {
          await refreshAccessToken();
        } catch (error) {
          // No refresh cookie is the normal anonymous-user path.
          if (error instanceof ConnectError && error.code === Code.Unauthenticated) {
            clearAccessToken();
            setState(signedOutState);
            redirectOnAuthFailure();
            return;
          }
          throw error;
        }
      }

      const { user: currentUser } = await authServiceClient.getCurrentUser({});

      if (!currentUser) {
        clearAccessToken();
        setState(signedOutState);
        return;
      }

      const settings = await fetchUserSettings(currentUser.name);

      setState({
        currentUser,
        ...settings,
        isInitialized: true,
        isLoading: false,
      });

      // Pre-populate React Query cache
      queryClient.setQueryData(userKeys.currentUser(), currentUser);
      queryClient.setQueryData(userKeys.detail(currentUser.name), currentUser);
    } catch (error) {
      if (isDefinitiveAuthFailure(error)) {
        clearAccessToken();
        setState(signedOutState);
        redirectOnAuthFailure();
      } else {
        // A transient network failure must not turn a valid local session into
        // a signed-out state. Visibility changes will retry initialization.
        console.warn("Failed to refresh the current session:", error);
        setState((prev) => ({ ...prev, isInitialized: true, isLoading: false }));
      }
    }
  }, [fetchUserSettings, queryClient]);

  const logout = useCallback(async () => {
    try {
      await authServiceClient.signOut({});
    } catch (error) {
      console.error("[AuthContext] Failed to sign out:", error);
    } finally {
      clearAccessToken();
      setState(signedOutState);
      queryClient.clear();
    }
  }, [queryClient]);

  const refetchSettings = useCallback(async () => {
    // Use functional setState to get current user without including state in dependencies
    setState((prev) => {
      if (!prev.currentUser) return prev;

      // Fetch settings asynchronously
      fetchUserSettings(prev.currentUser.name).then((settings) => {
        setState((current) => ({ ...current, ...settings }));
      });

      return prev;
    });
  }, [fetchUserSettings]);

  // Memoize context value to prevent unnecessary re-renders of consumers
  const value = useMemo(
    () => ({
      ...state,
      initialize,
      logout,
      refetchSettings,
    }),
    [state, initialize, logout, refetchSettings],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

// Convenience hook for just the current user
export function useCurrentUserFromAuth() {
  const { currentUser } = useAuth();
  return currentUser;
}
