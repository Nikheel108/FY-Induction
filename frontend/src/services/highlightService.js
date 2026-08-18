import api from './api';

export const getHighlights = () =>
  api.get('/highlights').then(res => res.data);

export const createHighlight = (payload) =>
  api.post('/admin/highlights', payload).then(res => res.data);

export const deleteHighlight = (id) =>
  api.delete(`/admin/highlights/${id}`).then(res => res.data);

export const exportHighlightsPDF = async (speaker) => {
  const response = await api.get('/admin/highlights/export/pdf', {
    params: speaker ? { speaker } : {},
    responseType: 'blob',
  });
  return response.data;
};
