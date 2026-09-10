'use strict';
window.FPH = window.FPH || {};

window.FPH.faceAuthUI = (() => {
  function renderLoginButton(containerSel) {
    const c = document.querySelector(containerSel);
    if (!c) return;
    const btn = document.createElement('button');
    btn.className = 'social-btn';
    btn.innerHTML = '<span>👤</span> Continue with Face Recognition';
    btn.onclick = () => FPH.cameraUI.open('auth');
    c.appendChild(btn);
  }

  function showScanOverlay(videoEl) {
    const existing = document.getElementById('face-scan-overlay');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.id = 'face-scan-overlay';
    overlay.style.cssText = `
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      width:180px;height:180px;border-radius:50%;
      border:3px solid #2563eb;box-shadow:0 0 0 0 rgba(37,99,235,.4);
      animation:face-pulse 1.5s infinite;pointer-events:none;
    `;
    if (!document.getElementById('face-pulse-style')) {
      const s = document.createElement('style');
      s.id = 'face-pulse-style';
      s.textContent = `@keyframes face-pulse{0%{box-shadow:0 0 0 0 rgba(37,99,235,.4)}70%{box-shadow:0 0 0 15px rgba(37,99,235,0)}100%{box-shadow:0 0 0 0 rgba(37,99,235,0)}}`;
      document.head.appendChild(s);
    }
    videoEl?.parentElement?.appendChild(overlay);
    return overlay;
  }

  function hideScanOverlay() {
    document.getElementById('face-scan-overlay')?.remove();
  }

  function showMatchResult(success, container) {
    const div = document.createElement('div');
    div.style.cssText = `text-align:center;padding:16px;font-weight:600;font-size:16px;
      color:${success?'#059669':'#ef4444'};`;
    div.textContent = success ? '✓ Face matched!' : '✕ Face not recognised';
    container?.appendChild(div);
    setTimeout(() => div.remove(), 2000);
  }

  return { renderLoginButton, showScanOverlay, hideScanOverlay, showMatchResult };
})();