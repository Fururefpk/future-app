'use strict';
window.FPH = window.FPH || {};

/** camera-ui-helpers.js */
window.FPH.CameraUIHelpers = (() => {
  const esc = s => FPH.utils.escapeHtml(s);
  function renderEmpty(icon, text) { return '<div class="empty-state">'+esc(icon)+'<p>'+esc(text)+'</p></div>'; }
  function renderLoading(label) { return '<div style="padding:32px;text-align:center;color:#999;">'+esc(label||'Loading…')+'</div>'; }
  function renderError(msg) { return '<div style="padding:16px;color:#ef4444;">⚠ '+esc(msg)+'</div>'; }
  function renderListItem(left, right) { return '<div class="list-item">'+left+(right?'<div>'+right+'</div>':'')+'</div>'; }
  
  function renderPermissionError(){return '<div style="padding:20px;text-align:center;color:#ef4444;">⛔ Camera access denied.<br><small>Check your browser permissions.</small></div>';}
  function renderUnsupported(){return '<div style="padding:20px;text-align:center;color:#9ca3af;">Camera not supported in this browser.</div>';}
  return { renderEmpty, renderLoading, renderError, renderListItem };
})();