'use strict';
window.FPH = window.FPH || {};

window.FPH.supportUI = (() => {
  const I   = n => FPH.icons?.get(n) || '';
  const esc = s => FPH.utils.escapeHtml(s);

  function render(container) {
    container.innerHTML = `
      <div style="max-width:800px;">
        <div style="margin-bottom:24px;">
          <div class="panel-title">Help &amp; Support</div>
          <div style="font-size:13px;color:var(--gray-500);margin-top:4px;">Browse FAQs or submit a support ticket.</div>
        </div>
        <div class="tabs" id="supportTabs">
          <button class="tab-btn active" onclick="FPH.supportUI.showTab('faq',this)">Frequently Asked Questions</button>
          <button class="tab-btn"        onclick="FPH.supportUI.showTab('tickets',this)">My Tickets</button>
          <button class="tab-btn"        onclick="FPH.supportUI.showTab('new',this)">New Ticket</button>
        </div>
        <div id="supportTabContent"></div>
      </div>`;
    showTab('faq');
  }

  function showTab(tab, btnEl) {
    document.querySelectorAll('#supportTabs .tab-btn').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    const c = document.getElementById('supportTabContent');
    if (!c) return;
    if (tab === 'faq')     renderFAQ(c);
    if (tab === 'tickets') renderTickets(c);
    if (tab === 'new')     renderNew(c);
  }

  function renderFAQ(c) {
    c.innerHTML = `<div style="margin-top:20px;display:flex;flex-direction:column;gap:8px;">
      ${FPH.support.FAQ.map((item, i) => `
        <details class="faq-item" id="faq-${i}">
          <summary style="padding:16px;font-weight:600;font-size:14px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;list-style:none;-webkit-details-marker:none;">
            ${esc(item.q)}
            <span style="width:18px;height:18px;flex-shrink:0;color:var(--primary);">${I('chevron-down')}</span>
          </summary>
          <p style="padding:0 16px 16px;color:var(--gray-600);font-size:14px;line-height:1.7;margin:0;">${esc(item.a)}</p>
        </details>`).join('')}
    </div>`;
  }

  async function renderTickets(c) {
    c.innerHTML = `<div class="loading-center" style="margin-top:24px;"><div class="loading-spinner"></div></div>`;
    try {
      const d     = await FPH.support.getAll();
      const items = d?.data?.tickets || [];
      if (!items.length) {
        c.innerHTML = `<div class="empty-state" style="margin-top:20px;">
          <div class="empty-icon">${I('clipboard')}</div>
          <div class="empty-title">No Support Tickets</div>
          <div class="empty-desc">You have not submitted any support tickets yet.</div>
        </div>`;
        return;
      }
      c.innerHTML = `<div class="table-wrap" style="margin-top:20px;"><table class="data-table">
        <thead><tr><th>Subject</th><th>Category</th><th>Status</th><th>Submitted</th></tr></thead>
        <tbody>${items.map(t => `<tr>
          <td style="font-weight:500;">${esc(t.subject||'Ticket')}</td>
          <td>${FPH.utils.capitalize(t.category||'general')}</td>
          <td><span class="badge badge-${t.status==='resolved'?'success':t.status==='open'?'primary':'warning'}">${FPH.utils.capitalize(t.status||'open')}</span></td>
          <td style="font-size:12px;color:var(--gray-400);">${FPH.utils.formatDate(t.createdAt)}</td>
        </tr>`).join('')}</tbody>
      </table></div>`;
    } catch {
      c.innerHTML = `<div class="alert alert-info" style="margin-top:20px;">${I('info')} Ticket history is not available in demo mode.</div>`;
    }
  }

  function renderNew(c) {
    c.innerHTML = `<div class="card" style="margin-top:20px;">
      <div class="card-header"><h3>Submit a Support Ticket</h3></div>
      <div class="card-body">
        <div class="field-row">
          <div class="form-group">
            <label class="form-label">Category</label>
            <select class="form-control" id="ticket-cat">
              ${FPH.support.CATEGORIES.map(x => `<option value="${x}">${FPH.utils.capitalize(x)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Priority</label>
            <select class="form-control" id="ticket-priority">
              <option value="low">Low</option>
              <option value="normal" selected>Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Subject <span class="required">*</span></label>
          <input type="text" class="form-control" id="ticket-sub" placeholder="Brief description of your issue">
        </div>
        <div class="form-group">
          <label class="form-label">Message <span class="required">*</span></label>
          <textarea class="form-control" id="ticket-msg" rows="5" placeholder="Describe your issue in detail. Include any relevant property IDs or transaction references."></textarea>
        </div>
        <button class="btn btn-primary" onclick="FPH.supportUI.submit()">${I('send')} Submit Ticket</button>
      </div>
    </div>`;
  }

  async function submit() {
    const subject  = document.getElementById('ticket-sub')?.value?.trim();
    const message  = document.getElementById('ticket-msg')?.value?.trim();
    const category = document.getElementById('ticket-cat')?.value;
    if (!subject) { FPH.toast.error('Subject is required.'); return; }
    if (!message)  { FPH.toast.error('Message is required.'); return; }
    try {
      await FPH.support.create(subject, message, category);
      FPH.toast.success('Ticket submitted. We will respond within 24 hours.', 'Ticket Created');
      const btn = document.querySelector('#supportTabs .tab-btn:nth-child(2)');
      showTab('tickets', btn);
    } catch {
      FPH.toast.success('Ticket received (demo mode — not sent to server).', 'Demo Mode');
    }
  }

  return { render, showTab, submit };
})();