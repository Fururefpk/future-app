'use strict';
window.FPH = window.FPH || {};

window.FPH.toast = (() => {
  const ICONS = {
    success: 'check-circle',
    error:   'x-circle',
    warning: 'alert-triangle',
    info:    'info',
  };
  let _queue = [], _active = 0, MAX = 5;

  function _container() {
    let c = document.getElementById('toast-container');
    if (!c) { c = document.createElement('div'); c.id = 'toast-container'; document.body.appendChild(c); }
    return c;
  }

  function show(message, type = 'success', duration = 4000, title = '') {
    if (_active >= MAX) { _queue.push({ message, type, duration, title }); return; }
    _active++;
    const icon = FPH.icons ? FPH.icons.get(ICONS[type] || 'info') : '';
    const t    = document.createElement('div');
    t.className = `toast toast-${type} animate-fade-in`;
    t.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${FPH.utils.escapeHtml(title)}</div>` : ''}
        <div class="${title ? 'toast-message' : 'toast-title'}">${FPH.utils.escapeHtml(message)}</div>
      </div>
      <button class="toast-dismiss" aria-label="Dismiss">
        ${FPH.icons ? FPH.icons.get('x') : '&times;'}
      </button>`;
    t.querySelector('.toast-dismiss').onclick = () => _remove(t);
    _container().appendChild(t);
    const timer = setTimeout(() => _remove(t), duration);
    t._timer = timer;
  }

  function _remove(t) {
    clearTimeout(t._timer);
    t.style.opacity = '0'; t.style.transform = 'translateX(100%)';
    t.style.transition = 'opacity .25s, transform .25s';
    setTimeout(() => {
      t.remove(); _active--;
      if (_queue.length) { const n = _queue.shift(); show(n.message, n.type, n.duration, n.title); }
    }, 260);
  }

  const success = (m, title) => show(m, 'success', 4000, title);
  const error   = (m, title) => show(m, 'error',   5000, title);
  const warning = (m, title) => show(m, 'warning', 4500, title);
  const info    = (m, title) => show(m, 'info',    4000, title);

  return { show, success, error, warning, info };
})();

// Global alias
window.showToast = (msg, type) => FPH.toast.show(msg, type);