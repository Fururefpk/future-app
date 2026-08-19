'use strict';
window.FPH = window.FPH || {};

/**
 * maintenance.js — frontend feature module
 * Handles maintenance request CRUD via the API.
 * Mirrors the pattern of properties.js, rent.js, etc.
 */
window.FPH.maintenance = (() => {
  const { api, storage: { Cache } } = FPH;

  async function myRequests(params = {}) {
    const key = 'maintenance:mine:' + JSON.stringify(params);
    const hit = Cache.get(key);
    if (hit) return hit;
    const d = await api.get('/maintenance/me', { params });
    Cache.set(key, d);
    return d;
  }

  async function getById(id) {
    const hit = Cache.get('maintenance:' + id);
    if (hit) return hit;
    const d = await api.get('/maintenance/' + id);
    Cache.set('maintenance:' + id, d);
    return d;
  }

  async function getStats() {
    return api.get('/maintenance/stats');
  }

  async function create(payload, images = []) {
    Cache.del('maintenance:mine:{}');
    const fd = new FormData();
    Object.entries(payload).forEach(([k, v]) => fd.append(k, v));
    images.forEach(img => fd.append('images', img));
    return api.upload('POST', '/maintenance', fd);
  }

  async function update(id, payload) {
    Cache.del('maintenance:' + id);
    Cache.del('maintenance:mine:{}');
    return api.patch('/maintenance/' + id, payload);
  }

  async function addImages(id, images) {
    Cache.del('maintenance:' + id);
    const fd = new FormData();
    images.forEach(img => fd.append('images', img));
    return api.upload('POST', `/maintenance/${id}/images`, fd);
  }

  async function removeImage(id, imageId) {
    Cache.del('maintenance:' + id);
    return api.del(`/maintenance/${id}/images/${imageId}`);
  }

  async function rateRequest(id, rating, comment = '') {
    return api.post(`/maintenance/${id}/rating`, { rating, comment });
  }

  const PRIORITY_COLORS = {
    low: '#059669', medium: '#f59e0b', high: '#ef4444', emergency: '#dc2626',
  };
  const STATUS_LABELS = {
    open: 'Open', in_progress: 'In Progress',
    completed: 'Completed', cancelled: 'Cancelled',
  };

  return {
    myRequests, getById, getStats, create, update,
    addImages, removeImage, rateRequest,
    PRIORITY_COLORS, STATUS_LABELS,
  };
})();