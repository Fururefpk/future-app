'use strict';
window.FPH = window.FPH || {};

window.FPH.rent = (() => {
  const { api, storage:{Cache} } = FPH;

  async function myInvoices(params={}) {
    const key='rent:mine:'+JSON.stringify(params);
    const hit=Cache.get(key); if(hit) return hit;
    const d = await api.get('/rent/me',{params}); Cache.set(key,d); return d;
  }

  async function getAll(params={})   { return api.get('/rent/invoices',{params}); }
  async function getById(id)         { return api.get(`/rent/invoices/${id}`); }
  async function getPayments(id)     { return api.get(`/rent/invoices/${id}/payments`); }
  async function generate(payload)   { Cache.del('rent:mine:{}'); return api.post('/rent/invoices',payload); }
  async function update(id,payload)  { Cache.del(`rent:${id}`); return api.put(`/rent/invoices/${id}`,payload); }
  async function voidInvoice(id)     { Cache.del('rent:mine:{}'); return api.del(`/rent/invoices/${id}`); }
  async function revenueSummary(p)   { return api.get('/rent/summary',{params:p}); }
  async function reminders(params)   { return api.get('/rent/reminders',{params}); }

  async function recordPayment(invoiceId, payload) {
    Cache.del('rent:mine:{}');
    return api.post(`/rent/invoices/${invoiceId}/payments`, payload, {
      idempotencyKey: `pay_${invoiceId}_${payload.transactionRef||Date.now()}`,
    });
  }

  function pdfUrl(id) {
    return `${api.BASE}/rent/invoices/${id}/pdf?token=${FPH.storage.Session.accessToken}`;
  }

  const PAYMENT_METHODS = [
    {value:'momo',  label:'Mobile Money (MoMo)'},
    {value:'bank',  label:'Bank Transfer'},
    {value:'cash',  label:'Cash'},
  ];

  const STATUS_COLORS = {
    paid:'#059669', unpaid:'#f59e0b', overdue:'#ef4444', voided:'#6b7280',
  };

  return { myInvoices, getAll, getById, getPayments, generate, update, voidInvoice, recordPayment, revenueSummary, reminders, pdfUrl, PAYMENT_METHODS, STATUS_COLORS };
})();