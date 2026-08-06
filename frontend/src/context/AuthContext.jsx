import { createContext, useCallback, useContext, useState } from "react";

import { adminMe } from "../services/adminService";

const AuthContext = createContext(null);

const TOKEN_KEY = "admin_token";
const USER_KEY = "admin_username";

/**
 * Admin authentication context.
 *
 * Stores the signed token in localStorage and exposes login / logout helpers.
 * ``checkAuth`` is used by route guards to validate a stored token.
 */
export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [username, setUsername] = useState(() => localStorage.getItem(USER_KEY));
  const [loading, setLoading] = useState(false);

  const login = useCallback((newToken, newUsername) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, newUsername);
    setToken(newToken);
    setUsername(newUsername);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUsername(null);
  }, []);

  // Validates the stored token against the backend. Returns true when valid.
  const checkAuth = useCallback(async () => {
    if (!token) return false;
    setLoading(true);
    try {
      await adminMe();
      return true;
    } catch {
      logout();
      return false;
    } finally {
      setLoading(false);
    }
  }, [token, logout]);

  const value = { token, username, isAuthenticated: Boolean(token), loading, login, logout, checkAuth };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
