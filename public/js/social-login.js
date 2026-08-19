'use strict';
window.FPH = window.FPH || {};

window.FPH.socialLogin = (() => {
  const PROVIDERS = ['google','facebook'];

  function redirect(provider) {
    if (!PROVIDERS.includes(provider)) throw new Error(`Unknown provider: ${provider}`);
    const returnTo = encodeURIComponent(location.href);
    location.href = `${FPH.api.BASE}/auth/oauth/${provider}?returnTo=${returnTo}`;
  }

  // Call on the callback page to exchange code for tokens
  async function handleCallback() {
    const params = new URLSearchParams(location.search);
    const token  = params.get('token');
    const error  = params.get('error');
    if (error) throw new Error(decodeURIComponent(error));
    if (!token) return null;

    // Server already exchanged code for tokens; token is a one-time JWT
    const data = await FPH.api.post('/auth/oauth/finalize',{token},{auth:false});
    FPH.storage.Session.set(data.data);
    // Clean URL
    history.replaceState({}, '', location.pathname);
    return data;
  }

  function getProviderLabel(p) {
    return {google:'Google',facebook:'Facebook'}[p] || p;
  }

  function getProviderIcon(p) {
    return {google:'🟦',facebook:'📘'}[p] || '🌐';
  }

  return { redirect, handleCallback, getProviderLabel, getProviderIcon, PROVIDERS };
})();