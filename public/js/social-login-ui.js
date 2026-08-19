'use strict';
window.FPH = window.FPH || {};

window.FPH.socialLoginUI = (() => {
  function render(containerSel) {
    const c = document.querySelector(containerSel);
    if (!c) return;
    const divider = document.createElement('div');
    divider.className = 'divider-or';
    divider.innerHTML = '<span>OR</span>';
    c.appendChild(divider);
    FPH.socialLogin.PROVIDERS.forEach(p => {
      const btn = document.createElement('button');
      btn.className = 'social-btn';
      btn.innerHTML = `<span>${FPH.socialLogin.getProviderIcon(p)}</span> Continue with ${FPH.socialLogin.getProviderLabel(p)}`;
      btn.onclick = () => FPH.socialLogin.redirect(p);
      c.appendChild(btn);
    });
  }

  function renderInline(containerSel) {
    const c = document.querySelector(containerSel);
    if (!c) return;
    FPH.socialLogin.PROVIDERS.forEach(p => {
      const btn = document.createElement('button');
      btn.className = 'btn-outline';
      btn.style.cssText = 'display:flex;align-items:center;gap:8px;width:100%;margin-bottom:8px;padding:10px 16px;';
      btn.innerHTML = `<span style="font-size:18px;">${FPH.socialLogin.getProviderIcon(p)}</span>${FPH.socialLogin.getProviderLabel(p)}`;
      btn.onclick = () => FPH.socialLogin.redirect(p);
      c.appendChild(btn);
    });
  }

  return { render, renderInline };
})();