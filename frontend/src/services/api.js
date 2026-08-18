import axios from "axios";

// Base URL for the backend API.
// - Local dev: Vite proxies "/api" to http://localhost:5000, so it can be empty.
// - Deployed: set VITE_API_URL to the deployed backend API root.
const baseURL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// Attach the appropriate token to every request.
api.interceptors.request.use((config) => {
  const adminToken = localStorage.getItem("admin_token");
  const studentToken = localStorage.getItem("student_token");
  
  // If the user is navigating the admin portal, always prefer adminToken.
  // Otherwise, prefer studentToken.
  const isAdminPortal = window.location.pathname.startsWith("/admin");

  if (isAdminPortal && adminToken) {
    config.headers.Authorization = `Bearer ${adminToken}`;
  } else if (!isAdminPortal && studentToken) {
    config.headers.Authorization = `Bearer ${studentToken}`;
  } else if (adminToken) {
    // Fallback just in case
    config.headers.Authorization = `Bearer ${adminToken}`;
  }
  
  return config;
});

// Normalise error responses so callers always receive a message string.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      (error.code === "ECONNABORTED"
        ? "Request timed out. Please try again."
        : "Network error. Could not reach the server.");
    const customError = new Error(message);
    customError.response = error.response;
    return Promise.reject(customError);
  }
);

export default api;
