import api from './api';

export const getHighlights = (params) =>
  api.get('/highlights', { params }).then(res => res.data);

export const createHighlight = (payload) =>
  api.post('/admin/highlights', payload).then(res => res.data);

export const updateHighlight = (id, payload) =>
  api.put(`/admin/highlights/${id}`, payload).then(res => res.data);

export const deleteHighlight = (id) =>
  api.delete(`/admin/highlights/${id}`).then(res => res.data);

export const generateHighlightDescription = (payload) =>
  api.post('/admin/highlights/generate-description', payload).then(res => res.data);

export const exportHighlightsPDF = async (speaker) => {
  const response = await api.get('/admin/highlights/export/pdf', {
    params: speaker ? { speaker } : {},
    responseType: 'blob',
  });
  return response.data;
};
