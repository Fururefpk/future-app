'use strict';
window.FPH = window.FPH || {};

/** api-ui-helpers.js */
window.FPH.ApiUIHelpers = (() => {
  const esc = s => FPH.utils.escapeHtml(s);
  function renderEmpty(icon, text) { return '<div class="empty-state">'+esc(icon)+'<p>'+esc(text)+'</p></div>'; }
  function renderLoading(label) { return '<div style="padding:32px;text-align:center;color:#999;">'+esc(label||'Loading…')+'</div>'; }
  function renderError(msg) { return '<div style="padding:16px;color:#ef4444;">⚠ '+esc(msg)+'</div>'; }
  function renderListItem(left, right) { return '<div class="list-item">'+left+(right?'<div>'+right+'</div>':'')+'</div>'; }
  
  function renderNetworkIndicator(online){return '<span style="width:8px;height:8px;border-radius:50%;display:inline-block;background:'+(online?'#059669':'#ef4444')+';margin-right:6px;"></span>'+(online?'Connected':'Offline');}
  return { renderEmpty, renderLoading, renderError, renderListItem };
})();