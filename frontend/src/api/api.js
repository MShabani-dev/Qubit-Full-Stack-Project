import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000/";

const api = axios.create({ baseURL: API_BASE_URL });

// Public auth endpoints: never send a (possibly expired) token to them,
// and never try to refresh a token when they return 401.
const AUTH_PATHS = ["api/login/", "api/register/", "api/token/refresh/"];
const isAuthRequest = (config) =>
  AUTH_PATHS.some((p) => (config?.url || "").includes(p));

// Remove every piece of session data stored at login
const clearSession = () => {
  ["access", "refresh", "username", "is_staff", "is_superuser"].forEach((k) =>
    localStorage.removeItem(k)
  );
};

api.interceptors.request.use((config) => {
  if (isAuthRequest(config)) return config;
  const token = localStorage.getItem("access");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // A wrong password on the login form must show its own error, not trigger a refresh
    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !isAuthRequest(original)
    ) {
      original._retry = true;
      const refresh = localStorage.getItem("refresh");
      if (refresh) {
        try {
          const res = await axios.post(`${API_BASE_URL}api/token/refresh/`, { refresh });
          const newAccess = res.data.access;
          localStorage.setItem("access", newAccess);
          // Some setups rotate the refresh token too
          if (res.data.refresh) localStorage.setItem("refresh", res.data.refresh);
          original.headers.Authorization = `Bearer ${newAccess}`;
          return api(original);
        } catch {
          // Refresh token expired or invalid: the session is over
          clearSession();
        }
      }
    }
    return Promise.reject(error);
  }
);

export const followUser = async (username) => {
  const response = await api.post("api/profiles/follow/", { username });
  return response.data;
};

export const followTopic = async (topicId) => {
  const response = await api.post(`api/topics/${topicId}/follow/`);
  return response.data;
};

export const getFeed = async () => {
  const response = await api.get("api/feed/");
  return response.data;
};

// Fetch the site-wide activity feed (new topics, replies, likes)
export const getActivity = async () => {
  const response = await api.get("api/activity/");
  return response.data;
};

export default api;
