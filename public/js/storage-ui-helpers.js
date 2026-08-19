'use strict';
window.FPH = window.FPH || {};

/** storage-ui-helpers.js */
window.FPH.StorageUIHelpers = (() => {
  const esc = s => FPH.utils.escapeHtml(s);
  function renderEmpty(icon, text) { return '<div class="empty-state">'+esc(icon)+'<p>'+esc(text)+'</p></div>'; }
  function renderLoading(label) { return '<div style="padding:32px;text-align:center;color:#999;">'+esc(label||'Loading…')+'</div>'; }
  function renderError(msg) { return '<div style="padding:16px;color:#ef4444;">⚠ '+esc(msg)+'</div>'; }
  function renderListItem(left, right) { return '<div class="list-item">'+left+(right?'<div>'+right+'</div>':'')+'</div>'; }
  
  function renderCacheSize(){const c=FPH.storage.Cache;return 'Cache: '+c._store?.size+' items';}
  return { renderEmpty, renderLoading, renderError, renderListItem };
})();