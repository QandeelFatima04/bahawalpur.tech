"use client";
import { useCallback, useEffect, useState } from "react";

/**
 * useTabState — syncs a tab key with the `?tab=` URL query parameter so reloads
 * keep the user on the same tab. Falls back to `defaultKey` when no param is set.
 *
 * Lightweight: writes history.replaceState directly, no router import required.
 */
export function useTabState(defaultKey, { paramName = "tab" } = {}) {
  const initial = () => {
    if (typeof window === "undefined") return defaultKey;
    return new URLSearchParams(window.location.search).get(paramName) || defaultKey;
  };
  const [value, setValue] = useState(initial);

  useEffect(() => {
    // React to browser back/forward
    const onPop = () => {
      const next = new URLSearchParams(window.location.search).get(paramName) || defaultKey;
      setValue(next);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [defaultKey, paramName]);

  const update = useCallback(
    (next) => {
      setValue(next);
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      if (next && next !== defaultKey) params.set(paramName, next);
      else params.delete(paramName);
      const qs = params.toString();
      const href = window.location.pathname + (qs ? `?${qs}` : "");
      window.history.replaceState(null, "", href);
    },
    [defaultKey, paramName]
  );

  return [value, update];
}
