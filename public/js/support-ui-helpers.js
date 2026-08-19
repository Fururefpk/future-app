'use strict';
window.FPH = window.FPH || {};

/** support-ui-helpers.js */
window.FPH.SupportUIHelpers = (() => {
  const esc = s => FPH.utils.escapeHtml(s);
  function renderEmpty(icon, text) { return '<div class="empty-state">'+esc(icon)+'<p>'+esc(text)+'</p></div>'; }
  function renderLoading(label) { return '<div style="padding:32px;text-align:center;color:#999;">'+esc(label||'Loading…')+'</div>'; }
  function renderError(msg) { return '<div style="padding:16px;color:#ef4444;">⚠ '+esc(msg)+'</div>'; }
  function renderListItem(left, right) { return '<div class="list-item">'+left+(right?'<div>'+right+'</div>':'')+'</div>'; }
  
  function renderFAQItem(q,a,idx){return '<details style="border:1px solid #e5e7eb;border-radius:8px;margin-bottom:8px;padding:14px 16px;"><summary style="font-weight:600;cursor:pointer;">'+esc(q)+'</summary><p style="margin-top:10px;color:#666;font-size:14px;line-height:1.7;">'+esc(a)+'</p></details>';}
  return { renderEmpty, renderLoading, renderError, renderListItem };
})();