import api from './api';

export const studentLogin = (prn, password) =>
  api.post('/login', { prn, password }).then(res => res.data);

export const studentChangePassword = (new_password) =>
  api.post('/change-password', { new_password }).then(res => res.data);

export const studentMe = () =>
  api.get('/me').then(res => res.data);

export const studentRegister = (data) =>
  api.post('/register', data).then(res => res.data);

export const getSchedule = (prn = '') => {
  const params = new URLSearchParams();
  if (prn) params.append('prn', prn);
  return api.get(`/schedule?${params.toString()}`).then(res => res.data);
};

export const checkPrn = (prn) =>
  api.post('/check-prn', { prn }).then(res => res.data);
