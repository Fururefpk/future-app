'use strict';
window.FPH = window.FPH || {};

/** form-validation-ui-helpers.js */
window.FPH.FormValidationUIHelpers = (() => {
  const esc = s => FPH.utils.escapeHtml(s);
  function renderEmpty(icon, text) { return '<div class="empty-state">'+esc(icon)+'<p>'+esc(text)+'</p></div>'; }
  function renderLoading(label) { return '<div style="padding:32px;text-align:center;color:#999;">'+esc(label||'Loading…')+'</div>'; }
  function renderError(msg) { return '<div style="padding:16px;color:#ef4444;">⚠ '+esc(msg)+'</div>'; }
  function renderListItem(left, right) { return '<div class="list-item">'+left+(right?'<div>'+right+'</div>':'')+'</div>'; }
  
  function renderFieldError(msg){return '<div style="color:#ef4444;font-size:12px;margin-top:4px;">'+esc(msg)+'</div>';}
  function renderSuccess(msg){return '<div style="color:#059669;font-size:12px;margin-top:4px;">✓ '+esc(msg)+'</div>';}
  return { renderEmpty, renderLoading, renderError, renderListItem };
})();