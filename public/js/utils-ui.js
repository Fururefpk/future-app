'use strict';
window.FPH = window.FPH || {};
// utils-ui.js: reusable small UI component builders
window.FPH.utilsUI = (() => {
  function badge(text, type='default') {
    const COLORS = {
      default:'#e5e7eb:#374151', success:'#d1fae5:#065f46',
      danger:'#fee2e2:#991b1b', warning:'#fef3c7:#92400e', info:'#dbeafe:#1e40af'
    };
    const [bg,color] = (COLORS[type]||COLORS.default).split(':');
    const span = document.createElement('span');
    span.style.cssText = `display:inline-flex;align-items:center;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:600;background:${bg};color:${color};`;
    span.textContent = text;
    return span;
  }

  function avatar(firstName='', lastName='', size=36) {
    const div = document.createElement('div');
    div.style.cssText = `display:inline-flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:50%;background:linear-gradient(135deg,#2563eb,#0d9488);color:white;font-size:${Math.floor(size*.4)}px;font-weight:700;flex-shrink:0;`;
    div.textContent = FPH.utils.initials(firstName, lastName);
    return div;
  }

  function spinner(size=24) {
    const div = document.createElement('div');
    div.style.cssText = `width:${size}px;height:${size}px;border:3px solid #e5e7eb;border-top-color:#2563eb;border-radius:50%;animation:fph-spin .7s linear infinite;`;
    if (!document.getElementById('fph-spin-style')) {
      const s = document.createElement('style');
      s.id = 'fph-spin-style';
      s.textContent = '@keyframes fph-spin{to{transform:rotate(360deg)}}';
      document.head.appendChild(s);
    }
    return div;
  }

  function emptyState(icon, text) {
    const div = document.createElement('div');
    div.style.cssText = 'text-align:center;padding:48px 24px;color:#9ca3af;';
    div.innerHTML = `<div style="font-size:40px;margin-bottom:12px;">${icon}</div><p style="font-size:15px;">${FPH.utils.escapeHtml(text)}</p>`;
    return div;
  }

  function confirm(message, confirmText='Confirm', dangerClass=true) {
    return window.confirm(message);
  }

  return { badge, avatar, spinner, emptyState, confirm };
})();