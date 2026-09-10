'use strict';
window.FPH = window.FPH || {};

/** chat-ui-helpers.js */
window.FPH.ChatUIHelpers = (() => {
  const esc = s => FPH.utils.escapeHtml(s);
  function renderEmpty(icon, text) { return '<div class="empty-state">'+esc(icon)+'<p>'+esc(text)+'</p></div>'; }
  function renderLoading(label) { return '<div style="padding:32px;text-align:center;color:#999;">'+esc(label||'Loading…')+'</div>'; }
  function renderError(msg) { return '<div style="padding:16px;color:#ef4444;">⚠ '+esc(msg)+'</div>'; }
  function renderListItem(left, right) { return '<div class="list-item">'+left+(right?'<div>'+right+'</div>':'')+'</div>'; }
  
  function renderMessage(m,mine){return '<div style="display:flex;justify-content:'+(mine?'flex-end':'flex-start')+';margin-bottom:6px;"><div style="max-width:75%;padding:10px 14px;border-radius:12px;font-size:14px;background:'+(mine?'#2563eb':'#f3f4f6')+';color:'+(mine?'white':'#0a1628')+';">'+esc(m.message||'')+'<div style="font-size:11px;opacity:.5;margin-top:3px;">'+FPH.utils.timeAgo(m.createdAt)+'</div></div></div>';}
  function renderPreview(q){return '<div style="padding:12px;border-bottom:1px solid #f3f4f6;cursor:pointer;">'+esc(q.subject||'Inquiry')+'<div style="font-size:12px;color:#9ca3af;">'+FPH.utils.timeAgo(q.updatedAt)+'</div></div>';}
  return { renderEmpty, renderLoading, renderError, renderListItem };
})();