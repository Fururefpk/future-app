'use strict';
window.FPH = window.FPH || {};

window.FPH.tenancies = (() => {
  const { api, storage:{Cache} } = FPH;

  async function getMine(params={}) {
    const key = 'tenancies:mine:'+JSON.stringify(params);
    const hit = Cache.get(key);
    if (hit) return hit;
    const d = await api.get('/tenancies/me', {params});
    Cache.set(key, d);
    return d;
  }

  async function getAll(params={}) {
    return api.get('/tenancies', {params});
  }

  async function getById(id) {
    return api.get(`/tenancies/${id}`);
  }

  async function request(propertyId, message) {
    Cache.del('tenancies:mine:{}');
    return api.post('/tenancies', {propertyId, message});
  }

  async function respond(id, decision, reason) {
    Cache.del('tenancies:mine:{}');
    return api.patch(`/tenancies/${id}/decision`, {decision, reason});
  }

  async function end(id, reason) {
    Cache.del('tenancies:mine:{}');
    return api.patch(`/tenancies/${id}/end`, {reason});
  }

  async function bulkDecide(ids, decision) {
    Cache.clear();
    return api.post('/tenancies/bulk-decision', {ids, decision});
  }

  const STATUS_LABELS = {
    pending:'Pending', approved:'Active', rejected:'Rejected',
    active:'Active', ended:'Ended',
  };
  const STATUS_COLORS = {
    pending:'#f59e0b', approved:'#059669', active:'#059669',
    rejected:'#ef4444', ended:'#6b7280',
  };

  return { getMine, getAll, getById, request, respond, end, bulkDecide, STATUS_LABELS, STATUS_COLORS };
})();