'use strict';
window.FPH = window.FPH || {};

/** face-auth-ui-helpers.js */
window.FPH.FaceAuthUIHelpers = (() => {
  const esc = s => FPH.utils.escapeHtml(s);
  function renderEmpty(icon, text) { return '<div class="empty-state">'+esc(icon)+'<p>'+esc(text)+'</p></div>'; }
  function renderLoading(label) { return '<div style="padding:32px;text-align:center;color:#999;">'+esc(label||'Loading…')+'</div>'; }
  function renderError(msg) { return '<div style="padding:16px;color:#ef4444;">⚠ '+esc(msg)+'</div>'; }
  function renderListItem(left, right) { return '<div class="list-item">'+left+(right?'<div>'+right+'</div>':'')+'</div>'; }
  
  function renderModelStatus(){return FPH.faceAuth.modelsLoaded?'<span style="color:#059669;font-size:12px;">✓ Face AI ready</span>':'<span style="color:#f59e0b;font-size:12px;">⏳ Loading face AI…</span>';}
  return { renderEmpty, renderLoading, renderError, renderListItem };
})();