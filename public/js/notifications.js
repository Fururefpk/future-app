'use strict';
window.FPH = window.FPH || {};

window.FPH.notifications = (() => {
  const { api } = FPH;
  let _pollTimer = null;
  let _unreadCount = 0;

  async function getUnreadCount() {
    try {
      const d = await api.get('/inquiries/unread-count');
      _unreadCount = d.data?.count || 0;
      window.dispatchEvent(new CustomEvent('fph:unread-count', {detail:{count:_unreadCount}}));
      return _unreadCount;
    } catch { return _unreadCount; }
  }

  async function getAll(params={}) {
    return api.get('/inquiries/me', {params});
  }

  async function markRead(inquiryId) {
    _unreadCount = Math.max(0, _unreadCount - 1);
    window.dispatchEvent(new CustomEvent('fph:unread-count', {detail:{count:_unreadCount}}));
    return api.patch(`/inquiries/${inquiryId}/read`, {});
  }

  function startPolling(intervalMs=30000) {
    stopPolling();
    getUnreadCount();
    _pollTimer = setInterval(getUnreadCount, intervalMs);
  }

  function stopPolling() {
    if (_pollTimer) { clearInterval(_pollTimer); _pollTimer=null; }
  }

  function getCount() { return _unreadCount; }

  // In-app notification types (for toast display on events)
  const TYPES = {
    tenancy_approved: { icon:'check-circle', msg: (d) => `Your tenancy for ${d.propertyName} was approved.`},
    tenancy_rejected: { icon:'x-circle',     msg: (d) => `Tenancy for ${d.propertyName} was rejected.`},
    invoice_due:      { icon:'receipt',       msg: (d) => `Invoice of ${FPH.utils.formatGHS(d.amount)} due ${FPH.utils.formatDate(d.dueDate)}.`},
    invoice_overdue:  { icon:'alert-triangle',msg: (d) => `Overdue invoice: ${FPH.utils.formatGHS(d.amount)}`},
    new_inquiry:      { icon:'message-square',msg: (d) => `New inquiry from ${d.senderName}`},
    verification_ok:  { icon:'shield-check',  msg: ()  => 'Your identity has been verified.'},
  };

  function push(type, data={}) {
    const t = TYPES[type];
    if (t) FPH.toast.info(`${t.icon} ${t.msg(data)}`);
  }

  return { getUnreadCount, getAll, markRead, startPolling, stopPolling, getCount, push };
})();