'use strict';
window.FPH = window.FPH || {};

window.FPH.settingsUI = (() => {
  const I   = n => FPH.icons?.get(n) || '';
  const esc = s => FPH.utils.escapeHtml(s);

  function render(container) {
    const u = FPH.auth.getUser() || {};
    const v = u.verification || {};

    container.innerHTML = `
      <div style="max-width:720px;">
        <div style="margin-bottom:32px;">
          <div class="panel-title">Account Settings</div>
          <div style="font-size:13px;color:var(--gray-500);margin-top:4px;">Manage your profile, security, and identity verification.</div>
        </div>

        <!-- Tabs -->
        <div class="tabs" id="settingsTabs">
          <button class="tab-btn active" onclick="FPH.settingsUI.showTab('profile',this)">Profile</button>
          <button class="tab-btn"        onclick="FPH.settingsUI.showTab('security',this)">Security</button>
          <button class="tab-btn"        onclick="FPH.settingsUI.showTab('verification',this)">Identity Verification</button>
          <button class="tab-btn"        onclick="FPH.settingsUI.showTab('notifications',this)">Notifications</button>
          <button class="tab-btn"        onclick="FPH.settingsUI.showTab('danger',this)">Account</button>
        </div>

        <div id="settingsTabContent"></div>
      </div>`;

    showTab('profile');
  }

  function showTab(tab, btnEl) {
    document.querySelectorAll('#settingsTabs .tab-btn').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    const c = document.getElementById('settingsTabContent');
    if (!c) return;
    const u = FPH.auth.getUser() || {};
    const v = u.verification || {};

    switch (tab) {
      case 'profile':      c.innerHTML = _profileTab(u);      break;
      case 'security':     c.innerHTML = _securityTab();       break;
      case 'verification': c.innerHTML = _verificationTab(v);  break;
      case 'notifications':c.innerHTML = _notificationsTab();  break;
      case 'danger':       c.innerHTML = _dangerTab();         break;
    }
  }

  function _profileTab(u) {
    return `<div class="card" style="margin-top:20px;">
      <div class="card-header"><h3>Personal Information</h3></div>
      <div class="card-body">
        <div class="field-row">
          <div class="form-group">
            <label class="form-label">First Name</label>
            <input type="text" class="form-control" id="s-firstName" value="${esc(u.firstName||'')}">
          </div>
          <div class="form-group">
            <label class="form-label">Last Name</label>
            <input type="text" class="form-control" id="s-lastName" value="${esc(u.lastName||'')}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Email Address</label>
          <input type="email" class="form-control" id="s-email" value="${esc(u.email||'')}" disabled>
          <div class="form-hint">Contact support to change your email address.</div>
        </div>
        <div class="form-group">
          <label class="form-label">Phone Number</label>
          <input type="tel" class="form-control" id="s-phone" value="${esc(u.phone||'')}">
        </div>
        <div class="form-group">
          <label class="form-label">Account Role</label>
          <input type="text" class="form-control" value="${esc(FPH.utils.capitalize(u.role||''))}" disabled>
        </div>
        <button class="btn btn-primary" onclick="FPH.settingsUI.saveProfile()">Save Changes</button>
      </div>
    </div>`;
  }

  function _securityTab() {
    return `<div class="card" style="margin-top:20px;">
      <div class="card-header"><h3>Change Password</h3></div>
      <div class="card-body">
        <div class="form-group">
          <label class="form-label">Current Password <span class="required">*</span></label>
          <input type="password" class="form-control" id="s-currPwd" placeholder="Enter current password" autocomplete="current-password">
        </div>
        <div class="form-group">
          <label class="form-label">New Password <span class="required">*</span></label>
          <input type="password" class="form-control" id="s-newPwd" placeholder="Minimum 8 characters" autocomplete="new-password">
        </div>
        <div class="form-group">
          <label class="form-label">Confirm New Password <span class="required">*</span></label>
          <input type="password" class="form-control" id="s-confirmPwd" placeholder="Repeat new password" autocomplete="new-password">
        </div>
        <button class="btn btn-primary" onclick="FPH.settingsUI.changePassword()">Update Password</button>
      </div>
    </div>
    <div class="card" style="margin-top:16px;">
      <div class="card-header"><h3>Passkey Authentication</h3></div>
      <div class="card-body">
        <p style="margin-bottom:16px;">Register a passkey to sign in without a password using your device biometrics (fingerprint, Face ID).</p>
        ${FPH.passkey.isSupported()
          ? `<button class="btn btn-outline" onclick="FPH.passkeyUI.openRegisterModal()">${I('passkey')} Register a Passkey</button>`
          : `<div class="alert alert-warning">${I('alert-triangle')} Passkeys are not supported in this browser.</div>`}
      </div>
    </div>`;
  }

  function _verificationTab(v) {
    const ghanaVerified = !!v.ghanaCardVerified;
    const faceVerified  = !!v.faceVerified;
    const statusClass   = v.status==='verified'?'success':v.status==='pending'?'warning':'neutral';

    return `<div style="margin-top:20px;">
      <div class="alert alert-info" style="margin-bottom:20px;">
        ${I('info')}
        <div>Overall Status: <strong><span class="badge badge-${statusClass}">${FPH.utils.capitalize(v.status||'unverified')}</span></strong>
        ${v.status!=='verified'?' — Complete both steps below to unlock all platform features.':' — Your identity is fully verified.'}</div>
      </div>

      <div class="verify-steps">
        <!-- Step 1: Ghana Card -->
        <div class="verify-step${ghanaVerified?' completed':v.submittedAt?' active':''}">
          <div class="verify-step-num">${ghanaVerified?I('check'):'1'}</div>
          <div class="verify-step-body">
            <div class="verify-step-title">Ghana Card Verification ${ghanaVerified?'<span class="badge badge-success">Verified</span>':v.submittedAt?'<span class="badge badge-warning">Under Review</span>':''}</div>
            <div class="verify-step-desc">Enter your Ghana Card details for admin review. Approval typically takes 24–48 hours.</div>
            ${!ghanaVerified && !v.submittedAt ? `
              <div class="field-row" style="margin-bottom:16px;">
                <div class="form-group">
                  <label class="form-label">Ghana Card Number <span class="required">*</span></label>
                  <input type="text" class="form-control" id="ghanaCardNumberInline" placeholder="GHA-XXXXXXXXX-X" value="${esc(v.ghanaCardNumber||'')}">
                  <div class="form-hint">Format: GHA-XXXXXXXXX-X (all digits)</div>
                </div>
                <div class="form-group">
                  <label class="form-label">Full Name on Card <span class="required">*</span></label>
                  <input type="text" class="form-control" id="ghanaCardNameInline" placeholder="As printed on your card" value="${esc(v.ghanaCardName||'')}">
                </div>
              </div>
              <div class="form-group" style="margin-bottom:16px;">
                <label class="form-label">Card Photo (optional but recommended)</label>
                <input type="file" class="form-control" id="ghanaCardImage" accept="image/*">
              </div>
              <button class="btn btn-primary" onclick="FPH.verificationUI.submitGhanaCard()">${I('upload')} Submit Ghana Card</button>` : ''}
            ${v.submittedAt && !ghanaVerified ? `<div class="alert alert-warning" style="margin-top:12px;">${I('clock')} Submitted on ${FPH.utils.formatDate(v.submittedAt)}. Awaiting admin review.</div>` : ''}
          </div>
        </div>

        <!-- Step 2: Face -->
        <div class="verify-step${faceVerified?' completed':''}">
          <div class="verify-step-num">${faceVerified?I('check'):'2'}</div>
          <div class="verify-step-body">
            <div class="verify-step-title">Face Verification ${faceVerified?'<span class="badge badge-success">Enrolled</span>':''}</div>
            <div class="verify-step-desc">We capture a live photo and match it to confirm your identity. Your face data is stored as a mathematical descriptor only — no photos are retained.</div>
            ${!faceVerified
              ? `<button class="btn btn-primary" onclick="FPH.cameraUI.open('enroll')">${I('camera')} Start Face Capture</button>`
              : `<div style="display:flex;gap:12px;margin-top:12px;">
                  <button class="btn btn-outline" onclick="FPH.cameraUI.open('enroll')">${I('refresh')} Re-enroll</button>
                  <button class="btn btn-ghost" onclick="FPH.verification.deleteFace().then(()=>{FPH.toast.info('Face data removed.');FPH.dashboardUI.goTo('settings');})">${I('trash')} Remove</button>
                </div>`}
          </div>
        </div>
      </div>
    </div>`;
  }

  function _notificationsTab() {
    const u = FPH.auth.getUser() || {};
    const n = u.notificationPreferences || {};
    return `<div class="card" style="margin-top:20px;">
      <div class="card-header"><h3>Notification Preferences</h3></div>
      <div class="card-body">
        ${[
          ['email',   'Email Notifications', 'Receive updates via email'],
          ['sms',     'SMS Notifications',   'Receive SMS for urgent alerts'],
          ['reminders','Payment Reminders',  'Get reminded about upcoming due dates'],
        ].map(([key, label, desc]) => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--gray-100);">
            <div><div style="font-weight:500;font-size:14px;">${label}</div><div style="font-size:12px;color:var(--gray-500);">${desc}</div></div>
            <label style="display:flex;align-items:center;cursor:pointer;gap:8px;">
              <input type="checkbox" id="notif-${key}" ${n[key]!==false?'checked':''} style="width:16px;height:16px;">
            </label>
          </div>`).join('')}
        <button class="btn btn-primary" style="margin-top:20px;" onclick="FPH.settingsUI.saveNotifications()">Save Preferences</button>
      </div>
    </div>`;
  }

  function _dangerTab() {
    return `<div class="card" style="margin-top:20px;border-color:var(--red-200);">
      <div class="card-header" style="background:var(--red-50);">
        <h3 style="color:var(--danger);">${I('alert-triangle')} Danger Zone</h3>
      </div>
      <div class="card-body">
        <p style="margin-bottom:16px;">Permanently delete your account and all associated data. This action is irreversible and cannot be undone.</p>
        <button class="btn btn-danger" onclick="FPH.settingsUI.confirmDelete()">${I('trash')} Delete My Account</button>
      </div>
    </div>`;
  }

  /* ── Actions ────────────────────────────────────────────── */
  async function saveProfile() {
    const payload = {
      firstName: document.getElementById('s-firstName')?.value?.trim(),
      lastName:  document.getElementById('s-lastName')?.value?.trim(),
      phone:     document.getElementById('s-phone')?.value?.trim(),
    };
    if (!payload.firstName || !payload.lastName) { FPH.toast.error('First and last name are required.'); return; }
    try {
      await FPH.settings.updateProfile(payload);
      FPH.toast.success('Profile updated successfully.');
    } catch (e) { FPH.toast.error(e.message); }
  }

  async function changePassword() {
    const curr    = document.getElementById('s-currPwd')?.value;
    const next    = document.getElementById('s-newPwd')?.value;
    const confirm = document.getElementById('s-confirmPwd')?.value;
    if (!curr || !next || !confirm) { FPH.toast.error('All password fields are required.'); return; }
    if (next.length < 8) { FPH.toast.error('New password must be at least 8 characters.'); return; }
    if (next !== confirm) { FPH.toast.error('New passwords do not match.'); return; }
    try {
      await FPH.settings.changePassword(curr, next);
      FPH.toast.success('Password updated successfully.');
      ['s-currPwd','s-newPwd','s-confirmPwd'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
    } catch (e) { FPH.toast.error(e.message); }
  }

  async function saveNotifications() {
    const prefs = {
      email:     document.getElementById('notif-email')?.checked,
      sms:       document.getElementById('notif-sms')?.checked,
      reminders: document.getElementById('notif-reminders')?.checked,
    };
    try {
      await FPH.settings.updateNotifications(prefs);
      FPH.toast.success('Notification preferences saved.');
    } catch (e) { FPH.toast.error(e.message); }
  }

  function confirmDelete() {
    const pwd = prompt('Enter your password to permanently delete your account:');
    if (!pwd) return;
    if (!confirm('This action is permanent and cannot be undone. Delete your account?')) return;
    FPH.settings.deleteAccount(pwd)
      .then(() => { FPH.toast.info('Your account has been deleted.'); FPH.app.handleLogout(); })
      .catch(e  => FPH.toast.error(e.message));
  }

  return { render, showTab, saveProfile, changePassword, saveNotifications, confirmDelete };
})();