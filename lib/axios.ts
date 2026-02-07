import axios from "axios";
import { toast } from "sonner";

const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export const api = axios.create({
  baseURL: baseUrl,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
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
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const userStr = localStorage.getItem("user");
        let role = "";
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            role = user.role;
          } catch (e) {
            console.error("Error parsing user from local storage", e);
          }
        }

        const refreshUrl =
          role === "franchisee"
            ? "/franchisee/auth/refresh"
            : "/admin/auth/refresh";

        await api.post(refreshUrl);
        
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        
        const userStr = localStorage.getItem("user");
        let role = "";
        if (userStr) {
           try {
            const user = JSON.parse(userStr);
            role = user.role;
          } catch (e) {
             console.error("Error parsing user from local storage", e);
          }
        }

        const logoutUrl =
          role === "franchisee"
            ? "/franchisee/auth/logout"
            : "/admin/auth/logout";
            
        try {
            await api.post(logoutUrl);
        } catch (logoutErr) {
            console.error("Logout failed", logoutErr);
        }

        localStorage.removeItem("user");
        
        if (role === "franchisee") {
             window.location.href = "/franchisee/login";
        } else {
             window.location.href = "/login";
        }
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Don't show generic toast here - let components handle errors
    // Only reject the promise so components can catch and display inline errors
    return Promise.reject(error);
  }
);
