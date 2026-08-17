import api from "./api";

// ---- Public endpoints ------------------------------------------------------

export const registerStudent = (payload) =>
  api.post("/register", payload).then((res) => res.data);

export const getStatistics = () =>
  api.get("/statistics").then((res) => res.data);

export const downloadReceipt = async (studentId) => {
  const response = await api.get(`/student/${studentId}/receipt`, {
    responseType: "blob",
  });
  return response.data;
};

// ---- Admin endpoints -------------------------------------------------------

export const getStudents = (params) =>
  api.get("/students", { params }).then((res) => res.data);

export const getStudent = (id) =>
  api.get(`/student/${id}`).then((res) => res.data);

export const updateStudent = (id, data) =>
  api.put(`/student/${id}`, data).then((res) => res.data);

export const deleteStudent = (id) =>
  api.delete(`/student/${id}`).then((res) => res.data);

export const resetStudentPassword = (id, new_password) =>
  api.post(`/admin/student/${id}/reset-password`, { new_password }).then((res) => res.data);

export const resendEmail = (id) =>
  api.post(`/send-email`, { student_id: id }).then((res) => res.data);

export const getMailLogs = (studentId) =>
  api.get(`/student/${studentId}/mail-logs`).then((res) => res.data);
