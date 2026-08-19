'use strict';
window.FPH = window.FPH || {};

window.FPH.notificationsUI = (() => {
  const I   = n => FPH.icons?.get(n) || '';
  const esc = s => FPH.utils.escapeHtml(s);
  let _open = false;

  function init() {
    window.addEventListener('fph:unread-count', e => updateBadge(e.detail.count));
    document.addEventListener('click', e => {
      const panel = document.getElementById('notifPanel');
      const btn   = document.getElementById('notifBtn');
      if (_open && panel && !panel.contains(e.target) && !btn?.contains(e.target)) {
        close();
      }
    });
  }

  function updateBadge(count) {
    const badge = document.getElementById('notifBadge');
    if (!badge) return;
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.style.display = count > 0 ? 'flex' : 'none';
  }

  async function toggle() {
    _open ? close() : await openPanel();
  }

  async function openPanel() {
    _open = true;
    const panel = document.getElementById('notifPanel');
    if (panel) panel.classList.add('open');
    await _loadNotifications();
  }

  function close() {
    _open = false;
    document.getElementById('notifPanel')?.classList.remove('open');
  }

  async function _loadNotifications() {
    const list = document.getElementById('notifList');
    if (!list) return;
    list.innerHTML = `<div class="loading-center" style="padding:24px;"><div class="loading-spinner"></div></div>`;
    try {
      const d     = await FPH.notifications.getAll({ limit: 15 });
      const items = d?.data?.inquiries || [];
      if (!items.length) {
        list.innerHTML = `<div style="text-align:center;padding:32px;color:var(--gray-400);font-size:13px;">${I('bell')} No notifications yet</div>`;
        return;
      }
      list.innerHTML = items.map(q => `
        <div class="notif-item${q.unreadCount?' unread':''}" onclick="FPH.chatUI.openThread('${esc(q._id)}');FPH.notificationsUI.close();">
          <div class="notif-item-icon" style="background:${q.unreadCount?'var(--blue-100)':'var(--gray-100)'};color:${q.unreadCount?'var(--primary)':'var(--gray-500)'};">
            ${I('message-square')}
          </div>
          <div class="notif-item-text">
            <div class="notif-item-title">${esc(q.subject||'Inquiry')}</div>
            <div class="notif-item-meta">${esc(q.property?.name||'')} &middot; ${FPH.utils.timeAgo(q.updatedAt||q.createdAt)}</div>
          </div>
          ${q.unreadCount ? `<span class="badge badge-danger" style="font-size:10px;padding:2px 6px;flex-shrink:0;">${q.unreadCount}</span>` : ''}
        </div>`).join('');
    } catch {
      list.innerHTML = `<div style="padding:16px;font-size:13px;color:var(--gray-400);">Could not load notifications.</div>`;
    }
  }

  async function markAllRead() {
    try {
      const d     = await FPH.notifications.getAll({ limit: 50 });
      const items = d?.data?.inquiries || [];
      await Promise.allSettled(items.filter(q=>q.unreadCount).map(q => FPH.chat.markRead(q._id)));
      updateBadge(0);
      await _loadNotifications();
      FPH.toast.success('All notifications marked as read.');
    } catch {}
  }

  return { init, toggle, close, openPanel, updateBadge, markAllRead };
})();