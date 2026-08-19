'use strict';
window.FPH = window.FPH || {};

/** passkey-ui-helpers.js */
window.FPH.PasskeyUIHelpers = (() => {
  const esc = s => FPH.utils.escapeHtml(s);
  function renderEmpty(icon, text) { return '<div class="empty-state">'+esc(icon)+'<p>'+esc(text)+'</p></div>'; }
  function renderLoading(label) { return '<div style="padding:32px;text-align:center;color:#999;">'+esc(label||'Loading…')+'</div>'; }
  function renderError(msg) { return '<div style="padding:16px;color:#ef4444;">⚠ '+esc(msg)+'</div>'; }
  function renderListItem(left, right) { return '<div class="list-item">'+left+(right?'<div>'+right+'</div>':'')+'</div>'; }
  
  function renderSupported(){return FPH.passkey.isSupported()?'<span style="color:#059669;font-size:13px;">✓ Passkeys supported on this device</span>':'<span style="color:#9ca3af;font-size:13px;">Passkeys not supported in this browser</span>';}
  return { renderEmpty, renderLoading, renderError, renderListItem };
})();