import api from "./api";

export const adminLogin = (username, password) =>
  api.post("/admin/login", { username, password }).then((res) => res.data);

export const adminMe = () => api.get("/admin/me").then((res) => res.data);
