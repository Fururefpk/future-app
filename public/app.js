'use strict';
window.FPH = window.FPH || {};

window.FPH.app = (() => {
  let _initialized = false;

  async function init() {
    if (_initialized) return;
    _initialized = true;

    // Load face models (non-blocking)
    FPH.faceAuth.loadModels().catch(()=>{});

    // Handle OAuth callback if present
    if (location.search.includes('token=') || location.search.includes('error=')) {
      try {
        const d = await FPH.socialLogin.handleCallback();
        if (d?.success) { showDashboard(); return; }
      } catch(e) { FPH.toast.error(e.message); }
    }

    const dns = require("dns");

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const dns = require("dns");

// Force Node.js to use reliable DNS servers
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const express = require("express");
const mongoose = require("mongoose");


    // Restore session
    const { Session } = FPH.storage;
    if (Session.accessToken && Session.user) {
      showDashboard();
    } else {
      showAuth();
    }

    // Listen for session expiry
    window.addEventListener('fph:session-expired', () => { FPH.toast.warning('Session expired. Please sign in again.'); showAuth(); });
    window.addEventListener('fph:logout', () => showAuth());

    // Start notification polling if authed
    if (Session.accessToken) FPH.notifications.startPolling();

    // Hero slideshow on auth screen
    FPH.heroSlideshow.init('.auth-hero');
  }

  function showAuth(tab='login') {
    document.getElementById('authModal')?.classList.add('active');
    document.getElementById('header')?.setAttribute('style','display:none');
    document.getElementById('dashboard')?.classList.remove('active');
    FPH.heroSlideshow.init('.auth-hero');
    switchAuthTab(tab);
  }

  async function showDashboard() {
    document.getElementById('authModal')?.classList.remove('active');
    document.getElementById('header')?.removeAttribute('style');
    document.getElementById('dashboard')?.classList.add('active');
    FPH.heroSlideshow.destroy();

    // Update header user name
    const user = FPH.storage.Session.user;
    if (user) {
      const nameEl = document.getElementById('userName');
      if (nameEl) nameEl.textContent = user.firstName || 'User';
    }

    await FPH.dashboard.init();

    // Render the full sidebar + first tab — wait one tick so all UI
    // modules are guaranteed to have finished defining themselves.
    setTimeout(() => {
      if (window.FPH?.dashboardUI) {
        FPH.dashboardUI.renderShell();
        FPH.dashboardUI.goTo(FPH.dashboard.getCurrentTab());
      }
      window.dispatchEvent(new CustomEvent('fph:dashboard-ready'));
    }, 0);

    FPH.analytics.pageView('dashboard');
    FPH.notifications.startPolling();
  }

  function switchAuthTab(tab) {
    document.querySelectorAll('.modal-tab').forEach(btn => {
      const txt = btn.textContent.toLowerCase();
      btn.classList.toggle('active',
        (tab==='login' && txt.includes('sign')) ||
        (tab==='register' && txt.includes('create'))
      );
    });
    const lf = document.getElementById('loginForm');
    const rf = document.getElementById('registerForm');
    if (lf) lf.style.display = tab==='login' ? 'block':'none';
    if (rf) rf.style.display = tab==='register' ? 'block':'none';
  }

  async function handleLogin() {
    const email    = document.getElementById('loginEmail')?.value?.trim();
    const password = document.getElementById('loginPassword')?.value;
    const btn      = document.getElementById('loginSubmitBtn');
    if (btn) { btn.disabled=true; btn.textContent='Signing in…'; }
    try {
      const d = await FPH.auth.login({email, password});
      FPH.analytics.loginSuccess('email');
      FPH.toast.success(d._demo ? 'Signed in (demo mode)' : 'Welcome back!');
      showDashboard();
    } catch(e) {
      FPH.toast.error(e.message);
    } finally {
      if (btn) { btn.disabled=false; btn.textContent='Continue'; }
    }
  }

  async function handleRegister() {
    const payload = {
      role:       document.getElementById('registerRole')?.value,
      firstName:  document.getElementById('registerFirstName')?.value?.trim(),
      lastName:   document.getElementById('registerLastName')?.value?.trim(),
      email:      document.getElementById('registerEmail')?.value?.trim(),
      phone:      document.getElementById('registerPhone')?.value?.trim(),
      password:   document.getElementById('registerPassword')?.value,
    };
    const btn = document.getElementById('registerSubmitBtn');
    if (btn) { btn.disabled=true; btn.textContent='Creating account…'; }
    try {
      const d = await FPH.auth.register(payload);
      FPH.analytics.registerSuccess(payload.role);
      FPH.toast.success(d._demo ? 'Account created (demo mode)' : 'Account created! Verify your identity from Settings when ready.');
      showDashboard();
    } catch(e) {
      FPH.toast.error(e.message);
    } finally {
      if (btn) { btn.disabled=false; btn.textContent='Create Account'; }
    }
  }

  async function handleLogout() {
    await FPH.auth.logout();
    FPH.notifications.stopPolling();
    FPH.storage.Cache.clear();
    showAuth();
  }

  // ── Global function bridges ────────────────────────────────
  // Every onclick="" in the HTML calls one of these globals.

  window.switchAuthTab   = switchAuthTab;
  window.closeAuthModal  = closeAuthModal;
  window.handleLogin     = handleLogin;
  window.handleRegister  = handleRegister;
  window.handleLogout    = handleLogout;
  window.handleSocialLogin = p => FPH.socialLogin.redirect(p);

  window.handlePasskeyLogin = async () => {
    const email = document.getElementById('loginEmail')?.value?.trim();
    try { await FPH.passkey.login(email); showDashboard(); }
    catch(e) { FPH.toast.error(e.message); }
  };

  // Face auth globals
  window.openFaceAuth  = () => { if(window.FPH?.cameraUI) FPH.cameraUI.open('auth'); };
  window.captureFace   = () => { if(window.FPH?.cameraUI) FPH.cameraUI.capture(); };
  window.closeFaceModal = () => { if(window.FPH?.cameraUI) FPH.cameraUI.close(); };

  // Settings global — navigates to the settings tab in the dashboard
  window.openSettings = () => {
    if (window.FPH?.dashboardUI) FPH.dashboardUI.goTo('settings');
  };

  // Legacy biometric globals (older onclick references)
  window.initFaceAuthLogin  = () => window.openFaceAuth();
  window.initFaceEnrollment = () => { if(window.FPH?.cameraUI) FPH.cameraUI.open('enroll'); };
  window.closeBiometricModal = () => window.closeFaceModal();
  window.captureBiometric   = () => window.captureFace();
  window.submitGhanaCardStep = () => { if(window.FPH?.verificationUI) FPH.verificationUI.submitGhanaCard(); };

  document.addEventListener('DOMContentLoaded', init);



  return { init, showAuth, showDashboard, switchAuthTab };

  
}

)();