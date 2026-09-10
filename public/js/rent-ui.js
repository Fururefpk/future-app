'use strict';
window.FPH = window.FPH || {};

window.FPH.rentUI = (() => {
  async function openGenerateModal() {
    const sel = document.getElementById('gi-tenancy');
    if (sel) {
      sel.innerHTML = '<option>Loading tenancies…</option>';
      try {
        const d = await FPH.tenancies.getAll({ status: 'active', limit: 100 });
        const items = d?.data?.tenancies || [];
        sel.innerHTML = items.length
          ? `<option value="">Select tenancy</option>` + items.map(t =>
              `<option value="${FPH.utils.escapeAttr(t._id)}">${FPH.utils.escapeHtml(t.property?.name||'Property')} — ${FPH.utils.escapeHtml((t.tenant?.firstName||'')+' '+(t.tenant?.lastName||''))}</option>`).join('')
          : `<option value="">No active tenancies</option>`;
      } catch {
        sel.innerHTML = '<option value="">Could not load tenancies</option>';
      }
    }
    // Default due date to end of month
    const due = document.getElementById('gi-due');
    if (due && !due.value) {
      const d = new Date(); d.setMonth(d.getMonth()+1); d.setDate(0);
      due.value = d.toISOString().slice(0,10);
    }
    document.getElementById('gi-amount').value = '';
    document.getElementById('gi-desc').value   = '';
    document.getElementById('generateInvoiceModal').classList.add('active');
  }

  async function submitGenerate() {
    const tenancyId   = document.getElementById('gi-tenancy')?.value;
    const amount      = Number(document.getElementById('gi-amount')?.value);
    const dueDate     = document.getElementById('gi-due')?.value;
    const description = document.getElementById('gi-desc')?.value?.trim();
    if (!tenancyId)  { FPH.toast.error('Please select a tenancy.'); return; }
    if (!amount||amount<=0) { FPH.toast.error('Please enter a valid amount.'); return; }
    if (!dueDate)    { FPH.toast.error('Please set a due date.'); return; }
    try {
      await FPH.rent.generate({ tenancyId, amount, dueDate, description: description || `Monthly rent — ${new Date(dueDate).toLocaleString('en-GH',{month:'long',year:'numeric'})}` });
      FPH.toast.success('Invoice generated successfully.', 'Invoice Created');
      document.getElementById('generateInvoiceModal').classList.remove('active');
      FPH.dashboard.invalidate('rent');
      FPH.dashboardUI.goTo('rent');
    } catch (e) { FPH.toast.error(e.message); }
  }

  function openPayModal(invoiceId) {
    document.getElementById('pay-invoiceId').value = invoiceId;
    document.getElementById('pay-ref').value       = '';
    document.getElementById('pay-amount').value    = '';
    document.getElementById('pay-date').value      = new Date().toISOString().slice(0,10);
    document.getElementById('payModal').classList.add('active');
  }

  async function submitPayment() {
    const invoiceId = document.getElementById('pay-invoiceId')?.value;
    const payload   = {
      method:         document.getElementById('pay-method')?.value,
      transactionRef: document.getElementById('pay-ref')?.value?.trim(),
      amount:         Number(document.getElementById('pay-amount')?.value),
      paidAt:         document.getElementById('pay-date')?.value,
    };
    if (!payload.transactionRef) { FPH.toast.error('Transaction reference is required.'); return; }
    if (!payload.amount||payload.amount<=0) { FPH.toast.error('Please enter the amount paid.'); return; }
    try {
      await FPH.rent.recordPayment(invoiceId, payload);
      FPH.toast.success('Payment recorded successfully.', 'Payment Confirmed');
      document.getElementById('payModal').classList.remove('active');
      FPH.dashboard.invalidate('rent');
      FPH.dashboardUI.goTo('rent');
    } catch (e) { FPH.toast.error(e.message); }
  }

  async function voidInvoice(id) {
    if (!confirm('Void this invoice? It will be marked as cancelled and cannot be paid.')) return;
    try {
      await FPH.rent.voidInvoice(id);
      FPH.toast.success('Invoice voided.');
      FPH.dashboard.invalidate('rent');
      FPH.dashboardUI.goTo('rent');
    } catch (e) { FPH.toast.error(e.message); }
  }

  return { openGenerateModal, submitGenerate, openPayModal, submitPayment, voidInvoice };
})();