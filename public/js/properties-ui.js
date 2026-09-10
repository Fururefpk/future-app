'use strict';
window.FPH = window.FPH || {};

window.FPH.propertiesUI = (() => {
  const I   = n => FPH.icons?.get(n) || '';
  const esc = s => FPH.utils.escapeHtml(s);

  function openCreateModal() {
    document.getElementById('pm-id').value          = '';
    document.getElementById('pm-name').value        = '';
    document.getElementById('pm-type').value        = 'apartment';
    document.getElementById('pm-address').value     = '';
    document.getElementById('pm-city').value        = '';
    document.getElementById('pm-price').value       = '';
    document.getElementById('pm-rooms').value       = '2';
    document.getElementById('pm-baths').value       = '1';
    document.getElementById('pm-desc').value        = '';
    document.getElementById('propertyModalTitle').textContent = 'Add New Listing';
    document.getElementById('propertyModal').classList.add('active');
  }

  async function openEditModal(id) {
    try {
      const d = await FPH.properties.getById(id);
      const p = d?.data?.property || d?.data || {};
      document.getElementById('pm-id').value          = p._id || '';
      document.getElementById('pm-name').value        = p.name || '';
      document.getElementById('pm-type').value        = p.propertyType || 'apartment';
      document.getElementById('pm-address').value     = p.address || '';
      document.getElementById('pm-city').value        = p.city || '';
      document.getElementById('pm-price').value       = p.price || '';
      document.getElementById('pm-rooms').value       = p.rooms || '2';
      document.getElementById('pm-baths').value       = p.bathrooms || '1';
      document.getElementById('pm-desc').value        = p.description || '';
      document.getElementById('propertyModalTitle').textContent = 'Edit Listing';
      document.getElementById('propertyModal').classList.add('active');
    } catch (e) { FPH.toast.error(e.message); }
  }

  async function submit() {
    const id      = document.getElementById('pm-id').value;
    const payload = {
      name:         document.getElementById('pm-name').value.trim(),
      propertyType: document.getElementById('pm-type').value,
      address:      document.getElementById('pm-address').value.trim(),
      city:         document.getElementById('pm-city').value,
      price:        document.getElementById('pm-price').value,
      rooms:        document.getElementById('pm-rooms').value,
      bathrooms:    document.getElementById('pm-baths').value,
      description:  document.getElementById('pm-desc').value.trim(),
    };

    const { valid, errors } = FPH.validation.validate(payload, FPH.validation.schemas.property);
    if (!valid) {
      Object.entries(errors).forEach(([f, msg]) => {
        const errEl = document.getElementById(`pm-${f}-err`);
        if (errEl) { errEl.textContent = msg; errEl.classList.add('visible'); }
        const inp = document.getElementById(`pm-${f}`);
        if (inp) inp.classList.add('error');
      });
      FPH.toast.error('Please fix the highlighted fields.'); return;
    }

    const images = [...(document.getElementById('pm-images')?.files || [])];
    const btn    = document.getElementById('propertySubmitBtn');
    if (btn) { btn.disabled = true; btn.textContent = id ? 'Saving…' : 'Creating…'; }

    try {
      if (id) await FPH.properties.update(id, payload, images);
      else    await FPH.properties.create(payload, images);
      FPH.toast.success(id ? 'Listing updated.' : 'Listing created. It is now pending admin approval.', id ? 'Updated' : 'Submitted');
      document.getElementById('propertyModal').classList.remove('active');
      FPH.dashboard.invalidate('listings');
      FPH.dashboardUI.goTo('listings');
    } catch (e) { FPH.toast.error(e.message); }
    finally { if (btn) { btn.disabled = false; btn.textContent = 'Save Listing'; } }
  }

  function confirmDelete(id, name) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    FPH.properties.remove(id)
      .then(() => {
        FPH.toast.success('Listing removed.');
        FPH.dashboard.invalidate('listings');
        FPH.dashboardUI.goTo('listings');
      })
      .catch(e => FPH.toast.error(e.message));
  }

  return { openCreateModal, openEditModal, submit, confirmDelete };
})();