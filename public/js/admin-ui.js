'use strict';
window.FPH = window.FPH || {};

window.FPH.adminUI = (() => {
  const _debSearch = FPH.utils.debounce(async (q) => {
    const d = await FPH.admin.getUsers({ search: q }).catch(() => null);
    if (d) {
      const panel = document.getElementById('dashPanel');
      if (panel) panel.innerHTML = FPH.dashboardUIHelpers2.renderUsers(d);
    }
  }, 400);

  async function reviewProperty(id, decision) {
    const reason = decision === 'rejected' ? prompt('Reason for rejection (will be emailed to the landlord):') : null;
    if (decision === 'rejected' && reason === null) return;
    try {
      await FPH.admin.reviewProperty(id, decision, reason || '');
      FPH.toast.success(`Property ${decision}.`, decision === 'approved' ? 'Approved' : 'Rejected');
      FPH.dashboard.invalidate('properties');
      FPH.dashboard.invalidate('overview');
      FPH.dashboardUI.goTo('properties');
    } catch (e) { FPH.toast.error(e.message); }
  }

  async function toggleUser(id, activate) {
    const reason = !activate ? (prompt('Reason for suspension (optional, will be emailed to user):') ?? null) : '';
    if (!activate && reason === null) return;
    try {
      await FPH.admin.setUserActive(id, activate, reason);
      FPH.toast.success(`User ${activate ? 'activated' : 'suspended'}.`);
      FPH.dashboard.invalidate('users');
      FPH.dashboardUI.goTo('users');
    } catch (e) { FPH.toast.error(e.message); }
  }

  async function changeRole(id, role) {
    if (!role) return;
    if (!confirm(`Change this user's role to "${role}"?`)) return;
    try {
      await FPH.admin.changeUserRole(id, role);
      FPH.toast.success('User role updated.');
      FPH.dashboard.invalidate('users');
      FPH.dashboardUI.goTo('users');
    } catch (e) { FPH.toast.error(e.message); }
  }

  function searchUsers(query) { _debSearch(query); }

  async function filterUsers(role) {
    const d = await FPH.admin.getUsers({ role: role || undefined }).catch(() => null);
    if (d) {
      const panel = document.getElementById('dashPanel');
      if (panel) panel.innerHTML = FPH.dashboardUIHelpers2.renderUsers(d);
    }
  }

  async function reviewVerification(userId, decision) {
    const reason = decision === 'rejected' ? prompt('Reason for rejection:') : null;
    if (decision === 'rejected' && reason === null) return;
    try {
      await FPH.admin.reviewVerification(userId, decision, reason || '');
      FPH.toast.success(`Verification ${decision}.`);
      FPH.dashboard.invalidate('verifications');
      FPH.dashboard.invalidate('overview');
      FPH.dashboardUI.goTo('verifications');
    } catch (e) { FPH.toast.error(e.message); }
  }

  async function override(userId) {
    const reason = prompt('Reason for manual verification override:');
    if (!reason) { FPH.toast.error('A reason is required for admin override.'); return; }
    try {
      await FPH.admin.overrideVerification(userId, reason);
      FPH.toast.success('User manually verified.');
      FPH.dashboard.invalidate('verifications');
      FPH.dashboardUI.goTo('verifications');
    } catch (e) { FPH.toast.error(e.message); }
  }

  return { reviewProperty, toggleUser, changeRole, searchUsers, filterUsers, reviewVerification, override };
})();