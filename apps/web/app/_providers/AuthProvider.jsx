"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

const TOKEN_KEY = "cb_token";
const REFRESH_KEY = "cb_refresh";

function parseJwt(token) {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

function loadClaims() {
  if (typeof window === "undefined") return { token: null, role: null, userId: null };
  const token = window.localStorage.getItem(TOKEN_KEY);
  if (!token) return { token: null, role: null, userId: null };
  const claims = parseJwt(token);
  return { token, role: claims?.role || null, userId: claims?.sub || null };
}

export function AuthProvider({ children }) {
  const [state, setState] = useState({ token: null, role: null, userId: null });
  const [ready, setReady] = useState(false);

  const syncFromStorage = useCallback(() => {
    setState(loadClaims());
  }, []);

  useEffect(() => {
    syncFromStorage();
    setReady(true);

    // Keep auth state in sync across tabs (localStorage change in another tab) and
    // within this tab when api.js silently refreshes the access token.
    const onStorage = (e) => {
      if (e.key === TOKEN_KEY || e.key === REFRESH_KEY) syncFromStorage();
    };
    const onRefreshed = () => syncFromStorage();
    const onCleared = () => setState({ token: null, role: null, userId: null });
    window.addEventListener("storage", onStorage);
    window.addEventListener("cb-auth-refreshed", onRefreshed);
    window.addEventListener("cb-auth-cleared", onCleared);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("cb-auth-refreshed", onRefreshed);
      window.removeEventListener("cb-auth-cleared", onCleared);
    };
  }, [syncFromStorage]);

  const login = useCallback((accessToken, refreshToken) => {
    window.localStorage.setItem(TOKEN_KEY, accessToken);
    if (refreshToken) window.localStorage.setItem(REFRESH_KEY, refreshToken);
    const claims = parseJwt(accessToken);
    setState({ token: accessToken, role: claims?.role || null, userId: claims?.sub || null });
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
    setState({ token: null, role: null, userId: null });
    window.dispatchEvent(new CustomEvent("cb-auth-cleared"));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token: state.token,
        role: state.role,
        userId: state.userId,
        ready,
        login,
        logout,
        isAuthenticated: Boolean(state.token),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
