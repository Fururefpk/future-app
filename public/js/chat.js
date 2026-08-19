'use strict';
window.FPH = window.FPH || {};

window.FPH.chat = (() => {
  const { api, storage:{Cache} } = FPH;

  async function getAll(params={}) {
    return api.get('/inquiries/me', {params});
  }

  async function getById(id) {
    const hit = Cache.get(`chat:${id}`);
    if (hit) return hit;
    const d = await api.get(`/inquiries/${id}`);
    Cache.set(`chat:${id}`, d);
    return d;
  }

  async function create(propertyId, subject, message) {
    Cache.del('chat:list');
    return api.post('/inquiries', {propertyId, subject, message});
  }

  async function reply(id, message) {
    Cache.del(`chat:${id}`);
    return api.post(`/inquiries/${id}/reply`, {message});
  }

  async function markRead(id) {
    Cache.del(`chat:${id}`);
    return api.patch(`/inquiries/${id}/read`, {});
  }

  async function close(id) {
    Cache.del(`chat:${id}`);
    return api.patch(`/inquiries/${id}/close`, {});
  }

  async function remove(id) {
    Cache.del(`chat:${id}`);
    return api.del(`/inquiries/${id}`);
  }

  function isParticipant(inquiry) {
    const me = FPH.auth.getUser()?._id;
    return inquiry?.sender === me || inquiry?.recipient === me;
  }

  function getOtherParty(inquiry) {
    const me = FPH.auth.getUser()?._id;
    return inquiry?.sender?._id === me ? inquiry.recipient : inquiry.sender;
  }

  return { getAll, getById, create, reply, markRead, close, remove, isParticipant, getOtherParty };
})();