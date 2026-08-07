import api from "./api";

export const adminLogin = (username, password) =>
  api.post("/admin/login", { username, password }).then((res) => res.data);

export const adminMe = () => api.get("/admin/me").then((res) => res.data);

export const broadcastEmail = (payload) =>
  api.post("/admin/broadcast", payload).then((res) => res.data);
