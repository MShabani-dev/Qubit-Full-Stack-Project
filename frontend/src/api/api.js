import axios from "axios";

// Single axios instance used across the whole app.
// baseURL points to the Django dev server.
const api = axios.create({
  baseURL: "http://127.0.0.1:8000/",
});

// --- Request interceptor: attach JWT access token to every request ---
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Response interceptor: auto-refresh the access token on 401 ---
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // If we got a 401 and haven't already retried this request:
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem("refresh");

      if (refresh) {
        try {
          // Ask the backend for a fresh access token.
          const res = await axios.post(
            "http://127.0.0.1:8000/api/token/refresh/",
            { refresh }
          );
          const newAccess = res.data.access;
          localStorage.setItem("access", newAccess);

          // Retry the original request with the new token.
          original.headers.Authorization = `Bearer ${newAccess}`;
          return api(original);
        } catch {
          // Refresh failed -> force logout.
          localStorage.removeItem("access");
          localStorage.removeItem("refresh");
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
