'use strict';
window.FPH = window.FPH || {};
// api-ui.js: shows API health / connection status in the UI
window.FPH.apiUI = (() => {
  let _status = 'unknown'; // 'online' | 'offline' | 'demo'

  async function checkHealth() {
    try {
      const r = await fetch(FPH.api.BASE.replace('/api/v1','/health'), {signal: AbortSignal.timeout(3000)});
      _status = r.ok ? 'online' : 'offline';
    } catch { _status = 'offline'; }
    if (FPH.storage.Session.isDemo) _status = 'demo';
    renderStatusBar();
    return _status;
  }

  function renderStatusBar() {
    let bar = document.getElementById('api-status-bar');
    if (_status === 'online') { bar?.remove(); return; }
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'api-status-bar';
      bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9998;text-align:center;padding:6px;font-size:13px;font-weight:600;';
      document.body.prepend(bar);
    }
    if (_status === 'demo') {
      bar.style.background = '#fef3c7'; bar.style.color = '#92400e';
      bar.textContent = '⚠ Demo mode — data is stored locally, not on the server';
    } else {
      bar.style.background = '#fee2e2'; bar.style.color = '#991b1b';
      bar.textContent = '⚠ Server unreachable — running in demo mode';
    }
  }

  function getStatus() { return _status; }

  return { checkHealth, renderStatusBar, getStatus };
})();