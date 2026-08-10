// Access tokens deliberately stay in memory. Session persistence is provided by
// the HttpOnly refresh-token cookie, which is unavailable to injected scripts.
let accessToken: string | null = null;
let tokenExpiresAt: Date | null = null;

const LEGACY_TOKEN_KEYS = ["memos_access_token", "memos_token_expires_at"] as const;

const removeLegacyStoredTokens = (): void => {
  try {
    for (const key of LEGACY_TOKEN_KEYS) {
      localStorage.removeItem(key);
    }
  } catch {
    // Storage can be unavailable in hardened browser modes. The in-memory
    // token flow still works, so no action is required here.
  }
};

removeLegacyStoredTokens();

export const getAccessToken = (): string | null => accessToken;

export const setAccessToken = (token: string | null, expiresAt?: Date): void => {
  accessToken = token;
  tokenExpiresAt = expiresAt ?? null;
  removeLegacyStoredTokens();
};

export const isTokenExpired = (): boolean => {
  if (!accessToken || !tokenExpiresAt) return true;
  // Refresh slightly early so a token cannot expire while a request is in flight.
  return Date.now() >= tokenExpiresAt.getTime() - 30_000;
};

export const clearAccessToken = (): void => {
  accessToken = null;
  tokenExpiresAt = null;
  removeLegacyStoredTokens();
};
