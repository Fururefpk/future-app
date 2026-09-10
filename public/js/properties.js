'use strict';
window.FPH = window.FPH || {};

window.FPH.properties = (() => {
  const { api, storage:{Cache} } = FPH;

  async function getAll(params={}) {
    return api.get('/properties', {params, auth:false});
  }

  async function getFeatured() {
    const hit = Cache.get('properties:featured');
    if (hit) return hit;
    const d = await api.get('/properties/featured', {auth:false});
    Cache.set('properties:featured', d);
    return d;
  }

  async function getCities() {
    const hit = Cache.get('properties:cities');
    if (hit) return hit;
    const d = await api.get('/properties/cities', {auth:false});
    Cache.set('properties:cities', d);
    return d;
  }

  async function getById(id) {
    const hit = Cache.get(`property:${id}`);
    if (hit) return hit;
    const d = await api.get(`/properties/${id}`, {auth:false});
    Cache.set(`property:${id}`, d);
    return d;
  }

  async function getMyListings() {
    const me = FPH.auth.getUser()?._id;
    if (!me) throw new Error('Not authenticated');
    return api.get(`/properties/user/${me}`);
  }

  async function create(payload, images=[]) {
    Cache.del('properties:featured');
    const fd = new FormData();
    Object.entries(payload).forEach(([k,v]) => fd.append(k, v));
    images.forEach(img => fd.append('images', img));
    return api.upload('POST', '/properties', fd);
  }

  async function update(id, payload, images=[]) {
    Cache.del(`property:${id}`);
    const fd = new FormData();
    Object.entries(payload).forEach(([k,v]) => fd.append(k, v));
    images.forEach(img => fd.append('images', img));
    return api.upload('PUT', `/properties/${id}`, fd);
  }

  async function remove(id) {
    Cache.del(`property:${id}`);
    return api.del(`/properties/${id}`);
  }

  async function removeImage(id, publicId) {
    Cache.del(`property:${id}`);
    return api.patch(`/properties/${id}/images`, {publicId});
  }

  async function getStats(id) {
    return api.get(`/properties/${id}/stats`);
  }

  const TYPES = ['apartment','house','studio','office','commercial'];
  const CITIES = ['Accra','Kumasi','Takoradi','Cape Coast','Tamale','Tema','Ashaiman','Sunyani'];

  return { getAll, getFeatured, getCities, getById, getMyListings, create, update, remove, removeImage, getStats, TYPES, CITIES };
})();