'use strict';
window.FPH = window.FPH || {};

/** toast-ui-helpers.js */
window.FPH.ToastUIHelpers = (() => {
  const esc = s => FPH.utils.escapeHtml(s);
  function renderEmpty(icon, text) { return '<div class="empty-state">'+esc(icon)+'<p>'+esc(text)+'</p></div>'; }
  function renderLoading(label) { return '<div style="padding:32px;text-align:center;color:#999;">'+esc(label||'Loading…')+'</div>'; }
  function renderError(msg) { return '<div style="padding:16px;color:#ef4444;">⚠ '+esc(msg)+'</div>'; }
  function renderListItem(left, right) { return '<div class="list-item">'+left+(right?'<div>'+right+'</div>':'')+'</div>'; }
  
  function renderActionToast(msg,actionLabel,onAction){const id='ta_'+Date.now();setTimeout(()=>{ const el=document.getElementById(id); if(el){const btn=document.createElement('button');btn.textContent=actionLabel;btn.style.cssText='margin-left:12px;font-weight:700;text-decoration:underline;background:none;border:none;cursor:pointer;';btn.onclick=()=>{onAction();el.remove();};el.appendChild(btn);}},50);FPH.toast.info(msg);return id;}
  return { renderEmpty, renderLoading, renderError, renderListItem };
})();