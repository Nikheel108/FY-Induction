import api from './api';

export const submitAttendance = (prn) =>
  api.post('/attendance', { prn }).then(res => res.data);

export const getActiveSession = () =>
  api.get('/attendance/active-session').then(res => res.data);

export const fetchAttendance = (params) =>
  api.get('/admin/attendance', { params }).then(res => res.data);

export const adminMarkAttendance = (prn, event_session_id) =>
  api.post('/admin/attendance/mark', { prn, event_session_id }).then(res => res.data);

export const adminDemarkAttendance = (attendance_id) =>
  api.delete(`/admin/attendance/${attendance_id}`).then(res => res.data);

export const exportAttendance = async (format, filters = {}) => {
  const params = new URLSearchParams();
  if (filters.date) params.append('date', filters.date);
  if (filters.prn) params.append('prn', filters.prn);
  if (filters.student_name) params.append('student_name', filters.student_name);
  if (filters.event_session_id) params.append('event_session_id', filters.event_session_id);

  const response = await api.get(`/admin/attendance/export/${format}?${params.toString()}`, {
    responseType: 'blob',
  });
  return response.data;
};