'use strict';
window.FPH = window.FPH || {};

/** verification-ui-helpers.js */
window.FPH.VerificationUIHelpers = (() => {
  const esc = s => FPH.utils.escapeHtml(s);
  function renderEmpty(icon, text) { return '<div class="empty-state">'+esc(icon)+'<p>'+esc(text)+'</p></div>'; }
  function renderLoading(label) { return '<div style="padding:32px;text-align:center;color:#999;">'+esc(label||'Loading…')+'</div>'; }
  function renderError(msg) { return '<div style="padding:16px;color:#ef4444;">⚠ '+esc(msg)+'</div>'; }
  function renderListItem(left, right) { return '<div class="list-item">'+left+(right?'<div>'+right+'</div>':'')+'</div>'; }
  
  function renderStep(label,done,pending){const icon=done?'✓':pending?'⏳':'○';const col=done?'#059669':pending?'#f59e0b':'#9ca3af';return '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #f3f4f6;"><span style="width:26px;height:26px;border-radius:50%;background:'+col+'20;color:'+col+';display:flex;align-items:center;justify-content:center;font-weight:700;">'+icon+'</span><span style="font-size:14px;color:'+col+';">'+esc(label)+'</span></div>';}
  function renderProgress(v){return renderStep('Ghana Card',!!v?.ghanaCardVerified,!!v?.submittedAt&&!v?.ghanaCardVerified)+renderStep('Face Enrolled',!!v?.faceVerified,false)+renderStep('Verified',v?.status==='verified',v?.status==='pending');}
  return { renderEmpty, renderLoading, renderError, renderListItem };
})();