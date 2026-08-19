'use strict';
window.FPH = window.FPH || {};

window.FPH.utils = (() => {
  const escapeHtml = s => String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const escapeAttr = s => String(s??'').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const formatGHS  = (n,d=2) => 'GH₵ '+Number(n||0).toLocaleString('en-GH',{minimumFractionDigits:d,maximumFractionDigits:d});
  const formatDate = (d,o={}) => new Date(d).toLocaleDateString('en-GH',{day:'numeric',month:'short',year:'numeric',...o});
  const formatDateTime = d => new Date(d).toLocaleString('en-GH',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
  const timeAgo = d => { const s=(Date.now()-new Date(d))/1000; return s<60?'just now':s<3600?`${Math.floor(s/60)}m ago`:s<86400?`${Math.floor(s/3600)}h ago`:`${Math.floor(s/86400)}d ago`; };
  const daysBetween = (a,b) => Math.ceil((new Date(b)-new Date(a))/86400000);
  const capitalize = s => String(s||'').charAt(0).toUpperCase()+String(s||'').slice(1);
  const truncate   = (s,n=60) => s.length>n?s.slice(0,n)+'…':s;
  const initials   = (f='',l='') => ((f[0]||'')+(l[0]||'')).toUpperCase()||'?';
  const slugify    = s => s.toLowerCase().trim().replace(/\s+/g,'-').replace(/[^\w-]/g,'');
  const debounce   = (fn,ms=300) => { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms); }; };
  const throttle   = (fn,ms=300) => { let l=0; return (...a)=>{ const n=Date.now(); if(n-l>=ms){l=n;fn(...a);} }; };
  const once       = fn => { let d=false,r; return (...a)=>{ if(!d){d=true;r=fn(...a);} return r; }; };
  const qs         = (sel,ctx=document) => ctx.querySelector(sel);
  const qsa        = (sel,ctx=document) => [...ctx.querySelectorAll(sel)];
  const randomId   = (p='id') => `${p}_${Math.random().toString(36).slice(2,9)}`;
  const sleep      = ms => new Promise(r=>setTimeout(r,ms));
  const clamp      = (n,min,max) => Math.min(Math.max(n,min),max);
  const isEmpty    = v => v===null||v===undefined||v===''||(Array.isArray(v)&&!v.length);
  const pluralize  = (n,w,p) => `${n} ${n===1?w:(p||w+'s')}`;
  const copyToClipboard = async t => { try{await navigator.clipboard.writeText(t);return true;}catch{return false;} };
  const el = (tag,props={},...ch) => { const e=document.createElement(tag); Object.entries(props).forEach(([k,v])=>{ if(k==='class')e.className=v; else if(k.startsWith('on'))e.addEventListener(k.slice(2),v); else e.setAttribute(k,v); }); ch.flat().forEach(c=>e.append(typeof c==='string'?document.createTextNode(c):c)); return e; };
  return { escapeHtml,escapeAttr,formatGHS,formatDate,formatDateTime,timeAgo,daysBetween,capitalize,truncate,initials,slugify,debounce,throttle,once,qs,qsa,el,randomId,sleep,clamp,isEmpty,pluralize,copyToClipboard };
})();