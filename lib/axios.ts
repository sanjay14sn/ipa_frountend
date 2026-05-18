import axios from "axios";
import type { UserRole } from "@/lib/auth";
import { extractErrorCode, extractErrorMessage } from "@/lib/error-utils";
import { sendClientLog } from "@/lib/client-telemetry";

const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5500";

export const api = axios.create({
  baseURL: baseUrl,
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
  if (typeof window === "undefined") return "";
  const userStr = localStorage.getItem("user");
  if (!userStr) return "";
  try {
    const user = JSON.parse(userStr) as { role?: UserRole };
    return user.role ?? "";
  } catch {
    return "";
  }
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

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (v?: unknown) => void;
  reject: (e?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

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
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const role = parseStoredRole();
      const portal = getPortal(role);

      try {
        const refreshUrl =
          portal === "franchisee" ? "/franchisee/auth/refresh" :
          portal === "ci" ? "/ci/refresh" :
          "/admin/auth/refresh";

        await api.post(refreshUrl, {});

        processQueue(null, null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);

        const logoutUrl =
          portal === "franchisee" ? "/franchisee/auth/logout" :
          portal === "ci" ? "/ci/logout" :
          "/admin/auth/logout";

        try {
          await api.post(logoutUrl);
        } catch (logoutErr) {
          console.error("Logout failed", logoutErr);
        }

        if (typeof window !== "undefined") {
          localStorage.removeItem("user");
          const loginPath = loginPathForSession(role);
          const already = loginPath === "/ci/login" && window.location.pathname.startsWith("/ci");
          if (!already) {
            window.location.href = loginPath;
          }
        }

        reportApiFailure(refreshError);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    reportApiFailure(error);
    return Promise.reject(error);
  },
);
