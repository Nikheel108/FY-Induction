import api from './api';

export const submitAttendance = (prn, date) =>
  api.post('/attendance', { prn, date }).then(res => res.data);

export const fetchAttendance = (params) =>
  api.get('/admin/attendance', { params }).then(res => res.data);