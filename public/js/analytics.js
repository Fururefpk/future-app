'use strict';
window.FPH = window.FPH || {};

window.FPH.analytics = (() => {
  const { api } = FPH;
  const _events = [];

  // Track an event locally then flush to backend
  function track(event, data={}) {
    const entry = { event, data, ts: Date.now(), user: FPH.auth.getUser()?._id };
    _events.push(entry);
    // Flush every 10 events
    if (_events.length >= 10) flush();
  }

  async function flush() {
    if (!_events.length) return;
    const batch = _events.splice(0);
    try {
      if (!FPH.storage.Session.isDemo) {
        await api.post('/analytics/events', {events:batch}).catch(()=>{});
      }
    } catch {}
  }

  // Flush on page unload
  if (typeof window !== 'undefined') {
    window.addEventListener('visibilitychange', () => { if(document.visibilityState==='hidden') flush(); });
  }

  // Page view tracking
  function pageView(page) { track('page_view', {page}); }
  function propertyView(propertyId, name) { track('property_view', {propertyId, name}); }
  function searchPerformed(query, resultsCount) { track('search', {query, resultsCount}); }
  function loginSuccess(method) { track('login', {method}); }
  function registerSuccess(role) { track('register', {role}); }
  function inquirySent(propertyId) { track('inquiry_sent', {propertyId}); }

  // Admin analytics
  async function getPlatformStats(params={}) { return api.get('/admin/stats',{params}); }
  async function getDashboard()              { return api.get('/admin/dashboard'); }

  return { track, flush, pageView, propertyView, searchPerformed, loginSuccess, registerSuccess, inquirySent, getPlatformStats, getDashboard };
})();