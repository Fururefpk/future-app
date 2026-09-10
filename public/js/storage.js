'use strict';
window.FPH = window.FPH || {};

window.FPH.storage = (() => {
  const SESSION_KEY = 'fph_session';
  const PREFS_KEY   = 'fph_prefs';
  const DEMO_KEY    = 'fph_demo_users';
  const CACHE_KEY   = 'fph_cache';

  // ── Session ──────────────────────────────────────────────
  const Session = {
    get()     { try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null');}catch{return null;} },
    set(s)    { s ? localStorage.setItem(SESSION_KEY,JSON.stringify(s)) : localStorage.removeItem(SESSION_KEY); },
    clear()   { localStorage.removeItem(SESSION_KEY); },
    patch(u)  { this.set({...this.get(),...u}); },
    get accessToken()  { return this.get()?.accessToken  ?? null; },
    get refreshToken() { return this.get()?.refreshToken ?? null; },
    get user()         { return this.get()?.user         ?? null; },
    get isDemo()       { return !!this.get()?.accessToken?.startsWith('demo_'); },
  };

  // ── Tab-level data cache (TTL) ────────────────────────────
  const Cache = {
    _store: new Map(),
    TTL: 30_000,
    get(key)    { const h=this._store.get(key); return (h&&Date.now()-h.ts<this.TTL) ? h.data : null; },
    set(key,d)  { this._store.set(key,{data:d,ts:Date.now()}); },
    del(key)    { this._store.delete(key); },
    clear()     { this._store.clear(); },
  };

  // ── User preferences (persisted) ─────────────────────────
  const Prefs = {
    get()          { try{return JSON.parse(localStorage.getItem(PREFS_KEY)||'{}');}catch{return {};} },
    set(k,v)       { const p=this.get(); p[k]=v; localStorage.setItem(PREFS_KEY,JSON.stringify(p)); },
    getKey(k,def)  { return this.get()[k] ?? def; },
    clear()        { localStorage.removeItem(PREFS_KEY); },
  };

  // ── Demo users (offline fallback) ─────────────────────────
  const Demo = {
    _load() { try{return JSON.parse(localStorage.getItem(DEMO_KEY)||'{}');}catch{return {};} },
    _save(u){ localStorage.setItem(DEMO_KEY,JSON.stringify(u)); },
    register({firstName,lastName,email,phone,password,role}) {
      const users=this._load();
      if(users[email]) return {success:false,message:'Email already registered.'};
      const user={_id:'demo_'+Date.now(),firstName,lastName,email,phone,role,
        verification:{status:'unverified',ghanaCardVerified:false,faceVerified:false}};
      users[email]={password,user};
      this._save(users);
      return {success:true,_demo:true,data:this._session(user)};
    },
    login(email,password) {
      const r=this._load()[email];
      if(!r||r.password!==password) return {success:false,message:'Invalid email or password.'};
      return {success:true,_demo:true,data:this._session(r.user)};
    },
    _session(user){ return {accessToken:'demo_'+user._id,refreshToken:'demo_ref_'+user._id,user}; },
    getUser(email){ return this._load()[email]?.user || null; },
    updateUser(email,updates){ const u=this._load(); if(u[email]){u[email].user={...u[email].user,...updates};this._save(u);} },
  };

  return { Session, Cache, Prefs, Demo };
})();