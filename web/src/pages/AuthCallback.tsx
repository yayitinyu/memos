import { timestampDate } from "@bufbuild/protobuf/wkt";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { setAccessToken } from "@/auth-state";
import Spinner from "@/components/Spinner";
import { authServiceClient, userServiceClient } from "@/connect";
import { useAuth } from "@/contexts/AuthContext";
import { identityProviderNamePrefix } from "@/helpers/resource-names";
import { absolutifyLink } from "@/helpers/utils";
import useNavigateTo from "@/hooks/useNavigateTo";
import { handleError } from "@/lib/error";
import { validateOAuthState } from "@/utils/oauth";

interface State {
  loading: boolean;
  errorMessage: string;
}

const AuthCallback = () => {
  const navigateTo = useNavigateTo();
  const { currentUser, initialize } = useAuth();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<State>({
    loading: true,
    errorMessage: "",
  });
  const processedRef = useRef(false);

  useEffect(() => {
    // Sign-in updates state and recreates navigateTo; without this guard the
    // effect would consume sessionStorage twice and show a false CSRF error.
    if (processedRef.current) {
      return;
    }

    // Check for OAuth error response first (e.g., user denied access)
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");
    const errorUri = searchParams.get("error_uri");

    if (error) {
      processedRef.current = true;
      // OAuth provider returned an error
      let errorMessage = `OAuth error: ${error}`;
      if (errorDescription) {
        errorMessage += `\n${decodeURIComponent(errorDescription)}`;
      }
      if (errorUri) {
        errorMessage += `\nMore info: ${errorUri}`;
      }

      setState({
        loading: false,
        errorMessage,
      });
      return;
    }

    const code = searchParams.get("code");
    const oauthState = searchParams.get("state");

    if (!code || !oauthState) {
      processedRef.current = true;
      setState({
        loading: false,
        errorMessage: "Failed to authorize. Missing authorization code or state parameter.",
      });
      return;
    }

    processedRef.current = true;

    // Validate OAuth state (CSRF protection) and retrieve PKCE code_verifier
    const validatedState = validateOAuthState(oauthState);
    if (!validatedState) {
      setState({
        loading: false,
        errorMessage: "Failed to authorize. Invalid or expired state parameter. This may indicate a CSRF attack attempt.",
      });
      return;
    }

    const { identityProviderId, flowMode, returnUrl, linkingUserName, codeVerifier } = validatedState;
    const redirectUri = absolutifyLink("/auth/callback");

    (async () => {
      try {
        if (flowMode === "link") {
          if (!currentUser?.name) {
            throw new Error("Failed to link account. Please sign in to Memos again and retry.");
          }
          if (linkingUserName && currentUser.name !== linkingUserName) {
            throw new Error("The signed-in user changed before the OAuth callback completed. Please retry linking from account settings.");
          }
          await userServiceClient.createLinkedIdentity({
            parent: currentUser.name,
            idpName: `${identityProviderNamePrefix}${identityProviderId}`,
            code,
            redirectUri,
            codeVerifier: codeVerifier || "",
          });
        } else {
          const response = await authServiceClient.signIn({
            credentials: {
              case: "ssoCredentials",
              value: {
                idpId: identityProviderId,
                code,
                redirectUri,
                codeVerifier: codeVerifier || "", // Pass PKCE code_verifier for token exchange
              },
            },
          });
          // Store access token from login response
          if (response.accessToken) {
            setAccessToken(response.accessToken, response.accessTokenExpiresAt ? timestampDate(response.accessTokenExpiresAt) : undefined);
          }
        }
        setState({
          loading: false,
          errorMessage: "",
        });
        await initialize();
        // Redirect to return URL if specified, otherwise home
        navigateTo(returnUrl || "/");
      } catch (error: unknown) {
        handleError(error, () => {}, {
          fallbackMessage: "Failed to authenticate.",
          onError: (err) => {
            const message = err instanceof Error ? err.message : "Failed to authenticate.";
            setState({
              loading: false,
              errorMessage: message,
            });
          },
        });
      }
    })();
  }, [currentUser?.name, searchParams, navigateTo, initialize]);

  return (
    <div className="p-4 py-24 w-full h-full flex justify-center items-center">
      {state.loading ? (
        <Spinner size="lg" />
      ) : (
        <div className="max-w-lg font-mono whitespace-pre-wrap opacity-80">{state.errorMessage}</div>
      )}
    </div>
  );
};

export default AuthCallback;
