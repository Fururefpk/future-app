'use strict';
window.FPH = window.FPH || {};

/**
 * app.js
 * App bootstrap for the auth-only homepage. The public marketing
 * landing page (hero, property browsing, footer, etc.) has been
 * removed — the site now opens directly to the Sign In / Create
 * Account screen, and moves straight into the dashboard on success.
 */
window.FPH.app = (() => {
  const I = name => FPH.icons?.get(name) || '';
  let _initialized = false;

  /* ── Bootstrap ─────────────────────────────────────────── */
  async function init() {
    if (_initialized) return;
    _initialized = true;

    _injectIcons();
    FPH.faceAuth.loadModels().catch(() => {});

    // OAuth callback (Google/Facebook redirect back to us with a token)
    if (location.search.includes('token=') || location.search.includes('error=')) {
      try {
        const d = await FPH.socialLogin.handleCallback();
        if (d?.success) { _afterLogin(); return; }
      } catch (e) { FPH.toast.error(e.message); }
    }

    const { Session } = FPH.storage;
    if (Session.accessToken && Session.user) {
      _afterLogin();
    } else {
      showLanding();
    }

    window.addEventListener('fph:session-expired', () => {
      FPH.toast.warning('Session expired. Please sign in again.');
      showLanding();
    });
    window.addEventListener('fph:logout', showLanding);
  }

  function _injectIcons() {
    const map = {
      authLogoIcon:    'building',
      headerBrandIcon: 'building',
      notifBtnIcon:    'bell',       logoutIcon:      'log-out',
      menuToggleIcon:  'menu',       mobileMenuIcon:  'menu',
      propDetailCloseIcon: 'close',  propCloseIcon:   'close',
      invoiceCloseIcon:'close',      payCloseIcon:    'close',
      maintCloseIcon:  'close',      inqCloseIcon:    'close',
      threadCloseIcon: 'close',      biometricCloseIcon: 'close',
      chatSendIcon:    'send',       passkeyBtnIcon:  'passkey',
      faceLoginIcon:   'face',       googleIcon:      'google',
    };
    Object.entries(map).forEach(([id, icon]) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = I(icon);
    });

    const mobileBtn = document.getElementById('mobileMenuBtn');
    if (mobileBtn) {
      const mq = window.matchMedia('(max-width:768px)');
      const toggle = () => { mobileBtn.style.display = mq.matches ? 'flex' : 'none'; };
      mq.addListener(toggle); toggle();
    }
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
      const mq = window.matchMedia('(max-width:768px)');
      const toggle = () => { menuToggle.style.display = mq.matches ? 'flex' : 'none'; };
      mq.addListener(toggle); toggle();
    }
  }

  /* ── Homepage = Auth screen ───────────────────────────────
     There is no separate marketing landing page anymore — the
     site opens directly into the sign-in / create-account card. */
  function showLanding() {
    document.getElementById('header').classList.remove('visible');
    document.getElementById('dashboard').style.display = 'none';
    openAuth('login');
  }

  /* ── Auth ─────────────────────────────────────────────── */
  function openAuth(tab = 'login') {
    document.getElementById('authOverlay').classList.add('active');
    switchAuthTab(tab);
  }

  function closeAuth() {
    document.getElementById('authOverlay').classList.remove('active');
  }

  function switchAuthTab(tab) {
    document.getElementById('loginTab')?.classList.toggle('active', tab === 'login');
    document.getElementById('registerTab')?.classList.toggle('active', tab === 'register');
    document.getElementById('loginForm').style.display    = tab === 'login'    ? 'block' : 'none';
    document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
    const titles = {
      login:    ['Sign in to your account',  'Welcome back. Enter your credentials to continue.'],
      register: ['Create your account',       'Just the basics. Verify your identity from Settings after sign-up.'],
    };
    const [t, s] = titles[tab] || titles.login;
    const titleEl    = document.getElementById('authTitle');
    const subtitleEl = document.getElementById('authSubtitle');
    if (titleEl)    titleEl.textContent    = t;
    if (subtitleEl) subtitleEl.textContent = s;
  }

  async function handleLogin() {
    const email    = document.getElementById('loginEmail')?.value?.trim();
    const password = document.getElementById('loginPassword')?.value;
    if (!email || !password) { FPH.toast.error('Please enter your email and password.'); return; }
    _setLoading('loginBtn', true, 'Signing in…');
    try {
      const d = await FPH.auth.login({ email, password });
      FPH.analytics.loginSuccess('email');
      FPH.toast.success(d._demo ? 'Signed in (demo mode — backend not connected)' : 'Welcome back!');
      closeAuth();
      _afterLogin();
    } catch (e) { FPH.toast.error(e.message); }
    finally { _setLoading('loginBtn', false, 'Sign In'); }
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
    const { valid, errors } = FPH.validation.validate(payload, FPH.validation.schemas.register);
    if (!valid) {
      Object.entries(errors).forEach(([f, msg]) => {
        const errEl = document.getElementById(`register${f.charAt(0).toUpperCase()+f.slice(1)}Err`);
        if (errEl) { errEl.textContent = msg; errEl.classList.add('visible'); }
        const inputEl = document.getElementById(`register${f.charAt(0).toUpperCase()+f.slice(1)}`);
        if (inputEl) inputEl.classList.add('error');
      });
      FPH.toast.error('Please fix the highlighted fields.');
      return;
    }
    _setLoading('registerBtn', true, 'Creating account…');
    try {
      const d = await FPH.auth.register(payload);
      FPH.analytics.registerSuccess(payload.role);
      FPH.toast.success(d._demo
        ? 'Account created (demo mode). Verify your identity from Settings.'
        : 'Account created! Verify your Ghana Card and face from Settings.');
      closeAuth();
      _afterLogin();
    } catch (e) { FPH.toast.error(e.message); }
    finally { _setLoading('registerBtn', false, 'Create Account'); }
  }

  async function handleLogout() {
    await FPH.auth.logout();
    FPH.notifications.stopPolling();
    FPH.storage.Cache.clear();
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('header').classList.remove('visible');
    showLanding();
  }

  async function handlePasskeyLogin() {
    const email = document.getElementById('loginEmail')?.value?.trim();
    try { await FPH.passkey.login(email); closeAuth(); _afterLogin(); }
    catch (e) { FPH.toast.error(e.message); }
  }

  function showForgotPassword() {
    const email = prompt('Enter your email address:');
    if (!email) return;
    FPH.auth.forgotPassword(email)
      .then(() => FPH.toast.success('Password reset email sent. Check your inbox.'))
      .catch(e  => FPH.toast.error(e.message));
  }

  /* ── After login ──────────────────────────────────────── */
  async function _afterLogin() {
    const user = FPH.storage.Session.user;
    if (!user) return;

    document.getElementById('authOverlay').classList.remove('active');
    document.getElementById('header').classList.add('visible');
    document.getElementById('dashboard').style.display = 'block';

    const nameEl   = document.getElementById('userName');
    const avatarEl = document.getElementById('headerAvatar');
    const dashAvEl = document.getElementById('dashAvatar');
    if (nameEl)   nameEl.textContent   = user.firstName || 'User';
    if (avatarEl) avatarEl.textContent = FPH.utils.initials(user.firstName, user.lastName);
    if (dashAvEl) dashAvEl.textContent = FPH.utils.initials(user.firstName, user.lastName);

    await FPH.dashboard.init();
    setTimeout(() => {
      if (window.FPH?.dashboardUI) {
        FPH.dashboardUI.renderShell();
        const tab = FPH.dashboard.getCurrentTab();
        FPH.dashboardUI.goTo(tab);
      }
    }, 0);

    FPH.notifications.startPolling();
    if (window.FPH?.notificationsUI) FPH.notificationsUI.init();
    FPH.analytics.pageView('dashboard');

    const v = user.verification;
    if (!v || v.status !== 'verified') {
      setTimeout(() => FPH.toast.info('Complete your identity verification from Settings to unlock all features.'), 1500);
    }
  }

  /* ── Helpers ──────────────────────────────────────────── */
  function _setLoading(btnId, loading, text) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled    = loading;
    btn.textContent = text;
    btn.classList.toggle('loading', loading);
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    init, showLanding, openAuth, closeAuth, switchAuthTab,
    handleLogin, handleRegister, handleLogout, handlePasskeyLogin,
    showForgotPassword, _afterLogin,
  };
})();