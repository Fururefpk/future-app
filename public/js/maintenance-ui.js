'use strict';
window.FPH = window.FPH || {};

window.FPH.maintenanceUI = (() => {
  function openCreateModal() {
    document.getElementById('mx-title').value    = '';
    document.getElementById('mx-desc').value     = '';
    document.getElementById('mx-priority').value = 'medium';
    document.getElementById('maintenanceModal').classList.add('active');
  }

  async function submit() {
    const title    = document.getElementById('mx-title')?.value?.trim();
    const desc     = document.getElementById('mx-desc')?.value?.trim();
    const priority = document.getElementById('mx-priority')?.value;
    const images   = [...(document.getElementById('mx-images')?.files || [])];

    if (!title) { FPH.toast.error('Title is required.'); return; }
    if (!desc)  { FPH.toast.error('Description is required.'); return; }

    // Find active tenancy for property ID
    let propertyId = '';
    try {
      const d = await FPH.tenancies.getMine({ status: 'active', limit: 1 });
      propertyId = d?.data?.tenancies?.[0]?.property?._id || d?.data?.tenancies?.[0]?.property || '';
    } catch {}

    if (!propertyId) {
      FPH.toast.error('You need an active tenancy to submit a maintenance request.');
      return;
    }

    try {
      await FPH.maintenance.create({ propertyId, title, description: desc, priority }, images);
      FPH.toast.success('Maintenance request submitted.', 'Submitted');
      document.getElementById('maintenanceModal').classList.remove('active');
      FPH.dashboard.invalidate('maintenance');
      FPH.dashboardUI.goTo('maintenance');
    } catch (e) { FPH.toast.error(e.message); }
  }

  async function updateStatus(id, status) {
    if (!status) return;
    try {
      await FPH.maintenance.update(id, { status });
      FPH.toast.success('Status updated.');
      FPH.dashboard.invalidate('maintenance');
      FPH.dashboardUI.goTo('maintenance');
    } catch (e) { FPH.toast.error(e.message); }
  }

  function openRateModal(id) {
    const rating = prompt('Rate this completed request (1-5 stars):');
    if (!rating || isNaN(Number(rating))) return;
    const comment = prompt('Add a comment (optional):') || '';
    FPH.maintenance.rateRequest(id, Number(rating), comment)
      .then(() => { FPH.toast.success('Thank you for your feedback.'); FPH.dashboard.invalidate('maintenance'); FPH.dashboardUI.goTo('maintenance'); })
      .catch(e  => FPH.toast.error(e.message));
  }

  return { openCreateModal, submit, updateStatus, openRateModal };
})();