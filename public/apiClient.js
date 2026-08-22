/**
 * apiClient.js  (frontend)
 * Centralised API wrapper for Future Property Holdings.
 *
 * Features:
 *  - Automatic Bearer token injection
 *  - Silent access-token refresh (no infinite-loop — uses raw fetch)
 *  - Request queue: concurrent 401s share one refresh attempt
 *  - Idempotency-Key header for payment mutations
 *  - Demo mode: if the server is unreachable, falls back to localStorage
 *    so the UI is fully testable without a backend
 *
 * Usage:
 *   import api from './apiClient.js';
 *   const { data } = await api.auth.login({ email, password });
 */

'use strict';

// ── Config ─────────────────────────────────────────────────────────
const BASE_URL = (
  (typeof process !== 'undefined' && process.env?.VITE_API_URL) ||
  (typeof window !== 'undefined' && window.__FPH_API_URL__) ||
  ((typeof window !== 'undefined' && /localhost|127/.test(window.location.hostname))
    ? 'http://localhost:5003/api/v1'
    : `${window.location.origin}/api/v1`)
);

const SESSION_KEY = 'fph_session';
const DEMO_USERS_KEY = 'fph_demo_users';

// ── Session helpers ────────────────────────────────────────────────
const Session = {
  get() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
    catch { return null; }
  },
  set(s) {
    s
      ? localStorage.setItem(SESSION_KEY, JSON.stringify(s))
      : localStorage.removeItem(SESSION_KEY);
  },
  get accessToken()  { return this.get()?.accessToken  ?? null; },
  get refreshToken() { return this.get()?.refreshToken ?? null; },
  get user()         { return this.get()?.user         ?? null; },
  patch(updates)     { this.set({ ...this.get(), ...updates }); },
};

// ── Token refresh queue ────────────────────────────────────────────
// Prevents multiple parallel refresh calls when several requests 401 together.
let refreshing = null;

