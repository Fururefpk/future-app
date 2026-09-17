'use strict';
window.FPH = window.FPH || {};

window.FPH.app = (() => {
  const I = name => FPH.icons?.get(name) || '';
  let _propertiesPage = 1;
  let _propertiesTotal = 0;
  let _initialized = false;

  /* ── Bootstrap ─────────────────────────────────────────── */
  async function init() {
    if (_initialized) return;
    _initialized = true;

    _injectIcons();
    FPH.faceAuth.loadModels().catch(() => {});

    // OAuth callback
    if (location.search.includes('token=') || location.search.includes('error=')) {
      try {
        const d = await FPH.socialLogin.handleCallback();
        if (d?.success) {
          const target = '/dashboard.html';
          if (window.location.pathname !== target) window.location.replace(target);
          return;
        }
      } catch (e) { FPH.toast.error(e.message); }
    }

    const { Session } = FPH.storage;
    if (Session.accessToken && Session.user) {
      if (!window.location.pathname.endsWith('/dashboard.html') && !window.location.pathname.endsWith('/dashboard')) {
        window.location.replace('/dashboard.html');
        return;
      }
      if (FPH.rentUI?.handlePaystackReturn) FPH.rentUI.handlePaystackReturn();
      _afterLogin();
    } else {
      if (window.location.pathname.endsWith('/dashboard.html') || window.location.pathname.endsWith('/dashboard')) {
        window.location.replace('/');
        return;
      }
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
      navBrandIcon:    'building',   authLogoIcon:    'building',
      headerBrandIcon: 'building',   heroTagIcon:     'shield-check',
      heroSearchIcon:  'search',     filterSearchIcon:'search',
      step1Icon:       'user',       step2Icon:       'search',
      step3Icon:       'check-circle',
      trustIcon1:      'id',         trustIcon2:      'camera',
      trustIcon3:      'shield',     trustIcon4:      'credit-card',
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
    // Inject media query toggle for mobile menu
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

  /* ── Landing page ──────────────────────────────────────── */
  function showLanding() {
    const authOverlay = document.getElementById('authOverlay');
    const header      = document.getElementById('header');
    const dashboard   = document.getElementById('dashboard');

    if (authOverlay) authOverlay.classList.add('active');
    if (header) header.classList.remove('visible');
    if (dashboard) {
      dashboard.classList.remove('active');
      dashboard.style.display = 'none';
    }

    switchAuthTab('login');
  }

  async function _animateStats() {
    try {
      const d = await FPH.api.get('/properties', { params: { limit: 1 }, auth: false });
      const total = d?.data?.total || 124;
      _countUp('statListings',  total,  800);
      _countUp('statLandlords', Math.floor(total * 0.4) + 10, 800);
      _countUp('statTenants',   Math.floor(total * 1.5) + 50, 800);
    } catch {
      _countUp('statListings',  124, 800);
      _countUp('statLandlords', 61,  800);
      _countUp('statTenants',   186, 800);
    }
  }

  function _countUp(id, target, duration) {
    const el = document.getElementById(id);
    if (!el) return;
    const start = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1);
      el.textContent = Math.floor(p * target).toLocaleString();
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  async function _loadFeaturedProperties(params = {}) {
    const grid = document.getElementById('propertiesGrid');
    if (!grid) return;
    if (_propertiesPage === 1) grid.innerHTML = `<div class="loading-center" style="grid-column:1/-1"><div class="loading-spinner"></div><span>Loading properties&hellip;</span></div>`;
    try {
      const q = { status: 'approved', limit: 9, page: _propertiesPage, ...params };
      if (!q.city)        delete q.city;
      if (!q.propertyType)delete q.propertyType;
      if (!q.maxPrice)    delete q.maxPrice;
      if (!q.minRooms)    delete q.minRooms;

      const d = await FPH.api.get('/properties', { params: q, auth: false });
      const props  = d?.data?.properties || [];
      _propertiesTotal = d?.data?.total || 0;

      if (_propertiesPage === 1) grid.innerHTML = '';

      if (!props.length && _propertiesPage === 1) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
          <div class="empty-icon">${I('building')}</div>
          <div class="empty-title">No Properties Found</div>
          <div class="empty-desc">Try adjusting your search filters.</div>
        </div>`;
      } else {
        props.forEach(p => {
          const card = document.createElement('div');
          card.innerHTML = _renderPropertyCard(p);
          grid.appendChild(card.firstElementChild);
        });
      }

      const loadMoreBtn = document.getElementById('loadMoreBtn');
      if (loadMoreBtn) {
        const shown = _propertiesPage * 9;
        loadMoreBtn.style.display = shown < _propertiesTotal ? 'inline-flex' : 'none';
      }
    } catch (e) {
      if (_propertiesPage === 1) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
          <div class="empty-icon">${I('building')}</div>
          <div class="empty-title">Could Not Load Properties</div>
          <div class="empty-desc">Running in demo mode &mdash; no live listings available.</div>
          <button class="btn btn-outline" data-action="FPH.app.openAuth" data-value="register">Create Account to List</button>
        </div>`;
      }
    }
  }

  function _renderPropertyCard(p) {
    const img = p.images?.[0]?.url;
    const price = FPH.utils.formatGHS(p.price);
    const name  = FPH.utils.escapeHtml(p.name || '');
    const city  = FPH.utils.escapeHtml(p.city || '');
    const type  = FPH.utils.capitalize(p.propertyType || '');
    const id    = FPH.utils.escapeAttr(p._id);
    return `<div class="property-card">
      ${img
        ? `<div class="property-img" style="background-image:url('${FPH.utils.escapeAttr(img)}')">
             ${p.featured ? `<div class="property-badge"><span class="badge badge-primary">Featured</span></div>` : ''}
           </div>`
        : `<div class="property-img-placeholder">${I('building')}</div>`}
      <div class="property-body">
        <div class="property-price">${price}<span>/month</span></div>
        <div class="property-name">${name}</div>
        <div class="property-location">${I('map-pin')} ${city} &middot; ${type}</div>
        <div class="property-meta">
          ${p.rooms ? `<div class="property-meta-item">${I('bed')} ${p.rooms} Bed${p.rooms>1?'s':''}</div>` : ''}
          ${p.bathrooms ? `<div class="property-meta-item">${I('bath')} ${p.bathrooms} Bath${p.bathrooms>1?'s':''}</div>` : ''}
          <div class="property-meta-item">${I('map-pin')} ${city}</div>
        </div>
      </div>
      <div class="property-card-actions">
        <button class="btn btn-outline btn-sm" data-action="FPH.app.viewProperty" data-value="${id}">View Details</button>
        <button class="btn btn-primary btn-sm" data-action="FPH.app.inquireProperty" data-value="${id}" data-name="${FPH.utils.escapeAttr(p.name||'')}">Inquire</button>
      </div>
    </div>`;
  }

  function doSearch(e) {
    e.preventDefault();
    _propertiesPage = 1;
    const city  = document.getElementById('heroCity')?.value;
    const type  = document.getElementById('heroType')?.value;
    const price = document.getElementById('heroMaxPrice')?.value;
    const params = {};
    if (city)  params.city = city;
    if (type)  params.propertyType = type;
    if (price) params.maxPrice = price;
    document.getElementById('properties')?.scrollIntoView({ behavior: 'smooth' });
    _loadFeaturedProperties(params);
  }

  function applyFilters() {
    _propertiesPage = 1;
    const params = {};
    const search = document.getElementById('filterSearch')?.value?.trim();
    const city   = document.getElementById('filterCity')?.value;
    const type   = document.getElementById('filterType')?.value;
    const price  = document.getElementById('filterPrice')?.value;
    const beds   = document.getElementById('filterBeds')?.value;
    if (search) params.search    = search;
    if (city)   params.city      = city;
    if (type)   params.propertyType = type;
    if (price)  params.maxPrice  = price;
    if (beds)   params.minRooms  = beds;
    _loadFeaturedProperties(params);
  }

  function clearFilters() {
    ['filterSearch','filterCity','filterType','filterPrice','filterBeds'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    _propertiesPage = 1;
    _loadFeaturedProperties();
  }

  function loadMoreProperties() {
    _propertiesPage++;
    applyFilters();
  }

  async function viewProperty(id) {
    const modal = document.getElementById('propertyDetailModal');
    const body  = document.getElementById('propDetailBody');
    if (!modal || !body) return;
    modal.classList.add('active');
    body.innerHTML = `<div class="loading-center"><div class="loading-spinner"></div></div>`;
    try {
      const d = await FPH.api.get(`/properties/${id}`, { auth: false });
      const p = d?.data?.property || d?.data || {};
      const imgs = p.images || [];
      const mainImg = imgs[0]?.url;
      const price = FPH.utils.formatGHS(p.price);
      body.innerHTML = `
        <div class="property-detail-header">
          ${mainImg
            ? `<div style="height:320px;border-radius:var(--radius-lg);background-image:url('${FPH.utils.escapeAttr(mainImg)}');background-size:cover;background-position:center;margin-bottom:24px;"></div>`
            : `<div style="height:200px;border-radius:var(--radius-lg);background:var(--gray-100);display:flex;align-items:center;justify-content:center;margin-bottom:24px;">${I('building')}</div>`}
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px;">
            <div>
              <div style="font-size:1.75rem;font-weight:700;color:var(--primary);margin-bottom:4px;">${price}<span style="font-size:1rem;font-weight:400;color:var(--gray-500);">/month</span></div>
              <h2 style="font-size:1.25rem;font-weight:600;margin-bottom:8px;">${FPH.utils.escapeHtml(p.name||'')}</h2>
              <div style="display:flex;align-items:center;gap:6px;color:var(--gray-500);font-size:14px;">${I('map-pin')} ${FPH.utils.escapeHtml(p.address||'')}${p.city?', '+FPH.utils.escapeHtml(p.city):''}</div>
            </div>
            <div style="display:flex;gap:8px;">
              <span class="badge badge-${p.status}">${FPH.utils.capitalize(p.status||'')}</span>
              <span class="badge badge-neutral">${FPH.utils.capitalize(p.propertyType||'')}</span>
            </div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:24px 0;">
          ${p.rooms ? `<div style="text-align:center;padding:16px;background:var(--gray-50);border-radius:var(--radius-md);">${I('bed')}<div style="font-weight:600;margin-top:8px;">${p.rooms} Bedroom${p.rooms>1?'s':''}</div></div>` : ''}
          ${p.bathrooms ? `<div style="text-align:center;padding:16px;background:var(--gray-50);border-radius:var(--radius-md);">${I('bath')}<div style="font-weight:600;margin-top:8px;">${p.bathrooms} Bathroom${p.bathrooms>1?'s':''}</div></div>` : ''}
          <div style="text-align:center;padding:16px;background:var(--gray-50);border-radius:var(--radius-md);">${I('map-pin')}<div style="font-weight:600;margin-top:8px;">${FPH.utils.escapeHtml(p.city||'')}</div></div>
        </div>
        ${p.description ? `<div style="margin-bottom:24px;"><h4 style="margin-bottom:12px;">About this property</h4><p style="line-height:1.8;">${FPH.utils.escapeHtml(p.description)}</p></div>` : ''}
        <div style="display:flex;gap:12px;margin-top:24px;">
          <button class="btn btn-primary btn-lg" data-action="FPH.app.inquireProperty" data-value="${FPH.utils.escapeAttr(p._id)}" data-name="${FPH.utils.escapeAttr(p.name||'')}" data-target="propertyDetailModal">Send Inquiry</button>
          <button class="btn btn-outline btn-lg" data-action="closeModal" data-value="propertyDetailModal">Close</button>
        </div>`;
      document.getElementById('propDetailTitle').textContent = p.name || 'Property Details';
    } catch (e) {
      body.innerHTML = `<div class="alert alert-danger">${I('alert-circle')} Could not load property details.</div>`;
    }
  }

  function inquireProperty(id, name) {
    if (!FPH.storage.Session.accessToken) { openAuth('register'); return; }
    const sel = document.getElementById('inq-propertyId');
    if (sel) {
      sel.innerHTML = `<option value="${FPH.utils.escapeAttr(id)}">${FPH.utils.escapeHtml(name)}</option>`;
    }
    document.getElementById('newInquiryModal')?.classList.add('active');
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
    if (window.location.pathname.endsWith('/dashboard.html') || window.location.pathname.endsWith('/dashboard')) {
      window.location.href = '/';
      return;
    }
    const dashboard = document.getElementById('dashboard');
    if (dashboard) dashboard.style.display = 'none';
    document.getElementById('header')?.classList.remove('visible');
    _propertiesPage = 1;
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

    if (!window.location.pathname.endsWith('/dashboard.html') && !window.location.pathname.endsWith('/dashboard')) {
      window.location.replace('/dashboard.html');
      return;
    }

    document.getElementById('landingPage')?.classList.remove('active');
    document.getElementById('authOverlay')?.classList.remove('active');
    document.getElementById('header')?.classList.add('visible');
    const dashboard = document.getElementById('dashboard');
    if (dashboard) {
      dashboard.classList.add('active');
      dashboard.style.display = 'block';
    }

    // Update header
    const nameEl   = document.getElementById('userName');
    const avatarEl = document.getElementById('headerAvatar');
    const dashAvEl = document.getElementById('dashAvatar');
    if (nameEl)   nameEl.textContent   = user.firstName || 'User';
    if (avatarEl) avatarEl.textContent = FPH.utils.initials(user.firstName, user.lastName);
    if (dashAvEl) dashAvEl.textContent = FPH.utils.initials(user.firstName, user.lastName);

    if (window.FPH?.dashboard?.init) await FPH.dashboard.init();
    setTimeout(() => {
      if (window.FPH?.dashboardUI && window.FPH?.dashboard) {
        FPH.dashboardUI.renderShell();
        const tab = FPH.dashboard.getCurrentTab();
        FPH.dashboardUI.goTo(tab);
      }
    }, 0);

    if (window.FPH?.notifications?.startPolling) FPH.notifications.startPolling();
    if (window.FPH?.notificationsUI?.init) FPH.notificationsUI.init();
    if (window.FPH?.analytics?.pageView) FPH.analytics.pageView('dashboard');

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

  /* ── Global namespace for HTML onclick ───────────────── */
  document.addEventListener('DOMContentLoaded', init);

  return {
    init, showLanding, openAuth, closeAuth, switchAuthTab,
    handleLogin, handleRegister, handleLogout, handlePasskeyLogin,
    showForgotPassword, doSearch, applyFilters, clearFilters,
    loadMoreProperties, viewProperty, inquireProperty,
  };
})();
