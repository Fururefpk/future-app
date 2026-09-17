'use strict';
window.FPH = window.FPH || {};

/** utils-ui-helpers.js */
window.FPH.UtilsUIHelpers = (() => {
  const esc = s => FPH.utils.escapeHtml(s);
  function renderEmpty(icon, text) { return '<div class="empty-state">'+esc(icon)+'<p>'+esc(text)+'</p></div>'; }
  function renderLoading(label) { return '<div style="padding:32px;text-align:center;color:#999;">'+esc(label||'Loading…')+'</div>'; }
  function renderError(msg) { return '<div style="padding:16px;color:#ef4444;">⚠ '+esc(msg)+'</div>'; }
  function renderListItem(left, right) { return '<div class="list-item">'+left+(right?'<div>'+right+'</div>':'')+'</div>'; }
  
  function renderCopyBtn(text,label){return '<button data-action="FPH.utils.copyToClipboard" data-value="'+FPH.utils.escapeAttr(text)+'" class="btn-outline-sm">📋 '+(label||'Copy')+'</button>';}
  return { renderEmpty, renderLoading, renderError, renderListItem };
})();