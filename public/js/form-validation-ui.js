'use strict';
window.FPH = window.FPH || {};

window.FPH.formValidationUI = (() => {
  // Show or clear an error message beneath a field
  function setError(fieldId, message) {
    const input = document.getElementById(fieldId);
    if (!input) return;
    let hint = input.parentElement.querySelector('.field-error');
    if (message) {
      input.style.borderColor = '#ef4444';
      if (!hint) { hint=document.createElement('div'); hint.className='field-error'; hint.style.cssText='color:#ef4444;font-size:12px;margin-top:4px;'; input.parentElement.appendChild(hint); }
      hint.textContent = message;
    } else {
      input.style.borderColor = '';
      hint?.remove();
    }
  }

  function clearErrors(formEl) {
    formEl?.querySelectorAll('.field-error').forEach(e=>e.remove());
    formEl?.querySelectorAll('input,select,textarea').forEach(i=>{ i.style.borderColor=''; });
  }

  function showErrors(errors, prefix='') {
    Object.entries(errors).forEach(([field, msg]) => {
      setError(prefix+field, msg);
    });
  }

  // Attach real-time validation to a form
  function bindSchema(formEl, schema, prefix='') {
    if (!formEl) return;
    FPH.validation.attachLive(formEl, schema, (field, err) => setError(prefix+field, err));
  }

  // Show a summary error banner above a form
  function showBanner(formEl, message) {
    let banner = formEl?.querySelector('.form-error-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.className = 'form-error-banner';
      banner.style.cssText = 'background:#fee2e2;color:#ef4444;padding:10px 14px;border-radius:6px;margin-bottom:12px;font-size:14px;';
      formEl?.prepend(banner);
    }
    banner.textContent = message;
    banner.style.display = 'block';
  }

  function hideBanner(formEl) {
    formEl?.querySelector('.form-error-banner')?.remove();
  }

  // Disable / enable submit button with loading state
  function setSubmitting(btnId, isSubmitting, loadingText='Please wait…', originalText) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn._originalText = btn._originalText || originalText || btn.textContent;
    btn.disabled     = isSubmitting;
    btn.textContent  = isSubmitting ? loadingText : btn._originalText;
  }

  return { setError, clearErrors, showErrors, bindSchema, showBanner, hideBanner, setSubmitting };
})();