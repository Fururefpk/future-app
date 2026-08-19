'use strict';
window.FPH = window.FPH || {};

window.FPH.tenanciesUI = (() => {
  async function decide(id, decision) {
    const reason = decision === 'rejected'
      ? prompt('Please provide a reason for rejection (will be shown to the tenant):')
      : null;
    if (decision === 'rejected' && reason === null) return;
    try {
      await FPH.tenancies.respond(id, decision, reason || '');
      FPH.toast.success(`Tenancy request ${decision}.`, decision === 'approved' ? 'Approved' : 'Rejected');
      FPH.dashboard.invalidate('tenancies');
      FPH.dashboard.invalidate('overview');
      FPH.dashboardUI.goTo('tenancies');
    } catch (e) { FPH.toast.error(e.message); }
  }

  async function endTenancy(id) {
    const reason = prompt('Reason for ending this tenancy (optional):') ?? null;
    if (reason === null) return;
    if (!confirm('End this tenancy? The tenant will be notified.')) return;
    try {
      await FPH.tenancies.end(id, reason);
      FPH.toast.success('Tenancy ended.');
      FPH.dashboard.invalidate('tenancies');
      FPH.dashboardUI.goTo('tenancies');
    } catch (e) { FPH.toast.error(e.message); }
  }

  return { decide, endTenancy };
})();