'use strict';
window.FPH = window.FPH || {};

/** notifications-ui-helpers.js */
window.FPH.NotificationsUIHelpers = (() => {
  const esc = s => FPH.utils.escapeHtml(s);
  function renderEmpty(icon, text) { return '<div class="empty-state">'+esc(icon)+'<p>'+esc(text)+'</p></div>'; }
  function renderLoading(label) { return '<div style="padding:32px;text-align:center;color:#999;">'+esc(label||'Loading…')+'</div>'; }
  function renderError(msg) { return '<div style="padding:16px;color:#ef4444;">⚠ '+esc(msg)+'</div>'; }
  function renderListItem(left, right) { return '<div class="list-item">'+left+(right?'<div>'+right+'</div>':'')+'</div>'; }
  
  function renderBadge(n){return n?'<span class="notif-badge">'+( n>99?'99+':n)+'</span>':'';}
  function renderTimestamp(d){return '<span style="font-size:11px;color:#9ca3af;">'+FPH.utils.timeAgo(d)+'</span>';}
  return { renderEmpty, renderLoading, renderError, renderListItem };
})();