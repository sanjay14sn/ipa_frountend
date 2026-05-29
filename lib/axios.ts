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

/** Avoid refresh loops: these calls must not trigger token refresh / queue. */
function isAuthFlowRequest(url: string | undefined): boolean {
  if (!url) return false;
  return (
    url.includes("/auth/login") ||
    url.includes("/auth/refresh") ||
    url.includes("/auth/logout") ||
    url === "/ci/me" ||
    url === "/ci/refresh" ||
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

let refreshPromise: Promise<void> | null = null;

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

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!refreshPromise) {
        const role = parseStoredRole();
        const portal = getPortal(role);
        const refreshUrl =
          portal === "franchisee" ? "/franchisee/auth/refresh" :
          portal === "ci" ? "/ci/refresh" :
          "/admin/auth/refresh";

        refreshPromise = api.post(refreshUrl, {})
          .then(() => { /* success — nothing to return */ })
          .catch(async (refreshError) => {
            const role = parseStoredRole();
            const portal = getPortal(role);
            const logoutUrl =
              portal === "franchisee" ? "/franchisee/auth/logout" :
              portal === "ci" ? "/ci/logout" :
              "/admin/auth/logout";

            try {
              await api.post(logoutUrl);
            } catch (logoutErr) {
              // 401 is expected: the session is already invalid server-side (refresh
              // also failed above), so there is nothing to revoke. Only surface others.
              const status = (logoutErr as { response?: { status?: number } })?.response?.status;
              if (status !== 401) {
                console.error("Logout failed", logoutErr);
              }
            }

            if (typeof window !== "undefined") {
              localStorage.removeItem("user");
              // Lazy import to avoid a load-time circular dep (axios → store → axios).
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
              const already = loginPath === "/ci/login" && window.location.pathname.startsWith("/ci");
              if (!already) {
                window.location.href = loginPath;
              }
            }

            reportApiFailure(refreshError);
            throw refreshError; // re-throw so awaiting callers get the rejection
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      try {
        await refreshPromise;
        return api(originalRequest);
      } catch (err) {
        return Promise.reject(err);
      }
    }

    reportApiFailure(error);
    return Promise.reject(error);
  },
);
