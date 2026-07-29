import axios from "axios";
import type { UserRole } from "@/lib/auth";
import { getStoredIdentity } from "@/lib/auth";
import { extractErrorCode, extractErrorMessage } from "@/lib/error-utils";
import { sendClientLog } from "@/lib/client-telemetry";
import { API_BASE_URL } from "@/lib/config";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

function createRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function setHeader(
  headers: unknown,
  key: string,
  value: string,
): Record<string, unknown> | undefined {
  if (headers && typeof (headers as { set?: unknown }).set === "function") {
    (headers as { set: (k: string, v: string) => void }).set(key, value);
    return undefined;
  }
  return { ...((headers as Record<string, unknown>) ?? {}), [key]: value };
}

function hasHeader(headers: unknown, key: string): boolean {
  if (headers && typeof (headers as { has?: unknown }).has === "function") {
    return (headers as { has: (k: string) => boolean }).has(key);
  }
  if (!headers || typeof headers !== "object") return false;
  const lower = key.toLowerCase();
  return Object.keys(headers as Record<string, unknown>).some(
    (h) => h.toLowerCase() === lower,
  );
}

function reportApiFailure(error: any): void {
  if (typeof window === "undefined") return;
  const config = error?.config;
  const response = error?.response;
  const requestId =
    response?.data?.requestId ||
    response?.headers?.["x-request-id"] ||
    config?.headers?.["X-Request-Id"] ||
    config?.headers?.["x-request-id"];

  sendClientLog({
    level: "error",
    event: "api_failure",
    message: extractErrorMessage(error, "API request failed"),
    method: config?.method?.toUpperCase(),
    url: config?.url,
    statusCode: response?.status,
    requestId,
    context: {
      code: extractErrorCode(error),
      baseURL: config?.baseURL,
    },
  });
}

/** Session teardown must not recurse: 401s from login/logout are terminal. */
function isAuthFlowRequest(url: string | undefined): boolean {
  if (!url) return false;
  return (
    url.includes("/auth/login") ||
    url.includes("/auth/logout") ||
    url === "/ci/logout" ||
    url.startsWith("/ci/login")
  );
}

function parseStoredRole(): UserRole | "" {
  const identity = getStoredIdentity();
  if (!identity) return "";
  const validRoles: UserRole[] = ["admin", "franchisee", "franchise"];
  return validRoles.includes(identity.role) ? identity.role : "";
}

type Portal = "franchisee" | "ci" | "admin";

/** When `user` is missing or corrupt, infer portal from the current route. */
function inferPortalFromPath(): Portal {
  if (typeof window === "undefined") return "admin";
  const p = window.location.pathname;
  if (p.startsWith("/franchisee")) return "franchisee";
  if (p.startsWith("/ci")) return "ci";
  return "admin";
}

function getPortal(role: UserRole | ""): Portal {
  if (role === "franchisee" || role === "franchise") return "franchisee";
  if (role === "admin") return "admin";
  return inferPortalFromPath();
}

function loginPathForSession(role: UserRole | ""): string {
  const portal = getPortal(role);
  if (portal === "franchisee") return "/login";
  if (portal === "ci") return "/ci/login";
  return "/admin-login";
}

/** JSON default breaks multipart: server must see multipart + boundary so multer can parse files. */
api.interceptors.request.use((config) => {
  if (!hasHeader(config.headers, "X-Request-Id")) {
    const headers = setHeader(config.headers, "X-Request-Id", createRequestId());
    if (headers) config.headers = headers as typeof config.headers;
  }

  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    const h = config.headers;
    if (h && typeof (h as { delete?: (k: string) => void }).delete === "function") {
      (h as { delete: (k: string) => void }).delete("Content-Type");
    } else if (h && typeof h === "object") {
      delete (h as Record<string, unknown>)["Content-Type"];
      delete (h as Record<string, unknown>)["content-type"];
    }
  }
  return config;
});

// Set to true while the user has explicitly initiated logout so the dead-session
// teardown doesn't fire mid-flight and cancel the deliberate logout flow.
let userLogoutInProgress = false;
export function markLogoutStart(): void { userLogoutInProgress = true; }
export function markLogoutEnd(): void   { userLogoutInProgress = false; }

// De-duplicates concurrent 401s (parallel queries all failing at once) into a
// single teardown + redirect.
let sessionTeardownInProgress = false;

/**
 * A 401 is terminal now — sessions are server-side records with a sliding idle
 * window; there is no refresh token to retry with. The session is dead but the
 * httpOnly cookies may still sit in the browser (JS cannot clear them), which
 * used to strand users in a blank-screen redirect loop. Teardown:
 *  1. POST the portal's logout — public + idempotent, clears cookies server-side;
 *  2. clear client state (identity, scope store, query cache);
 *  3. hard-navigate to the login page with ?stale=1 so proxy.ts deletes any
 *     surviving cookie at the edge instead of bouncing back into the portal.
 */
async function teardownDeadSession(): Promise<void> {
  const role = parseStoredRole();
  const portal = getPortal(role);
  const logoutUrl =
    portal === "franchisee" ? "/franchisee/auth/logout" :
    portal === "ci" ? "/ci/logout" :
    "/admin/auth/logout";

  try {
    await api.post(logoutUrl);
  } catch {
    /* Even if this fails, the ?stale=1 edge self-heal clears the cookies. */
  }

  localStorage.removeItem("user");
  // Lazy imports to avoid a load-time circular dep (axios → store → axios).
  try {
    const { useScopeStore } = await import("@/lib/stores/scope-store");
    useScopeStore.getState().clear();
  } catch {
    /* ignore */
  }
  try {
    const { getQueryClientBridge } = await import(
      "@/hooks/api/query-client-bridge"
    );
    getQueryClientBridge().clear();
  } catch {
    /* bridge not mounted yet — nothing to clear */
  }

  const loginPath = loginPathForSession(role);
  const already = window.location.pathname === loginPath;
  if (!already && !userLogoutInProgress) {
    const params = new URLSearchParams({ stale: "1" });
    const next = window.location.pathname;
    if (next && next !== "/" && next !== loginPath) params.set("next", next);
    window.location.href = `${loginPath}?${params.toString()}`;
  } else {
    sessionTeardownInProgress = false;
  }
}

api.interceptors.response.use(
  (response) => {
    const rt = response.config.responseType;
    if (rt === "blob" || rt === "arraybuffer") {
      return response;
    }
    const d = response.data;
    if (
      d &&
      typeof d === "object" &&
      !(d instanceof ArrayBuffer) &&
      "success" in d &&
      (d as { success: boolean }).success === true &&
      "data" in d
    ) {
      response.data = { result: (d as { data: unknown }).data };
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (isAuthFlowRequest(originalRequest?.url)) {
      return Promise.reject(error);
    }

    if (
      error.response?.status === 401 &&
      typeof window !== "undefined" &&
      !userLogoutInProgress &&
      !sessionTeardownInProgress
    ) {
      sessionTeardownInProgress = true;
      void teardownDeadSession();
    }

    reportApiFailure(error);
    return Promise.reject(error);
  },
);
