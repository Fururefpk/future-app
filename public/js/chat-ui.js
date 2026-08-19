'use strict';
window.FPH = window.FPH || {};

window.FPH.chatUI = (() => {
  const I   = n => FPH.icons?.get(n) || '';
  const esc = s => FPH.utils.escapeHtml(s);
  let _currentId = null;

  /* ── New inquiry modal ─────────────────────────────────── */
  function openNewModal() {
    if (!FPH.storage.Session.isDemo && !FPH.auth.isVerified()) {
      FPH.toast.warning('Identity verification required to send inquiries. Please verify from Settings.', 'Verification Required');
      FPH.dashboardUI.goTo('settings'); return;
    }
    _loadPropertyOptions();
    document.getElementById('inq-subject').value = '';
    document.getElementById('inq-message').value = '';
    document.getElementById('newInquiryModal').classList.add('active');
  }

  async function _loadPropertyOptions() {
    const sel = document.getElementById('inq-propertyId');
    if (!sel) return;
    try {
      const d = await FPH.api.get('/properties', { params: { status: 'approved', limit: 100 }, auth: false });
      const props = d?.data?.properties || [];
      sel.innerHTML = props.length
        ? `<option value="">Select a property</option>` + props.map(p =>
            `<option value="${esc(p._id)}">${esc(p.name)} — ${esc(p.city)}</option>`).join('')
        : `<option value="">No properties available</option>`;
    } catch {
      sel.innerHTML = `<option value="">Could not load properties</option>`;
    }
  }

  async function sendNew() {
    const propertyId = document.getElementById('inq-propertyId')?.value;
    const subject    = document.getElementById('inq-subject')?.value?.trim();
    const message    = document.getElementById('inq-message')?.value?.trim();
    if (!propertyId) { FPH.toast.error('Please select a property.'); return; }
    if (!subject)    { FPH.toast.error('Please enter a subject.'); return; }
    if (!message)    { FPH.toast.error('Please enter a message.'); return; }
    try {
      await FPH.chat.create(propertyId, subject, message);
      FPH.toast.success('Inquiry sent successfully.');
      document.getElementById('newInquiryModal').classList.remove('active');
      FPH.dashboard.invalidate('inquiries');
      FPH.dashboardUI.goTo('inquiries');
    } catch (e) { FPH.toast.error(e.message); }
  }

  /* ── Thread modal ──────────────────────────────────────── */
  async function openThread(id) {
    _currentId = id;
    const modal = document.getElementById('chatThreadModal');
    if (!modal) return;
    modal.classList.add('active');
    await _renderThread(id);
    FPH.chat.markRead(id).catch(() => {});
  }

  async function _renderThread(id) {
    const container = document.getElementById('chatMessages');
    const titleEl   = document.getElementById('threadTitle');
    const metaEl    = document.getElementById('threadMeta');
    if (!container) return;

    container.innerHTML = `<div class="loading-center" style="padding:32px;"><div class="loading-spinner"></div></div>`;

    try {
      const d = await FPH.chat.getById(id);
      const q = d?.data?.inquiry;
      if (!q) throw new Error('Inquiry not found');

      if (titleEl) titleEl.textContent = q.subject || 'Conversation';
      if (metaEl)  metaEl.textContent  = q.property?.name ? `Re: ${q.property.name}` : '';

      const me = FPH.auth.getUser()?._id;
      const replies = q.replies || [];

      if (!replies.length) {
        container.innerHTML = `<div style="text-align:center;padding:32px;color:var(--gray-400);font-size:13px;">
          ${I('message-square')} No messages yet. Send the first one below.</div>`;
        return;
      }

      container.innerHTML = replies.map(r => {
        const mine = r.sender?._id === me || r.sender === me;
        const name = r.sender?.firstName ? `${r.sender.firstName} ${r.sender.lastName||''}`.trim() : '';
        return `<div class="chat-msg${mine ? ' mine' : ''}">
          ${!mine ? `<div class="table-avatar" style="width:32px;height:32px;font-size:11px;flex-shrink:0;">${esc(FPH.utils.initials(r.sender?.firstName||'',r.sender?.lastName||''))}</div>` : ''}
          <div>
            ${!mine && name ? `<div style="font-size:11px;color:var(--gray-500);margin-bottom:3px;">${esc(name)}</div>` : ''}
            <div class="chat-bubble">${esc(r.message || '')}</div>
            <div class="chat-time">${FPH.utils.timeAgo(r.createdAt)}</div>
          </div>
        </div>`;
      }).join('');

      container.scrollTop = container.scrollHeight;
    } catch (e) {
      container.innerHTML = `<div class="alert alert-danger" style="margin:16px;">${I('alert-circle')} ${esc(e.message)}</div>`;
    }
  }

  async function sendReply() {
    if (!_currentId) return;
    const input = document.getElementById('threadReply');
    const msg   = input?.value?.trim();
    if (!msg) return;
    input.value = '';
    try {
      await FPH.chat.reply(_currentId, msg);
      await _renderThread(_currentId);
      FPH.dashboard.invalidate('inquiries');
    } catch (e) {
      FPH.toast.error(e.message);
      if (input) input.value = msg;
    }
  }

  async function close(id) {
    try {
      await FPH.chat.close(id);
      FPH.toast.success('Inquiry closed.');
      FPH.dashboard.invalidate('inquiries');
      FPH.dashboardUI.goTo('inquiries');
    } catch (e) { FPH.toast.error(e.message); }
  }

  return { openNewModal, sendNew, openThread, sendReply, close };
})();