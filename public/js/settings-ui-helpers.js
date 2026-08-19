'use strict';
window.FPH = window.FPH || {};

/** settings-ui-helpers.js */
window.FPH.SettingsUIHelpers = (() => {
  const esc = s => FPH.utils.escapeHtml(s);
  function renderEmpty(icon, text) { return '<div class="empty-state">'+esc(icon)+'<p>'+esc(text)+'</p></div>'; }
  function renderLoading(label) { return '<div style="padding:32px;text-align:center;color:#999;">'+esc(label||'Loading…')+'</div>'; }
  function renderError(msg) { return '<div style="padding:16px;color:#ef4444;">⚠ '+esc(msg)+'</div>'; }
  function renderListItem(left, right) { return '<div class="list-item">'+left+(right?'<div>'+right+'</div>':'')+'</div>'; }
  
  function renderSectionHeader(title,sub){return '<div style="margin-bottom:16px;"><h3 style="margin-bottom:4px;">'+esc(title)+'</h3>'+(sub?'<p style="color:#9ca3af;font-size:13px;">'+esc(sub)+'</p>':'')+'</div>';}
  return { renderEmpty, renderLoading, renderError, renderListItem };
})();