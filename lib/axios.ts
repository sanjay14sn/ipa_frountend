import axios from "axios";
import type { UserRole } from "@/lib/auth";

const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5500";

export const api = axios.create({
  baseURL: baseUrl,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

/** Avoid refresh loops: these calls must not trigger token refresh / queue. */
function isAuthFlowRequest(url: string | undefined): boolean {
  if (!url) return false;
  return (
    url.includes("/auth/login") ||
    url.includes("/auth/refresh") ||
    url.includes("/auth/logout")
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

/** When `user` is missing or corrupt, infer portal from the current route. */
function inferFranchiseeFromPath(): boolean {
  if (typeof window === "undefined") return false;
  const p = window.location.pathname;
  return p.startsWith("/franchisee");
}

function isFranchiseeSession(role: UserRole | ""): boolean {
  if (role === "franchisee" || role === "franchise") return true;
  if (role === "admin") return false;
  return inferFranchiseeFromPath();
}

function loginPathForSession(role: UserRole | ""): string {
  return isFranchiseeSession(role) ? "/login" : "/admin-login";
}

/** JSON default breaks multipart: server must see multipart + boundary so multer can parse files. */
api.interceptors.request.use((config) => {
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

      try {
        const refreshUrl = isFranchiseeSession(role)
          ? "/franchisee/auth/refresh"
          : "/admin/auth/refresh";

        await api.post(refreshUrl, {});

        processQueue(null, null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);

        const logoutUrl = isFranchiseeSession(role)
          ? "/franchisee/auth/logout"
          : "/admin/auth/logout";

        try {
          await api.post(logoutUrl);
        } catch (logoutErr) {
          console.error("Logout failed", logoutErr);
        }

        if (typeof window !== "undefined") {
          localStorage.removeItem("user");
          window.location.href = loginPathForSession(role);
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
