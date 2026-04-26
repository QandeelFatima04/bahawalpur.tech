// Empty default = same-origin requests, proxied to the API container by Next.js rewrites
// (see next.config.mjs). Override with NEXT_PUBLIC_API_BASE for local dev outside docker.
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

const TOKEN_KEY = "cb_token";
const REFRESH_KEY = "cb_refresh";

function readStorage(key) {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeTokens(access, refresh) {
  if (typeof window === "undefined") return;
  if (access) window.localStorage.setItem(TOKEN_KEY, access);
  if (refresh) window.localStorage.setItem(REFRESH_KEY, refresh);
  window.dispatchEvent(new CustomEvent("cb-auth-refreshed"));
}

function clearTokens() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
  window.dispatchEvent(new CustomEvent("cb-auth-cleared"));
}

// Shared in-flight refresh promise — ensures a burst of 401s only triggers ONE refresh
// call, not one per request.
let refreshInFlight = null;

async function refreshTokens() {
  if (refreshInFlight) return refreshInFlight;
  const refreshToken = readStorage(REFRESH_KEY);
  if (!refreshToken) return null;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
        cache: "no-store",
      });
      if (!res.ok) {
        clearTokens();
        return null;
      }
      const data = await res.json();
      writeTokens(data.access_token, data.refresh_token);
      return data.access_token;
    } catch {
      clearTokens();
      return null;
    } finally {
      // Let the next 401 trigger a fresh refresh attempt
      setTimeout(() => {
        refreshInFlight = null;
      }, 0);
    }
  })();

  return refreshInFlight;
}

async function doFetch(path, options, token) {
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };
  const url = `${API_BASE}${path}`;
  const method = (options.method || "GET").toUpperCase();
  if (process.env.NODE_ENV !== "production") {
    console.debug(`[api] -> ${method} ${url}`);
  }
  const response = await fetch(url, { ...options, headers, cache: "no-store" });
  if (process.env.NODE_ENV !== "production") {
    console.debug(`[api] <- ${response.status} ${method} ${url}`);
  }
  return response;
}

export async function api(path, options = {}) {
  let token = options.token ?? readStorage(TOKEN_KEY);
  let response = await doFetch(path, options, token);

  // Silent refresh + retry once on 401 (expired access token)
  if (response.status === 401 && readStorage(REFRESH_KEY) && !options._retried) {
    const newAccess = await refreshTokens();
    if (newAccess) {
      response = await doFetch(path, { ...options, _retried: true }, newAccess);
    }
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const method = (options.method || "GET").toUpperCase();
    const url = `${API_BASE}${path}`;
    console.error(`[api] ${response.status} ${method} ${url}`, body);
    let message;
    if (response.status === 405) {
      message = `Server rejected ${method} ${path} (405). Check that the API container is reachable and the route accepts ${method}.`;
    } else if (typeof body.detail === "string") {
      message = body.detail;
    } else {
      message = body.detail?.message || `Request failed (${response.status})`;
    }
    const err = new Error(message);
    err.status = response.status;
    err.body = body;
    throw err;
  }
  return body;
}

export async function uploadFile(path, file, options = {}) {
  const sendUpload = async (tokenVal) => {
    const form = new FormData();
    form.append("file", file);
    return fetch(`${API_BASE}${path}`, {
      method: "POST",
      body: form,
      headers: tokenVal ? { Authorization: `Bearer ${tokenVal}` } : {},
      cache: "no-store",
    });
  };

  let token = options.token ?? readStorage(TOKEN_KEY);
  let response = await sendUpload(token);
  if (response.status === 401 && readStorage(REFRESH_KEY)) {
    const newAccess = await refreshTokens();
    if (newAccess) response = await sendUpload(newAccess);
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(body.detail || "Upload failed");
    err.status = response.status;
    throw err;
  }
  return body;
}
