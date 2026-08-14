import api from './api';

export const submitAttendance = (prn) =>
  api.post('/attendance', { prn }).then(res => res.data);

export const getActiveSession = () =>
  api.get('/attendance/active-session').then(res => res.data);

export const fetchAttendance = (params) =>
  api.get('/admin/attendance', { params }).then(res => res.data);