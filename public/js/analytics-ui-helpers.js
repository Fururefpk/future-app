'use strict';
window.FPH = window.FPH || {};

/** analytics-ui-helpers.js */
window.FPH.AnalyticsUIHelpers = (() => {
  const esc = s => FPH.utils.escapeHtml(s);
  function renderEmpty(icon, text) { return '<div class="empty-state">'+esc(icon)+'<p>'+esc(text)+'</p></div>'; }
  function renderLoading(label) { return '<div style="padding:32px;text-align:center;color:#999;">'+esc(label||'Loading…')+'</div>'; }
  function renderError(msg) { return '<div style="padding:16px;color:#ef4444;">⚠ '+esc(msg)+'</div>'; }
  function renderListItem(left, right) { return '<div class="list-item">'+left+(right?'<div>'+right+'</div>':'')+'</div>'; }
  
  function renderStat(label,val,sub){return '<div class="stat-card"><div class="stat-value">'+esc(String(val))+'</div><div class="stat-label">'+esc(label)+'</div>'+(sub?'<div class="stat-sub">'+esc(sub)+'</div>':'')+'</div>';}
  return { renderEmpty, renderLoading, renderError, renderListItem };
})();