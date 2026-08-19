'use strict';
window.FPH = window.FPH || {};

window.FPH.auth = (() => {
  const { api, storage: { Session, Demo }, toast, validation } = FPH;

  async function _call(endpoint, body, fallback) {
    try {
      const data = await api.post(endpoint, body, {auth:false});
      Session.set(data.data);
      return {...data, _demo:false};
    } catch(e) {
      if (e.offline && fallback) {
        const data = fallback();
        if (data.success) { Session.set(data.data); }
        return data;
      }
      throw e;
    }
  }

  async function register(payload) {
    const {valid,errors} = validation.validate(payload, validation.schemas.register);
    if (!valid) throw Object.assign(new Error(Object.values(errors)[0]), {errors});
    return _call('/auth/register', payload,
      () => Demo.register(payload));
  }

  async function login({email,password}) {
    const {valid,errors} = validation.validate({email,password}, validation.schemas.login);
    if (!valid) throw Object.assign(new Error(Object.values(errors)[0]), {errors});
    return _call('/auth/login', {email,password},
      () => Demo.login(email,password));
  }

  async function logout() {
    try {
      if (!Session.isDemo) await api.post('/auth/logout', {});
    } catch {}
    Session.clear();
    FPH.storage.Cache.clear();
    window.dispatchEvent(new CustomEvent('fph:logout'));
  }

  async function logoutAll() {
    try { await api.post('/auth/logout-all', {}); } catch {}
    Session.clear();
    window.dispatchEvent(new CustomEvent('fph:logout'));
  }

  async function getMe() {
    if (Session.isDemo) return {success:true, data:{user: Session.user}};
    return api.get('/auth/me');
  }

  async function forgotPassword(email) {
    return api.post('/auth/forgot-password', {email}, {auth:false});
  }

  async function resetPassword(token, password) {
    return api.post(`/auth/reset-password/${token}`, {password}, {auth:false});
  }

  async function resendVerification() {
    return api.post('/auth/resend-verification', {});
  }

  async function verifyEmail(token) {
    return api.get(`/auth/verify-email/${token}`, {auth:false});
  }

  function isAuthed() { return !!Session.accessToken; }
  function getUser()  { return Session.user; }
  function isAdmin()  { return Session.user?.role === 'admin'; }
  function isLandlord(){ return Session.user?.role === 'landlord'; }
  function isVerified(){ return Session.user?.verification?.status === 'verified'; }

  return {
    register, login, logout, logoutAll, getMe,
    forgotPassword, resetPassword, resendVerification, verifyEmail,
    isAuthed, getUser, isAdmin, isLandlord, isVerified,
  };
})();