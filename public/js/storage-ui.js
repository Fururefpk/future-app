'use strict';
window.FPH = window.FPH || {};
// storage-ui.js: renders storage/session debug info and theme controls
window.FPH.storageUI = (() => {
  function renderThemeToggle(containerSel) {
    const c = document.querySelector(containerSel);
    if (!c) return;
    const theme = FPH.settings.getTheme();
    const btn = document.createElement('button');
    btn.className = 'btn-outline';
    btn.style.cssText = 'padding:8px 12px;font-size:13px;';
    btn.textContent = theme==='dark' ? '☀ Light Mode' : '🌙 Dark Mode';
    btn.onclick = () => {
      const next = FPH.settings.getTheme()==='dark' ? 'light' : 'dark';
      FPH.settings.setTheme(next);
      btn.textContent = next==='dark' ? '☀ Light Mode' : '🌙 Dark Mode';
    };
    c.appendChild(btn);
  }

  function renderSessionInfo(containerSel) {
    const c = document.querySelector(containerSel);
    if (!c) return;
    const s = FPH.storage.Session;
    c.innerHTML = `<div style="font-size:12px;color:#999;font-family:monospace;">
      Mode: ${s.isDemo?'Demo':'Live'} · User: ${s.user?.email||'—'} · Role: ${s.user?.role||'—'}
    </div>`;
  }

  function clearAllStorage() {
    if (!confirm('Clear all stored data including session?')) return;
    localStorage.clear();
    sessionStorage.clear();
    FPH.toast.info('Storage cleared — reloading…');
    setTimeout(()=>location.reload(), 800);
  }

  return { renderThemeToggle, renderSessionInfo, clearAllStorage };
})();