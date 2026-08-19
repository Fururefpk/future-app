'use strict';
window.FPH = window.FPH || {};

window.FPH.admin = (() => {
  const { api } = FPH;

  // Dashboard
  async function getDashboard()          { return api.get('/admin/dashboard'); }
  async function getStats(params)        { return api.get('/admin/stats',{params}); }
  async function getActivity(limit=20)   { return api.get('/admin/activity',{params:{limit}}); }
  async function getHealth()             { return api.get('/admin/health'); }
  async function getAuditLog(params)     { return api.get('/admin/audit-log',{params}); }

  // Properties
  async function getPendingProperties(params) { return api.get('/admin/properties/pending',{params}); }
  async function reviewProperty(id,decision,reason) { return api.patch(`/admin/properties/${id}/review`,{decision,reason}); }
  async function getAllProperties(params) { return api.get('/admin/properties',{params}); }
  async function removeProperty(id)      { return api.del(`/admin/properties/${id}`); }

  // Users
  async function getUsers(params)        { return api.get('/admin/users',{params}); }
  async function getUserDetail(id)       { return api.get(`/admin/users/${id}`); }
  async function setUserActive(id,active,reason) { return api.patch(`/admin/users/${id}/active`,{active,reason}); }
  async function changeUserRole(id,role) { return api.patch(`/admin/users/${id}/role`,{role}); }
  async function bulkUserAction(ids,action,payload) { return api.post('/admin/users/bulk-action',{ids,action,payload}); }

  // Verifications
  async function getPendingVerifications() { return api.get('/admin/verifications/pending'); }
  async function getVerificationStats()    { return api.get('/admin/verifications/stats'); }
  async function reviewVerification(userId,decision,reason) {
    return api.patch(`/biometric/queue/${userId}/decision`,{decision,reason});
  }
  async function overrideVerification(userId,reason) {
    return api.post(`/biometric/queue/${userId}/override`,{reason});
  }

  function requireAdmin() {
    if (!FPH.auth.isAdmin()) throw new Error('Admin access required');
  }

  return {
    getDashboard, getStats, getActivity, getHealth, getAuditLog,
    getPendingProperties, reviewProperty, getAllProperties, removeProperty,
    getUsers, getUserDetail, setUserActive, changeUserRole, bulkUserAction,
    getPendingVerifications, getVerificationStats, reviewVerification, overrideVerification,
    requireAdmin,
  };
})();