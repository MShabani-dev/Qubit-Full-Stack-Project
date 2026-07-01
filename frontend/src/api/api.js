import axios from "axios";

const api = axios.create({ baseURL: "http://127.0.0.1:8000/" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem("refresh");
      if (refresh) {
        try {
          const res = await axios.post("http://127.0.0.1:8000/api/token/refresh/", { refresh });
          const newAccess = res.data.access;
          localStorage.setItem("access", newAccess);
          original.headers.Authorization = `Bearer ${newAccess}`;
          return api(original);
        } catch {
          localStorage.removeItem("access");
          localStorage.removeItem("refresh");
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
