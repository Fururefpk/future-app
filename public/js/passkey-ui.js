'use strict';
window.FPH = window.FPH || {};

window.FPH.passkeyUI = (() => {
  function renderLoginButton(containerSel) {
    const c = document.querySelector(containerSel);
    if (!c || !FPH.passkey.isSupported()) return;
    const btn = document.createElement('button');
    btn.className = 'social-btn passkey-btn';
    btn.innerHTML = '<span>🔑</span> Sign in with a passkey';
    btn.onclick = handlePasskeyLogin;
    c.appendChild(btn);
  }

  async function handlePasskeyLogin() {
    const email = document.getElementById('loginEmail')?.value?.trim();
    try {
      const d = await FPH.passkey.login(email);
      FPH.toast.success('✓ Signed in with passkey!');
      FPH.app.showDashboard();
    } catch(e) { FPH.toast.error(e.message); }
  }

  async function openRegisterModal() {
    const name = FPH.auth.getUser()?.firstName || 'My Passkey';
    if (!confirm(`Register a passkey named "${name}" for this device?`)) return;
    try {
      await FPH.passkey.register(name);
      FPH.toast.success('✓ Passkey registered! You can now sign in without a password.');
    } catch(e) { FPH.toast.error(e.message); }
  }

  function renderRegisterButton(containerSel) {
    const c = document.querySelector(containerSel);
    if (!c || !FPH.passkey.isSupported()) return;
    const btn = document.createElement('button');
    btn.className = 'btn-outline';
    btn.textContent = '🔑 Add Passkey to this Device';
    btn.onclick = openRegisterModal;
    c.appendChild(btn);
  }

  return { renderLoginButton, handlePasskeyLogin, openRegisterModal, renderRegisterButton };
})();