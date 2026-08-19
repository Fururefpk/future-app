'use strict';
window.FPH = window.FPH || {};

window.FPH.api = (() => {
  const BASE = (() => {
    if (typeof window.__FPH_API_URL__ !== 'undefined' && window.__FPH_API_URL__) return window.__FPH_API_URL__;
    if (/localhost|127/.test(location.hostname)) return 'http://localhost:427/api/v1';
    return `${window.location.origin}/api/v1`;
  })();

  // ── Token refresh queue (prevents parallel refresh storms) ─
  let _refreshPromise = null;
  async function _doRefresh() {
    const { Session } = FPH.storage;
    if (!Session.refreshToken) return false;
    try {
      const r = await fetch(`${BASE}/auth/refresh-token`,{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({refreshToken: Session.refreshToken}),
      });
      const j = await r.json();
      if (!r.ok || !j.data?.accessToken) { Session.clear(); return false; }
      Session.patch({accessToken: j.data.accessToken});
      return true;
    } catch { Session.clear(); return false; }
  }
  const refresh = () => { if(!_refreshPromise) _refreshPromise=_doRefresh().finally(()=>_refreshPromise=null); return _refreshPromise; };

  // ── Core request ───────────────────────────────────────────
  async function request(method, path, {body,params,auth=true,idempotencyKey,_retry=false}={}) {
    const { Session, Demo } = FPH.storage;
    const url = new URL(`${BASE}${path}`);
    if (params) Object.entries(params).forEach(([k,v])=>v!=null&&url.searchParams.set(k,v));

    const headers = {};
    if (!(body instanceof FormData)) headers['Content-Type'] = 'application/json';
    if (auth && Session.accessToken)  headers['Authorization'] = `Bearer ${Session.accessToken}`;
    if (idempotencyKey)               headers['X-Idempotency-Key'] = idempotencyKey;

    let res;
    try {
      res = await fetch(url.toString(),{
        method, headers,
        body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw Object.assign(new Error('Network error — server unreachable'), {offline:true,status:0});
    }

    if (res.status === 401 && auth && !_retry && !Session.isDemo) {
      const ok = await refresh();
      if (ok) return request(method, path, {body,params,auth,idempotencyKey,_retry:true});
      Session.clear();
      window.dispatchEvent(new CustomEvent('fph:session-expired'));
      throw Object.assign(new Error('Session expired. Please sign in again.'), {status:401});
    }

    const json = await res.json().catch(()=>({}));
    if (!res.ok) throw Object.assign(new Error(json.message||`HTTP ${res.status}`), {status:res.status,data:json});
    return json;
  }

  // ── Helpers ────────────────────────────────────────────────
  const get    = (path,opts)    => request('GET',    path, opts||{});
  const post   = (path,b,opts)  => request('POST',   path, {body:b,...opts});
  const put    = (path,b,opts)  => request('PUT',    path, {body:b,...opts});
  const patch  = (path,b,opts)  => request('PATCH',  path, {body:b,...opts});
  const del    = (path,opts)    => request('DELETE',  path, opts||{});
  const upload = (method,path,fd) => request(method, path, {body:fd});

  return { BASE, request, get, post, put, patch, del, upload, refresh };
})();
