// Access token storage using localStorage for persistence across browser sessions
// localStorage persists until explicitly cleared, keeping users logged in
let accessToken: string | null = null;
let tokenExpiresAt: Date | null = null;

const TOKEN_KEY = "memos_access_token";
const EXPIRES_KEY = "memos_token_expires_at";

export const getAccessToken = (): string | null => {
  // If not in memory, try to restore from localStorage
  if (!accessToken) {
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedExpires = localStorage.getItem(EXPIRES_KEY);

      if (storedToken && storedExpires) {
        const expiresAt = new Date(storedExpires);
        // Only restore if token hasn't expired
        if (expiresAt > new Date()) {
          accessToken = storedToken;
          tokenExpiresAt = expiresAt;
        } else {
          // Token expired, clean up localStorage
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(EXPIRES_KEY);
        }
      }
    } catch (e) {
      // localStorage might not be available (e.g., in some privacy modes)
      console.warn("Failed to access localStorage:", e);
    }
  }
  return accessToken;
};

export const setAccessToken = (token: string | null, expiresAt?: Date): void => {
  accessToken = token;
  tokenExpiresAt = expiresAt || null;

  try {
    if (token && expiresAt) {
      // Store in localStorage for persistence across browser sessions
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(EXPIRES_KEY, expiresAt.toISOString());
    } else {
      // Clear localStorage if token is being cleared
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(EXPIRES_KEY);
    }
  } catch (e) {
    // localStorage might not be available (e.g., in some privacy modes)
    console.warn("Failed to write to localStorage:", e);
  }
};

export const isTokenExpired = (): boolean => {
  if (!tokenExpiresAt) return true;
  // Consider expired 30 seconds before actual expiry for safety
  return new Date() >= new Date(tokenExpiresAt.getTime() - 30000);
};

export const clearAccessToken = (): void => {
  accessToken = null;
  tokenExpiresAt = null;

  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRES_KEY);
  } catch (e) {
    console.warn("Failed to clear localStorage:", e);
  }
};

