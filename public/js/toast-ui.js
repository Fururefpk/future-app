'use strict';
window.FPH = window.FPH || {};
// toast-ui.js: wrapper that adds convenience methods bound to specific contexts
window.FPH.toastUI = (() => {
  function fromApiError(e) {
    const msg = e?.data?.message || e?.message || 'Something went wrong';
    FPH.toast.error(msg);
  }
  function fromValidationErrors(errors) {
    const first = Object.values(errors||{})[0];
    if (first) FPH.toast.error(first);
  }
  function confirm(message) {
    return window.confirm(message);
  }
  function pending(message='Working…') {
    let t = null;
    const show  = () => { clearTimeout(t); FPH.toast.info(message, 999999); };
    const clear = () => { document.querySelectorAll('.fph-toast-pending').forEach(e=>e.remove()); };
    return { show, clear };
  }
  return { fromApiError, fromValidationErrors, confirm, pending };
})();