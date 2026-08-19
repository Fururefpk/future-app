'use strict';
window.FPH = window.FPH || {};

window.FPH.verificationUI = (() => {
  function render(container) {
    FPH.settingsUI.showTab('verification');
  }

  async function submitGhanaCard() {
    const number = document.getElementById('ghanaCardNumberInline')?.value?.trim();
    const name   = document.getElementById('ghanaCardNameInline')?.value?.trim();
    const file   = document.getElementById('ghanaCardImage')?.files?.[0];
    const { valid, errors } = FPH.validation.validate(
      { ghanaCardNumber: number, ghanaCardName: name },
      FPH.validation.schemas.ghanaCard
    );
    if (!valid) { FPH.toast.error(Object.values(errors)[0]); return; }
    try {
      await FPH.verification.submitGhanaCard({ number, name, imageFile: file });
      FPH.toast.success('Ghana Card submitted for review. You will be notified within 24-48 hours.', 'Submitted');
      FPH.dashboard.invalidate('settings');
      FPH.dashboardUI.goTo('settings');
    } catch (e) { FPH.toast.error(e.message); }
  }

  return { render, submitGhanaCard };
})();