async function doRefresh() {
  if (!Session.refreshToken) return false;
  try {
    const r = await fetch(`${BASE_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: Session.refreshToken }),
    });
    const j = await r.json();
    if (!r.ok || !j.data?.accessToken) { Session.set(null); return false; }
    Session.patch({ accessToken: j.data.accessToken });
    return true;
  } catch {
    Session.set(null);
    return false;
  }
}

function getRefreshPromise() {
  if (!refreshing) refreshing = doRefresh().finally(() => { refreshing = null; });
  return refreshing;
}

// ── Demo mode ─────────────────────────────────────────────────────
const Demo = {
  _users() {
    try { return JSON.parse(localStorage.getItem(DEMO_USERS_KEY) || '{}'); }
    catch { return {}; }
  },
  _save(u) { localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(u)); },

  register({ firstName, lastName, email, phone, password, role }) {
    const users = this._users();
    if (users[email]) throw Object.assign(new Error('Email already registered (demo mode)'), { status: 409 });
    const user = {
      _id: 'demo_' + Date.now(),
      firstName, lastName, email, phone, role,
      verification: { status: 'unverified', ghanaCardVerified: false, faceVerified: false },
    };
    users[email] = { password, user };
    this._save(users);
    return this._session(user);
  },

  login(email, password) {
    const record = this._users()[email];
    if (!record || record.password !== password) throw Object.assign(new Error('Invalid email or password'), { status: 401 });
    return this._session(record.user);
  },

  _session(user) {
    const tok = 'demo_tok_' + user._id;
    return { accessToken: tok, refreshToken: 'demo_ref_' + user._id, user, _demo: true };
  },
};

// ── Core fetch wrapper ─────────────────────────────────────────────
async function request(method, path, { body, params, auth = true, idempotencyKey, isRetry = false } = {}) {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => v !== undefined && url.searchParams.set(k, v));

  const headers = { 'Content-Type': 'application/json' };
  if (auth && Session.accessToken) headers['Authorization'] = `Bearer ${Session.accessToken}`;
  if (idempotencyKey) headers['X-Idempotency-Key'] = idempotencyKey;

  let res;
  try {
    res = await fetch(url.toString(), {
      method,
      headers,
      body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
    });
    if (body instanceof FormData) delete headers['Content-Type']; // let browser set multipart boundary
  } catch {
    // Network failure → try demo mode for auth endpoints
    throw Object.assign(new Error('Network error — cannot reach server'), { status: 0, offline: true });
  }

  // Token expired — attempt silent refresh once
  if (res.status === 401 && auth && !isRetry) {
    const ok = await getRefreshPromise();
    if (ok) return request(method, path, { body, params, auth, idempotencyKey, isRetry: true });
    Session.set(null);
    window.dispatchEvent(new CustomEvent('fph:unauthorized'));
    throw Object.assign(new Error('Session expired. Please log in again.'), { status: 401 });
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json.message || `HTTP ${res.status}`), { status: res.status, data: json });
  return json;
}

// Convenience shorthands
const get  = (path, opts)        => request('GET',    path, opts);
const post = (path, body, opts)  => request('POST',   path, { body, ...opts });
const put  = (path, body, opts)  => request('PUT',    path, { body, ...opts });
const patch = (path, body, opts) => request('PATCH',  path, { body, ...opts });
const del  = (path, opts)        => request('DELETE', path, opts);

// Multipart helper (images)
async function upload(method, path, formData, opts = {}) {
  const headers = {};
  if (Session.accessToken) headers['Authorization'] = `Bearer ${Session.accessToken}`;
  const res = await fetch(`${BASE_URL}${path}`, { method, headers, body: formData });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json.message || `HTTP ${res.status}`), { status: res.status });
  return json;
}

// ── API surface ────────────────────────────────────────────────────
const api = {
  Session,
  Demo,

  // ── Auth ──────────────────────────────────────────────────────
  auth: {
    /** Register with personal info only. Ghana Card/face happens later in Settings. */
    async register(payload) {
      try {
        const data = await post('/auth/register', payload, { auth: false });
        Session.set(data.data);
        return data;
      } catch (err) {
        if (err.offline) { const d = Demo.register(payload); Session.set(d); return { success: true, data: d, _demo: true }; }
        throw err;
      }
    },

    async login({ email, password }) {
      try {
        const data = await post('/auth/login', { email, password }, { auth: false });
        Session.set(data.data);
        return data;
      } catch (err) {
        if (err.offline) { const d = Demo.login(email, password); Session.set(d); return { success: true, data: d, _demo: true }; }
        throw err;
      }
    },

    async biometricLogin(payload) {
      const data = await post('/auth/biometric-login', payload, { auth: false });
      Session.set(data.data);
      return data;
    },

    /** Passkey step 1: get challenge */
    async passkeyChallenge(email) { return post('/auth/passkey/challenge', { email }, { auth: false }); },

    /** Passkey step 2: verify signed credential */
    async passkeyVerify(payload) {
      const data = await post('/auth/passkey/verify', payload, { auth: false });
      Session.set(data.data);
      return data;
    },

    /** Register a passkey for an existing logged-in account */
    async passkeyRegister(payload) { return post('/auth/passkey/register', payload); },

    async logout() {
      try { await post('/auth/logout', {}); } catch (_) {}
      Session.set(null);
    },

    async logoutAll() { await post('/auth/logout-all', {}); Session.set(null); },

    getMe()            { return get('/auth/me'); },
    getSessions()      { return get('/auth/sessions'); },
    refreshToken()     { return getRefreshPromise(); },
    verifyEmail(token) { return get(`/auth/verify-email/${token}`, { auth: false }); },
    resendVerification(){ return post('/auth/resend-verification', {}); },
    forgotPassword(email)         { return post('/auth/forgot-password', { email }, { auth: false }); },
    resetPassword(token, payload) { return post(`/auth/reset-password/${token}`, payload, { auth: false }); },
  },

  // ── Users ─────────────────────────────────────────────────────
  users: {
    getPublicProfile(id)    { return get(`/users/${id}`, { auth: false }); },
    getMyProfile()          { return get('/users/profile/me'); },
    updateProfile(payload)  { return put('/users/profile', payload); },
    changePassword(payload) { return put('/users/password', payload); },
    updateNotifications(p)  { return put('/users/notifications', p); },
    deleteAccount(payload)  { return del('/users/account', { body: payload }); },
    setup2FA()              { return post('/users/2fa/setup', {}); },
    verify2FA(code)         { return post('/users/2fa/verify', { code }); },
    disable2FA()            { return del('/users/2fa'); },

    async updateAvatar(file) {
      const fd = new FormData(); fd.append('avatar', file);
      return upload('PUT', '/users/avatar', fd);
    },

    // Admin
    getAll(params)          { return get('/users', { params }); },
    getStats()              { return get('/users/stats/overview'); },
    changeRole(id, role)    { return patch(`/users/${id}/role`, { role }); },
  },

  // ── Properties ────────────────────────────────────────────────
  properties: {
    getAll(params)          { return get('/properties', { params, auth: false }); },
    getFeatured()           { return get('/properties/featured', { auth: false }); },
    getCities()             { return get('/properties/cities', { auth: false }); },
    getById(id)             { return get(`/properties/${id}`, { auth: false }); },
    getLandlordListings(userId) { return get(`/properties/user/${userId}`); },
    getStats(id)            { return get(`/properties/${id}/stats`); },
    getInquiries(id, params){ return get(`/properties/${id}/inquiries`, { params }); },

    async create(payload, images = []) {
      const fd = new FormData();
      Object.entries(payload).forEach(([k, v]) => fd.append(k, v));
      images.forEach(img => fd.append('images', img));
      return upload('POST', '/properties', fd);
    },

    async update(id, payload, images = []) {
      const fd = new FormData();
      Object.entries(payload).forEach(([k, v]) => fd.append(k, v));
      images.forEach(img => fd.append('images', img));
      return upload('PUT', `/properties/${id}`, fd);
    },

    delete(id)              { return del(`/properties/${id}`); },
    removeImage(id, publicId) { return patch(`/properties/${id}/images`, { publicId }); },
    toggleFeatured(id)      { return patch(`/properties/${id}/featured`, {}); },
  },

  // ── Tenancies ─────────────────────────────────────────────────
  tenancies: {
    getMyTenancies(params)          { return get('/tenancies/me', { params }); },
    getAll(params)                  { return get('/tenancies', { params }); },
    getById(id)                     { return get(`/tenancies/${id}`); },
    request(payload)                { return post('/tenancies', payload); },
    respond(id, decision, reason)   { return patch(`/tenancies/${id}/decision`, { decision, reason }); },
    end(id, reason)                 { return patch(`/tenancies/${id}/end`, { reason }); },
    bulkDecide(ids, decision)       { return post('/tenancies/bulk-decision', { ids, decision }); },
  },

  // ── Rent ──────────────────────────────────────────────────────
  rent: {
    myInvoices(params)      { return get('/rent/me', { params }); },
    getAll(params)          { return get('/rent/invoices', { params }); },
    getById(id)             { return get(`/rent/invoices/${id}`); },
    downloadPDF(id)         { return `${BASE_URL}/rent/invoices/${id}/pdf?token=${Session.accessToken}`; },
    generate(payload)       { return post('/rent/invoices', payload); },
    update(id, payload)     { return put(`/rent/invoices/${id}`, payload); },
    void(id)                { return del(`/rent/invoices/${id}`); },
    getPayments(id)         { return get(`/rent/invoices/${id}/payments`); },

    recordPayment(invoiceId, payload) {
      const key = `pay_${invoiceId}_${payload.transactionRef || Date.now()}`;
      return post(`/rent/invoices/${invoiceId}/payments`, payload, { idempotencyKey: key });
    },

    reminders(params)       { return get('/rent/reminders', { params }); },
    sendReminders()         { return post('/rent/reminders/send', {}); },
    revenueSummary(params)  { return get('/rent/summary', { params }); },
  },

  // ── Maintenance ───────────────────────────────────────────────
  maintenance: {
    myRequests(params)      { return get('/maintenance/me', { params }); },
    getById(id)             { return get(`/maintenance/${id}`); },
    getStats()              { return get('/maintenance/stats'); },
    update(id, payload)     { return patch(`/maintenance/${id}`, payload); },
    rate(id, rating, comment) { return post(`/maintenance/${id}/rating`, { rating, comment }); },

    async create(payload, images = []) {
      const fd = new FormData();
      Object.entries(payload).forEach(([k, v]) => fd.append(k, v));
      images.forEach(img => fd.append('images', img));
      return upload('POST', '/maintenance', fd);
    },

    async addImages(id, images) {
      const fd = new FormData();
      images.forEach(img => fd.append('images', img));
      return upload('POST', `/maintenance/${id}/images`, fd);
    },

    removeImage(id, imageId) { return del(`/maintenance/${id}/images/${imageId}`); },
  },

  // ── Inquiries ─────────────────────────────────────────────────
  inquiries: {
    mine(params)            { return get('/inquiries/me', { params }); },
    unreadCount()           { return get('/inquiries/unread-count'); },
    getById(id)             { return get(`/inquiries/${id}`); },
    create(payload)         { return post('/inquiries', payload); },
    reply(id, message)      { return post(`/inquiries/${id}/reply`, { message }); },
    markRead(id)            { return patch(`/inquiries/${id}/read`, {}); },
    close(id)               { return patch(`/inquiries/${id}/close`, {}); },
    delete(id)              { return del(`/inquiries/${id}`); },
  },

  // ── Biometric / Verification ──────────────────────────────────
  biometric: {
    getStatus()             { return get('/biometric/status'); },
    getHistory()            { return get('/biometric/history'); },
    enrollFace(descriptor, quality = 90) {
      return post('/biometric/enroll-face', { faceDescriptor: descriptor, imageQuality: quality });
    },
    reenrollFace(descriptor, oldDescriptor) {
      return post('/biometric/re-enroll-face', { faceDescriptor: descriptor, oldDescriptor });
    },
    deleteFaceData()        { return del('/biometric/face'); },

    async verifyGhanaCard(number, name, cardImageFile) {
      const fd = new FormData();
      fd.append('ghanaCardNumber', number);
      fd.append('ghanaCardName', name);
      if (cardImageFile) fd.append('cardImage', cardImageFile);
      return upload('POST', '/biometric/verify-ghana-card', fd);
    },

    // Admin
    getQueue(params)        { return get('/biometric/queue', { params }); },
    review(userId, decision, reason) {
      return patch(`/biometric/queue/${userId}/decision`, { decision, reason });
    },
    adminOverride(userId, reason) {
      return post(`/biometric/queue/${userId}/override`, { reason });
    },
  },

  // ── Admin ─────────────────────────────────────────────────────
  admin: {
    dashboard()             { return get('/admin/dashboard'); },
    stats(params)           { return get('/admin/stats', { params }); },
    activity(limit = 50)    { return get('/admin/activity', { params: { limit } }); },
    health()                { return get('/admin/health'); },

    // Properties
    pendingProperties(p)    { return get('/admin/properties/pending', { params: p }); },
    reviewProperty(id, decision, reason) {
      return patch(`/admin/properties/${id}/review`, { decision, reason });
    },
    listAllProperties(p)    { return get('/admin/properties', { params: p }); },
    removeProperty(id)      { return del(`/admin/properties/${id}`); },

    // Users
    listUsers(params)       { return get('/admin/users', { params }); },
    getUserDetail(id)       { return get(`/admin/users/${id}`); },
    setUserActive(id, active, reason) {
      return patch(`/admin/users/${id}/active`, { active, reason });
    },
    changeUserRole(id, role){ return patch(`/admin/users/${id}/role`, { role }); },
    bulkUserAction(ids, action, payload) {
      return post('/admin/users/bulk-action', { ids, action, payload });
    },

    // Verification
    pendingVerifications()  { return get('/admin/verifications/pending'); },
    verificationStats()     { return get('/admin/verifications/stats'); },
    auditLog(params)        { return get('/admin/audit-log', { params }); },
  },
};

// Expose Session on the api object for convenience
api.session = Session;

// ── Export ────────────────────────────────────────────────────────
// Works as ES module default export and also as a CommonJS module.
if (typeof module !== 'undefined') module.exports = api;
export default api;
