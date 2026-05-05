/* Future Property Holdings — frontend integration with the Node/Express backend.
 * Provides: API client, auth (JWT + refresh), role-aware dashboard, live data wiring.
 * Loaded after the inline marketing script in index.html, so it overrides
 *   window.handleLogin / handleRegister / applyForProperty / contactLandlord
 * to talk to the real REST API instead of localStorage.
 */
(function () {
  'use strict';

  const API_BASE = '/api/v1';
  const STORAGE_KEY = 'fph_session';

  // ── AUTH STATE ──────────────────────────────────────────────────────────────
  const Auth = {
    get session() {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); }
      catch { return null; }
    },
    set session(s) {
      if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      else localStorage.removeItem(STORAGE_KEY);
    },
    get user()         { return this.session ? this.session.user : null; },
    get accessToken()  { return this.session ? this.session.accessToken : null; },
    get refreshToken() { return this.session ? this.session.refreshToken : null; },
    isAuthed()         { return !!this.accessToken; }
  };

  // ── API CLIENT ──────────────────────────────────────────────────────────────
  async function api(path, { method = 'GET', body, auth = true, retry = true } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth && Auth.accessToken) headers.Authorization = 'Bearer ' + Auth.accessToken;

    let res;
    try {
      res = await fetch(API_BASE + path, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      });
    } catch (e) {
      throw new Error('Network error: ' + e.message);
    }

    // Try to refresh access token once on 401
    if (res.status === 401 && auth && retry && Auth.refreshToken) {
      const ok = await tryRefresh();
      if (ok) return api(path, { method, body, auth, retry: false });
      Auth.session = null;
      updateNavAuth();
    }

    let data;
    try { data = await res.json(); } catch { data = {}; }
    if (!res.ok || data.success === false) {
      const msg = data.message || ('Request failed (' + res.status + ')');
      const err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  async function tryRefresh() {
    try {
      const r = await fetch(API_BASE + '/auth/refresh-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: Auth.refreshToken })
      });
      const j = await r.json();
      if (!r.ok || !j.success) return false;
      Auth.session = { ...Auth.session, accessToken: j.data.accessToken };
      return true;
    } catch { return false; }
  }

  // ── NAV AUTH SWAP ───────────────────────────────────────────────────────────
  function updateNavAuth() {
    const u = Auth.user;
    const desktop = document.getElementById('nav-cta');
    const mobile  = document.getElementById('nav-cta-mobile');
    if (!desktop || !mobile) return;
    if (u) {
      const initials = ((u.firstName || '?')[0] + (u.lastName || '')[0]).toUpperCase();
      desktop.innerHTML =
        '<button class="btn btn-outline" onclick="showPage(\'dashboard\')" title="' + u.email + '">' +
          '<span style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,var(--blue2),var(--teal));color:#fff;font-size:.75rem;font-weight:700;margin-right:6px">' + initials + '</span>' +
          'Dashboard' +
        '</button>' +
        '<button class="btn btn-primary" onclick="logout()">Logout</button>';
      mobile.innerHTML =
        '<button class="btn btn-outline" style="flex:1" onclick="showPage(\'dashboard\');toggleMobileMenu()">Dashboard</button>' +
        '<button class="btn btn-primary" style="flex:1" onclick="logout()">Logout</button>';
    } else {
      desktop.innerHTML =
        '<button class="btn btn-outline" onclick="openModal(\'login\')">Login</button>' +
        '<button class="btn btn-primary" onclick="openModal(\'register\')">Get Started</button>';
      mobile.innerHTML =
        '<button class="btn btn-outline" style="flex:1" onclick="openModal(\'login\')">Login</button>' +
        '<button class="btn btn-primary" style="flex:1" onclick="openModal(\'register\')">Get Started</button>';
    }
  }

  // ── REAL LOGIN / REGISTER / LOGOUT ──────────────────────────────────────────
  async function handleLogin() {
    const email = (document.getElementById('login-email').value || '').trim();
    const password = document.getElementById('login-pass').value;
    if (!email || !password) return showToast('Please fill in all fields', 'error');
    try {
      const r = await api('/auth/login', { method: 'POST', body: { email, password }, auth: false });
      Auth.session = r.data;
      updateNavAuth();
      closeModal();
      showToast('Welcome back, ' + (r.data.user.firstName || email.split('@')[0]) + '!', 'success');
      showPage('dashboard');
    } catch (e) {
      showToast(e.message || 'Login failed', 'error');
    }
  }

  async function handleRegister() {
    const firstName = (document.getElementById('reg-fname').value || '').trim();
    const lastName  = (document.getElementById('reg-lname').value || '').trim();
    const email     = (document.getElementById('reg-email').value || '').trim();
    const phone     = (document.getElementById('reg-phone').value || '').trim();
    const password  = document.getElementById('reg-pass').value;
    const role = (document.querySelector('.role-btn.active')?.dataset?.role) || 'tenant';

    if (!firstName || !lastName || !email || !phone || !password) {
      return showToast('Please fill in all fields', 'error');
    }
    if (password.length < 8) return showToast('Password must be at least 8 characters', 'error');
    if (!/^(\+233|0)\d{9}$/.test(phone)) {
      return showToast('Phone must be a Ghana number (+233XXXXXXXXX or 0XXXXXXXXX)', 'error');
    }

    try {
      const r = await api('/auth/register', {
        method: 'POST',
        body: { firstName, lastName, email, phone, password, role },
        auth: false
      });
      Auth.session = r.data;
      updateNavAuth();
      closeModal();
      showToast('Welcome, ' + firstName + '! Your account is ready.', 'success');
      showPage('dashboard');
    } catch (e) {
      showToast(e.message || 'Registration failed', 'error');
    }
  }

  async function logout() {
    try { await api('/auth/logout', { method: 'POST' }); } catch (_) {}
    Auth.session = null;
    updateNavAuth();
    showToast('Signed out', 'success');
    showPage('home');
  }

  // ── DASHBOARD ───────────────────────────────────────────────────────────────
  const DASH_NAV = {
    tenant: [
      { id: 'overview',    label: 'Overview',     icon: 'home' },
      { id: 'tenancies',   label: 'My Tenancies', icon: 'key' },
      { id: 'rent',        label: 'Rent & Invoices', icon: 'cash' },
      { id: 'maintenance', label: 'Maintenance',  icon: 'wrench' },
      { id: 'inquiries',   label: 'Inquiries',    icon: 'chat' },
      { id: 'profile',     label: 'Profile',      icon: 'user' }
    ],
    landlord: [
      { id: 'overview',    label: 'Overview',     icon: 'home' },
      { id: 'listings',    label: 'My Listings',  icon: 'building' },
      { id: 'tenancies',   label: 'Tenancies',    icon: 'key' },
      { id: 'rent',        label: 'Rent & Invoices', icon: 'cash' },
      { id: 'maintenance', label: 'Maintenance',  icon: 'wrench' },
      { id: 'inquiries',   label: 'Inquiries',    icon: 'chat' },
      { id: 'profile',     label: 'Profile',      icon: 'user' }
    ],
    admin: [
      { id: 'overview',    label: 'Overview',     icon: 'home' },
      { id: 'pending',     label: 'Pending Properties', icon: 'building' },
      { id: 'users',       label: 'Users',        icon: 'user' },
      { id: 'profile',     label: 'Profile',      icon: 'user' }
    ]
  };

  const ICONS = {
    home:     '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/></svg>',
    key:      '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clip-rule="evenodd"/></svg>',
    cash:     '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582z"/><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.077 2.353 1.229V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.077-2.354-1.229V5z" clip-rule="evenodd"/></svg>',
    wrench:   '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M11.49 3.17a4 4 0 015.343 5.343l4.142 4.142a1 1 0 01-1.414 1.414L15.417 9.93a4 4 0 01-5.343-5.343 1 1 0 011.414-1.414L13 4.586a2 2 0 102.586 2.586L14.17 5.756a1 1 0 01-2.68-2.586z" clip-rule="evenodd"/></svg>',
    chat:     '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.84 8.84 0 01-4.083-.98L2 17l1.338-3.123A6.795 6.795 0 012 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd"/></svg>',
    user:     '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/></svg>',
    building: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 2a1 1 0 011-1h10a1 1 0 011 1v17h-3v-4a1 1 0 00-1-1H8a1 1 0 00-1 1v4H4V2zm3 2h2v2H7V4zm0 4h2v2H7V8zm4-4h2v2h-2V4zm0 4h2v2h-2V8z" clip-rule="evenodd"/></svg>'
  };

  let currentDashTab = 'overview';

  function renderDashShell() {
    const u = Auth.user;
    if (!u) { showPage('home'); openModal('login'); return; }
    const role = u.role || 'tenant';
    const items = DASH_NAV[role] || DASH_NAV.tenant;

    document.getElementById('dash-avatar').textContent =
      ((u.firstName || '?')[0] + (u.lastName || '')[0]).toUpperCase();
    document.getElementById('dash-user-name').textContent =
      (u.firstName || '') + ' ' + (u.lastName || '');
    document.getElementById('dash-user-role').textContent = role;

    const nav = document.getElementById('dash-nav');
    nav.innerHTML = items.map(i =>
      '<button class="dash-nav-item' + (i.id === currentDashTab ? ' active' : '') + '" onclick="dashGo(\'' + i.id + '\')">' +
      (ICONS[i.icon] || '') + i.label +
      '</button>'
    ).join('');
    if (!items.find(i => i.id === currentDashTab)) currentDashTab = 'overview';
    renderDashTab(currentDashTab);
  }

  function dashGo(tab) {
    currentDashTab = tab;
    renderDashShell();
  }

  function renderDashTab(tab) {
    const main = document.getElementById('dash-main');
    main.innerHTML = '<div class="dash-empty">Loading...</div>';
    const u = Auth.user;
    const role = u.role || 'tenant';
    const handler = (Panels[role] && Panels[role][tab]) || Panels.common[tab] || Panels.common.notFound;
    Promise.resolve(handler(main)).catch(e => {
      main.innerHTML = '<div class="dash-card"><div class="dash-h">Error</div><div class="dash-sub">' + escapeHtml(e.message) + '</div></div>';
    });
  }

  // ── PANELS ──────────────────────────────────────────────────────────────────
  const Panels = { tenant: {}, landlord: {}, admin: {}, common: {} };

  Panels.common.notFound = (m) => {
    m.innerHTML = '<div class="dash-card"><div class="dash-h">Not available</div><div class="dash-sub">This section is not available for your role.</div></div>';
  };

  Panels.common.profile = async (m) => {
    const u = Auth.user;
    const verified = u.biometric || {};
    m.innerHTML =
      '<div class="dash-card">' +
        '<div class="dash-h">Profile</div>' +
        '<div class="dash-sub">Your account details and verification status.</div>' +
        '<div class="dash-row" style="margin-bottom:14px">' +
          field('First name', 'pf-fname', u.firstName) +
          field('Last name',  'pf-lname', u.lastName) +
        '</div>' +
        '<div class="dash-row" style="margin-bottom:14px">' +
          field('Email', 'pf-email', u.email, 'email', true) +
          field('Phone', 'pf-phone', u.phone) +
        '</div>' +
        '<button class="btn btn-primary" onclick="saveProfile()">Save Changes</button>' +
      '</div>' +
      '<div class="dash-card">' +
        '<div class="dash-h">Verification</div>' +
        '<div class="dash-sub">Verified accounts can list properties, request tenancies, and contact landlords.</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">' +
          verifyTile('Face Recognition', !!verified.faceEnrolled, 'initFaceEnrollment()') +
          verifyTile('Ghana Card', !!verified.ghanaCardVerified, 'initGhanaCardCapture()') +
        '</div>' +
      '</div>';
  };

  function field(label, id, val, type = 'text', readonly = false) {
    return '<div class="form-group">' +
      '<label>' + label + '</label>' +
      '<input id="' + id + '" type="' + type + '" value="' + escapeAttr(val || '') + '"' + (readonly ? ' readonly' : '') + '>' +
      '</div>';
  }
  function verifyTile(name, ok, action) {
    return '<div style="padding:14px;border:1px solid var(--gray200);border-radius:12px;display:flex;align-items:center;justify-content:space-between;gap:12px">' +
      '<div><div style="font-weight:600;color:var(--navy)">' + name + '</div>' +
      '<div style="font-size:.78rem;margin-top:2px"><span class="dash-pill ' + (ok ? 'pill-green' : 'pill-amber') + '">' + (ok ? 'Verified' : 'Not verified') + '</span></div></div>' +
      (ok ? '' : '<button class="btn btn-primary" style="padding:8px 14px;font-size:.82rem" onclick="' + action + '">Verify</button>') +
      '</div>';
  }

  async function saveProfile() {
    try {
      const body = {
        firstName: document.getElementById('pf-fname').value.trim(),
        lastName:  document.getElementById('pf-lname').value.trim(),
        phone:     document.getElementById('pf-phone').value.trim()
      };
      const r = await api('/users/profile', { method: 'PUT', body });
      Auth.session = { ...Auth.session, user: r.data };
      updateNavAuth();
      renderDashShell();
      showToast('Profile updated', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  }

  // ── TENANT PANELS ───────────────────────────────────────────────────────────
  Panels.tenant.overview = async (m) => {
    const [t, r, q, x] = await Promise.allSettled([
      api('/tenancies/me'), api('/rent/me'), api('/inquiries/me'), api('/maintenance/me')
    ]);
    const v = (s, fb) => s.status === 'fulfilled' ? (s.value.data || []).length : (fb || 0);
    m.innerHTML =
      '<div class="dash-h" style="margin-bottom:6px">Welcome back, ' + (Auth.user.firstName || '') + '!</div>' +
      '<div class="dash-sub">Quick view of your renting activity.</div>' +
      '<div class="dash-stats">' +
        stat(v(t), 'Tenancies') +
        stat(v(r), 'Invoices') +
        stat(v(q), 'Inquiries') +
        stat(v(x), 'Maintenance') +
      '</div>' +
      '<div class="dash-card"><div class="dash-h" style="font-size:1.1rem">Get started</div>' +
        '<div class="dash-sub">Browse verified properties and apply or send an inquiry.</div>' +
        '<button class="btn btn-primary" onclick="showPage(\'properties\')">Browse Properties</button>' +
      '</div>';
  };

  Panels.tenant.tenancies = async (m) => {
    const r = await api('/tenancies/me');
    const list = r.data || [];
    if (!list.length) return emptyState(m, 'No tenancies yet', 'Apply to a property to start a tenancy request.');
    m.innerHTML = '<div class="dash-card"><div class="dash-h">My Tenancies</div>' +
      table(['Property', 'Rent', 'Status', 'Approval', 'Actions'], list.map(t => [
        (t.property && t.property.name) || '—',
        'GH₵' + (t.monthlyRent || 0).toLocaleString() + '/mo',
        pill(t.status === 'active' ? 'green' : 'gray', t.status),
        pill(t.approvalStatus === 'active' ? 'green' : t.approvalStatus === 'pending' ? 'amber' : 'red', t.approvalStatus),
        t.status !== 'ended'
          ? '<button class="btn btn-outline" style="padding:6px 12px;font-size:.78rem" onclick="endTenancy(\'' + t._id + '\')">End</button>'
          : '—'
      ])) + '</div>';
  };

  Panels.tenant.rent = async (m) => {
    const r = await api('/rent/me');
    const list = r.data || [];
    if (!list.length) return emptyState(m, 'No invoices yet', 'When your landlord generates an invoice, it will appear here.');
    m.innerHTML = '<div class="dash-card"><div class="dash-h">Rent & Invoices</div>' +
      table(['Period', 'Amount', 'Paid', 'Due', 'Status'], list.map(i => [
        i.periodLabel,
        'GH₵' + (i.amount || 0).toLocaleString(),
        'GH₵' + (i.amountPaid || 0).toLocaleString(),
        i.dueDate ? new Date(i.dueDate).toLocaleDateString() : '—',
        pill(i.status === 'paid' ? 'green' : i.status === 'overdue' ? 'red' : i.status === 'partial' ? 'amber' : 'blue', i.status)
      ])) + '</div>';
  };

  Panels.tenant.maintenance = async (m) => {
    const r = await api('/maintenance/me');
    const list = r.data || [];
    m.innerHTML = '<div class="dash-card">' +
      '<div class="dash-h">Maintenance Requests</div>' +
      '<div class="dash-sub">Report issues for your active rental. Requires a verified account and active tenancy.</div>' +
      '<button class="btn btn-primary" onclick="newMaintenance()">+ New Request</button>' +
      '</div>' +
      (list.length
        ? '<div class="dash-card">' +
          table(['Title', 'Category', 'Priority', 'Status', 'Created'], list.map(x => [
            escapeHtml(x.title || ''),
            x.category || 'general',
            x.priority || 'normal',
            pill(x.status === 'resolved' ? 'green' : x.status === 'open' ? 'amber' : 'blue', x.status),
            new Date(x.createdAt).toLocaleDateString()
          ])) + '</div>'
        : '');
  };

  async function newMaintenance() {
    const t = await api('/tenancies/me?status=active').catch(() => ({ data: [] }));
    const active = (t.data || []).filter(x => x.approvalStatus === 'active');
    if (!active.length) return showToast('You need an active tenancy to file maintenance', 'error');
    const choices = active.map(x => (x.property && x.property.name) || x._id).join(' / ');
    const title = prompt('Issue title:'); if (!title) return;
    const description = prompt('Describe the issue:'); if (!description) return;
    try {
      await api('/maintenance', { method: 'POST', body: { tenancyId: active[0]._id, title, description, category: 'general', priority: 'normal' } });
      showToast('Maintenance request submitted', 'success');
      renderDashTab('maintenance');
    } catch (e) { showToast(e.message, 'error'); }
  }

  Panels.tenant.inquiries = async (m) => {
    const r = await api('/inquiries/me');
    const list = r.data || [];
    if (!list.length) return emptyState(m, 'No inquiries yet', 'Use Contact Landlord on a property card to start a conversation.');
    m.innerHTML = '<div class="dash-card"><div class="dash-h">My Inquiries</div>' +
      table(['Property', 'Subject', 'Status', 'Updated'], list.map(q => [
        (q.property && q.property.name) || '—',
        escapeHtml(q.subject || '(no subject)'),
        pill(q.status === 'replied' ? 'green' : q.status === 'closed' ? 'gray' : 'amber', q.status),
        new Date(q.updatedAt || q.createdAt).toLocaleString()
      ])) + '</div>';
  };

  // ── LANDLORD PANELS ─────────────────────────────────────────────────────────
  Panels.landlord.overview = async (m) => {
    const me = Auth.user._id || Auth.user.id;
    const [props, t, r, x, q] = await Promise.allSettled([
      api('/properties/user/' + me, { auth: false }),
      api('/tenancies/me'),
      api('/rent/me'),
      api('/maintenance/me'),
      api('/inquiries/me')
    ]);
    const v = (s) => s.status === 'fulfilled' ? (s.value.data || []).length : 0;
    m.innerHTML =
      '<div class="dash-h" style="margin-bottom:6px">Welcome, ' + (Auth.user.firstName || 'Landlord') + '!</div>' +
      '<div class="dash-sub">Manage your properties, tenants and revenue.</div>' +
      '<div class="dash-stats">' +
        stat(v(props), 'Listings') +
        stat(v(t), 'Tenancies') +
        stat(v(r), 'Invoices') +
        stat(v(q), 'Inquiries') +
        stat(v(x), 'Maintenance') +
      '</div>';
  };

  Panels.landlord.listings = async (m) => {
    const me = Auth.user._id || Auth.user.id;
    const r = await api('/properties/user/' + me, { auth: false });
    const list = r.data || [];
    m.innerHTML = '<div class="dash-card">' +
      '<div class="dash-h">My Listings</div>' +
      '<div class="dash-sub">Listings need admin approval before tenants can apply. Verify your face & Ghana Card to unlock listing creation.</div>' +
      '<button class="btn btn-primary" onclick="newListing()">+ Add Property</button>' +
      '</div>' +
      (list.length
        ? '<div class="dash-card">' +
          table(['Name', 'City', 'Price', 'Status', 'Available'], list.map(p => [
            escapeHtml(p.name),
            p.city,
            'GH₵' + (p.price || 0).toLocaleString(),
            pill(p.verificationStatus === 'approved' ? 'green' : p.verificationStatus === 'pending' ? 'amber' : 'red', p.verificationStatus),
            p.isAvailable ? pill('green', 'Yes') : pill('gray', 'No')
          ])) + '</div>'
        : emptyHtml('No listings yet', 'Click Add Property to create your first listing.'));
  };

  async function newListing() {
    const name = prompt('Property name (e.g. 3-Bed Executive Apartment):'); if (!name) return;
    const address = prompt('Address:'); if (!address) return;
    const city = prompt('City (Accra, Kumasi, Tema, ...):', 'Accra'); if (!city) return;
    const price = Number(prompt('Monthly rent in GH₵ (number):'));
    if (!price || price <= 0) return showToast('Invalid price', 'error');
    const propertyType = prompt('Type (apartment / house / studio / office / commercial):', 'apartment') || 'apartment';
    const rooms = Number(prompt('Number of rooms:', '2')) || 1;
    const bathrooms = Number(prompt('Number of bathrooms:', '1')) || 1;
    try {
      await api('/properties', { method: 'POST', body: { name, address, city, price, propertyType, rooms, bathrooms } });
      showToast('Listing created — pending admin approval', 'success');
      renderDashTab('listings');
    } catch (e) { showToast(e.message, 'error'); }
  }

  Panels.landlord.tenancies = async (m) => {
    const r = await api('/tenancies/me');
    const list = r.data || [];
    if (!list.length) return emptyState(m, 'No tenancies yet', 'When tenants apply to your listings, requests will appear here.');
    m.innerHTML = '<div class="dash-card"><div class="dash-h">Tenancy Requests</div>' +
      table(['Tenant', 'Property', 'Rent', 'Approval', 'Actions'], list.map(t => [
        ((t.tenant && (t.tenant.firstName + ' ' + t.tenant.lastName)) || '—'),
        (t.property && t.property.name) || '—',
        'GH₵' + (t.monthlyRent || 0).toLocaleString(),
        pill(t.approvalStatus === 'active' ? 'green' : t.approvalStatus === 'pending' ? 'amber' : 'red', t.approvalStatus),
        t.approvalStatus === 'pending'
          ? '<button class="btn btn-primary" style="padding:6px 12px;font-size:.78rem" onclick="decideTenancy(\'' + t._id + '\',\'active\')">Approve</button> ' +
            '<button class="btn btn-outline" style="padding:6px 12px;font-size:.78rem" onclick="decideTenancy(\'' + t._id + '\',\'rejected\')">Reject</button>'
          : t.status !== 'ended'
            ? '<button class="btn btn-primary" style="padding:6px 12px;font-size:.78rem" onclick="generateInvoice(\'' + t._id + '\')">Invoice</button>'
            : '—'
      ])) + '</div>';
  };

  Panels.landlord.rent = Panels.tenant.rent;
  Panels.landlord.maintenance = Panels.tenant.maintenance;
  Panels.landlord.inquiries = Panels.tenant.inquiries;

  async function decideTenancy(id, decision) {
    try {
      await api('/tenancies/' + id + '/decision', { method: 'PATCH', body: { decision } });
      showToast('Tenancy ' + decision, 'success');
      renderDashTab('tenancies');
    } catch (e) { showToast(e.message, 'error'); }
  }
  async function endTenancy(id) {
    if (!confirm('End this tenancy?')) return;
    try {
      await api('/tenancies/' + id + '/end', { method: 'PATCH' });
      showToast('Tenancy ended', 'success');
      renderDashTab('tenancies');
    } catch (e) { showToast(e.message, 'error'); }
  }
  async function generateInvoice(tenancyId) {
    try {
      await api('/rent/invoices', { method: 'POST', body: { tenancyId } });
      showToast('Invoice generated', 'success');
      renderDashTab('rent');
    } catch (e) { showToast(e.message, 'error'); }
  }

  // ── ADMIN PANELS ────────────────────────────────────────────────────────────
  Panels.admin.overview = async (m) => {
    const r = await api('/admin/dashboard');
    const d = r.data || {};
    m.innerHTML =
      '<div class="dash-h" style="margin-bottom:6px">Admin Dashboard</div>' +
      '<div class="dash-sub">Platform-wide statistics.</div>' +
      '<div class="dash-stats">' +
        stat(d.users || 0, 'Total Users') +
        stat(d.tenants || 0, 'Tenants') +
        stat(d.landlords || 0, 'Landlords') +
        stat((d.properties && d.properties.total) || 0, 'Properties') +
        stat((d.properties && d.properties.pending) || 0, 'Pending Review') +
        stat((d.tenancies && d.tenancies.active) || 0, 'Active Tenancies') +
        stat((d.rent && d.rent.overdueOrPartial) || 0, 'Overdue Invoices') +
        stat((d.maintenance && d.maintenance.openOrInProgress) || 0, 'Open Tickets') +
      '</div>';
  };

  Panels.admin.pending = async (m) => {
    const r = await api('/admin/properties/pending');
    const list = r.data || [];
    if (!list.length) return emptyState(m, 'Nothing pending', 'All listings are reviewed!');
    m.innerHTML = '<div class="dash-card"><div class="dash-h">Pending Properties</div>' +
      table(['Name', 'Landlord', 'City', 'Price', 'Actions'], list.map(p => [
        escapeHtml(p.name),
        ((p.landlord && (p.landlord.firstName + ' ' + p.landlord.lastName)) || '—'),
        p.city,
        'GH₵' + (p.price || 0).toLocaleString(),
        '<button class="btn btn-primary" style="padding:6px 12px;font-size:.78rem" onclick="reviewProp(\'' + p._id + '\',\'approved\')">Approve</button> ' +
        '<button class="btn btn-outline" style="padding:6px 12px;font-size:.78rem" onclick="reviewProp(\'' + p._id + '\',\'rejected\')">Reject</button>'
      ])) + '</div>';
  };

  Panels.admin.users = async (m) => {
    const r = await api('/admin/users');
    const list = r.data || [];
    m.innerHTML = '<div class="dash-card"><div class="dash-h">Users</div>' +
      table(['Name', 'Email', 'Role', 'Verified', 'Active', 'Actions'], list.map(u => [
        (u.firstName || '') + ' ' + (u.lastName || ''),
        u.email,
        u.role,
        (u.biometric && u.biometric.faceEnrolled && u.biometric.ghanaCardVerified) ? pill('green', 'Yes') : pill('amber', 'No'),
        u.isActive ? pill('green', 'Active') : pill('gray', 'Disabled'),
        '<button class="btn btn-outline" style="padding:6px 12px;font-size:.78rem" onclick="toggleUser(\'' + u._id + '\',' + (!u.isActive) + ')">' + (u.isActive ? 'Disable' : 'Enable') + '</button>'
      ])) + '</div>';
  };

  async function reviewProp(id, decision) {
    const reason = decision === 'rejected' ? prompt('Rejection reason:') || 'Did not meet requirements' : undefined;
    try {
      await api('/admin/properties/' + id + '/review', { method: 'PATCH', body: { decision, reason } });
      showToast('Property ' + decision, 'success');
      renderDashTab('pending');
    } catch (e) { showToast(e.message, 'error'); }
  }
  async function toggleUser(id, isActive) {
    try {
      await api('/admin/users/' + id + '/active', { method: 'PATCH', body: { isActive } });
      showToast(isActive ? 'User enabled' : 'User disabled', 'success');
      renderDashTab('users');
    } catch (e) { showToast(e.message, 'error'); }
  }

  // ── HELPERS ─────────────────────────────────────────────────────────────────
  function stat(num, label) {
    return '<div class="dash-stat"><div class="dash-stat-num">' + num + '</div><div class="dash-stat-lbl">' + label + '</div></div>';
  }
  function table(cols, rows) {
    return '<table class="dash-table"><thead><tr>' +
      cols.map(c => '<th>' + c + '</th>').join('') +
      '</tr></thead><tbody>' +
      rows.map(r => '<tr>' + r.map(c => '<td>' + (c == null ? '—' : c) + '</td>').join('') + '</tr>').join('') +
      '</tbody></table>';
  }
  function pill(color, text) {
    return '<span class="dash-pill pill-' + color + '">' + (text || '') + '</span>';
  }
  function emptyHtml(title, sub) {
    return '<div class="dash-card"><div class="dash-empty">' +
      '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"/></svg>' +
      '<div style="font-weight:600;color:var(--navy)">' + title + '</div>' +
      '<div style="margin-top:6px">' + sub + '</div>' +
      '</div></div>';
  }
  function emptyState(m, title, sub) { m.innerHTML = emptyHtml(title, sub); }
  function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function escapeAttr(s) { return escapeHtml(s).replace(/'/g, '&#39;'); }

  // ── BACKEND-AWARE PROPERTY ACTIONS ──────────────────────────────────────────
  async function applyForProperty(idOrMongo) {
    if (!Auth.isAuthed()) {
      if (typeof closePropertyDetail === 'function') closePropertyDetail();
      openModal('login');
      return showToast('Please sign in to apply', 'error');
    }
    // Local demo properties have numeric IDs; Mongo properties have 24-char hex strings
    if (typeof idOrMongo !== 'string' || idOrMongo.length !== 24) {
      if (typeof closePropertyDetail === 'function') closePropertyDetail();
      return showToast('Demo property — connect to a live listing to apply', 'success');
    }
    try {
      await api('/tenancies', { method: 'POST', body: { propertyId: idOrMongo } });
      if (typeof closePropertyDetail === 'function') closePropertyDetail();
      showToast('Application sent. The landlord will review it shortly.', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  }

  async function contactLandlord(idOrMongo) {
    if (!Auth.isAuthed()) {
      if (typeof closePropertyDetail === 'function') closePropertyDetail();
      openModal('login');
      return showToast('Please sign in to contact the landlord', 'error');
    }
    if (typeof idOrMongo !== 'string' || idOrMongo.length !== 24) {
      // Fall back to the legacy contact-form behaviour for demo cards
      if (typeof closePropertyDetail === 'function') closePropertyDetail();
      showPage('contact');
      return;
    }
    const body = prompt('Message to the landlord:');
    if (!body) return;
    try {
      await api('/inquiries', { method: 'POST', body: { propertyId: idOrMongo, body } });
      if (typeof closePropertyDetail === 'function') closePropertyDetail();
      showToast('Inquiry sent', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  }

  // ── LIVE PROPERTIES (replaces demo grid on /properties when API has data) ───
  async function loadLiveProperties() {
    try {
      const r = await api('/properties?limit=24', { auth: false });
      const list = r.data || [];
      if (!list.length) return; // keep demo cards
      const grid = document.getElementById('props-grid-2');
      if (!grid) return;
      grid.innerHTML = list.map(p => livePropCard(p)).join('');
    } catch (_) { /* backend offline → demo cards remain */ }
  }

  function livePropCard(p) {
    const img = (p.images && p.images[0] && p.images[0].url) || null;
    const beds = p.rooms || 0, baths = p.bathrooms || 1;
    return '<div class="prop-card" data-type="' + (p.propertyType || 'apartment') + '">' +
      '<div class="prop-img" style="background:linear-gradient(135deg,#1e3a8a,#0d9488)">' +
        (img ? '<img class="prop-img-bg" src="' + img + '" alt="' + escapeAttr(p.name) + '" loading="lazy" referrerpolicy="no-referrer">'
             : '<div class="prop-img-placeholder"><span style="font-size:4rem">🏠</span></div>') +
        '<div class="prop-badge"><span class="tag tag-' + (p.isAvailable ? 'available' : 'rented') + '">' + (p.isAvailable ? 'Available' : 'Rented') + '</span></div>' +
      '</div>' +
      '<div class="prop-body">' +
        '<div class="prop-title">' + escapeHtml(p.name) + '</div>' +
        '<div class="prop-loc">' + escapeHtml(p.city) + ' — ' + escapeHtml(p.address || '') + '</div>' +
        '<div class="prop-features">' +
          (beds > 0 ? '<div class="prop-feat">' + beds + ' Beds</div>' : '') +
          '<div class="prop-feat">' + baths + ' Bath' + (baths > 1 ? 's' : '') + '</div>' +
        '</div>' +
        '<div class="prop-footer">' +
          '<div class="prop-price">GH₵' + (p.price || 0).toLocaleString() + '<span>/mo</span></div>' +
          '<button class="btn btn-primary" style="padding:8px 16px;font-size:.82rem" onclick="openLiveProperty(\'' + p._id + '\')">View Details</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  async function openLiveProperty(id) {
    try {
      const r = await api('/properties/' + id, { auth: false });
      const p = r.data;
      const modal = document.getElementById('prop-modal');
      const body = document.getElementById('prop-modal-body');
      const img = (p.images && p.images[0] && p.images[0].url) || null;
      const hero = img
        ? '<img class="pd-hero" src="' + img + '" alt="' + escapeAttr(p.name) + '" referrerpolicy="no-referrer">'
        : '<div class="pd-hero" style="background:linear-gradient(135deg,#1e3a8a,#0d9488);display:flex;align-items:center;justify-content:center"><span style="font-size:5rem">🏠</span></div>';
      body.innerHTML = hero +
        '<div class="pd-body">' +
          '<div class="pd-row">' +
            '<div><div class="pd-title">' + escapeHtml(p.name) + '</div>' +
            '<div class="pd-loc">' + escapeHtml(p.city) + ' — ' + escapeHtml(p.address || '') + '</div></div>' +
            '<div class="pd-price">GH₵' + (p.price || 0).toLocaleString() + '<span>/mo</span></div>' +
          '</div>' +
          '<div><span class="tag tag-' + (p.isAvailable ? 'available' : 'rented') + '">' + (p.isAvailable ? 'Available' : 'Rented') + '</span></div>' +
          '<div class="pd-feats">' +
            '<div class="pd-feat"><strong>' + (p.rooms || '-') + '</strong><span>Bedrooms</span></div>' +
            '<div class="pd-feat"><strong>' + (p.bathrooms || 1) + '</strong><span>Bathrooms</span></div>' +
            '<div class="pd-feat"><strong>' + (p.propertyType || 'apartment') + '</strong><span>Type</span></div>' +
          '</div>' +
          '<p class="pd-desc">' + escapeHtml(p.description || 'A verified listing on Future Property Holdings.') + '</p>' +
          '<div class="pd-actions">' +
            (p.isAvailable
              ? '<button class="btn btn-primary" onclick="applyForProperty(\'' + p._id + '\')">Apply Now</button>' +
                '<button class="btn btn-outline" onclick="contactLandlord(\'' + p._id + '\')">Contact Landlord</button>' +
                '<button class="btn" style="background:var(--gray100);color:var(--navy)" onclick="closePropertyDetail()">Close</button>'
              : '<button class="btn" style="background:var(--gray100);color:var(--navy);flex:1;justify-content:center" onclick="closePropertyDetail()">Close</button>') +
          '</div>' +
        '</div>';
      modal.classList.add('open');
    } catch (e) { showToast(e.message, 'error'); }
  }

  // ── BOOTSTRAP ───────────────────────────────────────────────────────────────
  // Override globals exposed via inline onclick handlers
  window.handleLogin = handleLogin;
  window.handleRegister = handleRegister;
  window.logout = logout;
  window.applyForProperty = applyForProperty;
  window.contactLandlord = contactLandlord;
  window.dashGo = dashGo;
  window.saveProfile = saveProfile;
  window.newMaintenance = newMaintenance;
  window.newListing = newListing;
  window.decideTenancy = decideTenancy;
  window.endTenancy = endTenancy;
  window.generateInvoice = generateInvoice;
  window.reviewProp = reviewProp;
  window.toggleUser = toggleUser;
  window.openLiveProperty = openLiveProperty;

  // Hook into showPage to render the dashboard when navigated to
  const _showPage = window.showPage;
  window.showPage = function (page) {
    if (page === 'dashboard' && !Auth.isAuthed()) {
      openModal('login');
      return showToast('Please sign in to view your dashboard', 'error');
    }
    if (typeof _showPage === 'function') _showPage(page);
    if (page === 'dashboard') renderDashShell();
    if (page === 'properties' || page === 'home') loadLiveProperties();
  };

  // First-load: refresh user info and update nav
  document.addEventListener('DOMContentLoaded', async () => {
    updateNavAuth();
    if (Auth.isAuthed()) {
      try {
        const r = await api('/auth/me');
        Auth.session = { ...Auth.session, user: r.data };
        updateNavAuth();
      } catch (_) { /* token might be invalid; updateNavAuth already cleared */ }
    }
    loadLiveProperties();
  });

  // ── EXTRA LINKING HELPERS ───────────────────────────────────────────────────
  // Unified router used by service cards & Platform footer links
  function goToDashOrLogin(tab) {
    if (!Auth.isAuthed()) {
      openModal('login');
      return showToast('Please sign in to continue', 'error');
    }
    currentDashTab = tab || 'overview';
    showPage('dashboard');
  }

  // Properties-page search bar: filter the demo grid + (when live) hit the API
  async function applyPropSearch() {
    const q    = (document.getElementById('prop-search-q')?.value || '').trim().toLowerCase();
    const type = document.getElementById('prop-search-type')?.value || 'all';
    const loc  = document.getElementById('prop-search-loc')?.value || '';
    const grid = document.getElementById('props-grid-2');
    if (!grid) return;

    // Demo data filter (works without backend)
    if (typeof window.properties === 'object' && Array.isArray(window.properties)) {
      const filtered = window.properties.filter(p => {
        if (type !== 'all' && p.type !== type) return false;
        if (loc && !(p.loc || '').toLowerCase().includes(loc.toLowerCase())) return false;
        if (q && !((p.title || '') + ' ' + (p.loc || '')).toLowerCase().includes(q)) return false;
        return true;
      });
      if (typeof window.renderProps === 'function') {
        // Render only matching subset by temporarily swapping properties
        const original = window.properties;
        window.properties = filtered;
        try { window.renderProps('props-grid-2', 'all'); }
        finally { window.properties = original; }
      }
      if (!filtered.length) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:48px 20px;color:var(--gray600)"><div style="font-weight:600;color:var(--navy);margin-bottom:6px">No matches</div>Try a different search term or clear filters.</div>';
      }
    }

    // Live backend search (overrides the demo cards if results returned)
    if (Auth.isAuthed() || true) {
      try {
        const params = new URLSearchParams();
        if (type !== 'all') params.set('type', type);
        const r = await api('/properties?' + params.toString(), { auth: false });
        const list = (r.data || []).filter(p => {
          if (loc && !(p.address || '' + ' ' + p.city).toLowerCase().includes(loc.toLowerCase())) return false;
          if (q && !((p.name || '') + ' ' + (p.city || '') + ' ' + (p.address || '')).toLowerCase().includes(q)) return false;
          return true;
        });
        if (list.length) grid.innerHTML = list.map(livePropCard).join('');
      } catch (_) { /* backend offline → keep demo result */ }
    }
  }

  // ── INFO / LEGAL / HELP MODAL ───────────────────────────────────────────────
  const INFO_CONTENT = {
    'help': {
      title: 'Help Center',
      sub: 'Quick answers to common questions.',
      body:
        '<h3 style="font-weight:700;color:var(--navy);margin-bottom:8px">Account</h3>' +
        '<p style="color:var(--gray600);line-height:1.7;margin-bottom:14px">Create an account, verify your Ghana Card and face, then sign in to access the dashboard. Forgotten passwords can be reset via the Forgot password link on the login modal.</p>' +
        '<h3 style="font-weight:700;color:var(--navy);margin-bottom:8px">Listings</h3>' +
        '<p style="color:var(--gray600);line-height:1.7;margin-bottom:14px">Landlords can list properties from their dashboard once verification is complete. Each listing is reviewed by an admin within 24 hours.</p>' +
        '<h3 style="font-weight:700;color:var(--navy);margin-bottom:8px">Still need help?</h3>' +
        '<button class="btn btn-primary" onclick="closeInfoModal();showPage(\'contact\')">Contact Support</button>'
    },
    'landlord-guide': {
      title: 'Landlord Guide',
      sub: 'Everything you need to start earning from your property.',
      body:
        '<ol style="color:var(--gray600);line-height:1.8;padding-left:20px;margin-bottom:18px">' +
          '<li>Register and choose <strong>Landlord</strong> as your role.</li>' +
          '<li>Verify your Ghana Card and enroll your face for trust scoring.</li>' +
          '<li>From your dashboard, click <strong>+ Add Property</strong> with photos, address, and price.</li>' +
          '<li>Wait for admin approval (usually within 24h).</li>' +
          '<li>Approve incoming tenancy requests, generate invoices, track payments.</li>' +
        '</ol>' +
        '<button class="btn btn-primary" onclick="closeInfoModal();openModal(\'register\')">Become a Landlord</button>'
    },
    'tenant-guide': {
      title: 'Tenant Guide',
      sub: 'How to find and rent a verified property.',
      body:
        '<ol style="color:var(--gray600);line-height:1.8;padding-left:20px;margin-bottom:18px">' +
          '<li>Browse verified properties on the <strong>Properties</strong> page.</li>' +
          '<li>Click <strong>View Details</strong> and then <strong>Apply Now</strong>.</li>' +
          '<li>Sign in or register if prompted; complete identity verification.</li>' +
          '<li>The landlord reviews your request and either approves or rejects it.</li>' +
          '<li>Once approved, pay rent and file maintenance requests from your dashboard.</li>' +
        '</ol>' +
        '<button class="btn btn-primary" onclick="closeInfoModal();showPage(\'properties\')">Browse Properties</button>'
    },
    'privacy': {
      title: 'Privacy Policy',
      sub: 'How we collect, use, and protect your data.',
      body:
        '<p style="color:var(--gray600);line-height:1.7;margin-bottom:14px">Future Property Holdings collects only the data needed to verify your identity, list properties, and handle rent. Personal data is encrypted at rest and in transit, never sold to third parties, and is deletable on request.</p>' +
        '<p style="color:var(--gray600);line-height:1.7;margin-bottom:14px">Biometric data (face descriptors and Ghana Card details) is used solely for verification and never shared. You can request deletion of your account and all associated data from the Profile section of your dashboard.</p>' +
        '<p style="color:var(--gray600);line-height:1.7">For data subject requests, email <a href="mailto:privacy@fph.gh" style="color:var(--blue2)">privacy@fph.gh</a>.</p>'
    },
    'terms': {
      title: 'Terms of Use',
      sub: 'The agreement between you and Future Property Holdings.',
      body:
        '<p style="color:var(--gray600);line-height:1.7;margin-bottom:14px">By creating an account you agree to use the platform truthfully, list only properties you have the right to rent, and pay any agreed-upon rent on time.</p>' +
        '<p style="color:var(--gray600);line-height:1.7;margin-bottom:14px">Future Property Holdings is a marketplace and is not a party to the lease between landlord and tenant. Disputes should be raised via the inquiry system; admin moderation is available where needed.</p>' +
        '<p style="color:var(--gray600);line-height:1.7">Misuse of the platform — including fake listings, harassment, or fraud — will result in account suspension and may be reported to authorities.</p>'
    },
    'cookies': {
      title: 'Cookie Policy',
      sub: 'What we store on your device.',
      body:
        '<p style="color:var(--gray600);line-height:1.7;margin-bottom:14px">We use a small number of essential cookies (and localStorage entries) to keep you signed in and remember your preferences. We do not use third-party advertising trackers.</p>' +
        '<p style="color:var(--gray600);line-height:1.7">You can clear them at any time from your browser settings; this will sign you out.</p>'
    },
    'careers': {
      title: 'Careers',
      sub: 'Join the team building the future of Ghanaian rentals.',
      body:
        '<p style="color:var(--gray600);line-height:1.7;margin-bottom:14px">We hire engineers, product designers, customer-success specialists, and field verification officers in Accra and Kumasi.</p>' +
        '<p style="color:var(--gray600);line-height:1.7;margin-bottom:18px">Send your CV to <a href="mailto:careers@fph.gh" style="color:var(--blue2)">careers@fph.gh</a> with a short note about why FPH excites you.</p>' +
        '<button class="btn btn-primary" onclick="closeInfoModal();showPage(\'contact\')">Get in Touch</button>'
    },
    'reminders': {
      title: 'Automated Reminders',
      sub: 'How we keep tenants and landlords on schedule.',
      body:
        '<ul style="color:var(--gray600);line-height:1.8;padding-left:20px;margin-bottom:18px">' +
          '<li><strong>7 days</strong> before due date — gentle email reminder to the tenant.</li>' +
          '<li><strong>3 days</strong> before — second email plus SMS.</li>' +
          '<li><strong>1 day</strong> before — final SMS.</li>' +
          '<li><strong>On due date</strong> — both parties receive an in-app notification.</li>' +
          '<li><strong>Overdue</strong> — daily SMS until paid; landlord sees an Overdue badge in their dashboard.</li>' +
        '</ul>' +
        '<button class="btn btn-primary" onclick="closeInfoModal();goToDashOrLogin(\'rent\')">Open Rent Dashboard</button>'
    },
    'forgot-password': {
      title: 'Reset your password',
      sub: 'We will email you a secure reset link.',
      body:
        '<div class="form-group"><label>Email</label><input type="email" id="forgot-email" placeholder="your@email.com"></div>' +
        '<button class="btn btn-primary" style="width:100%;justify-content:center" onclick="submitForgot()">Send reset link</button>' +
        '<p style="font-size:.78rem;color:var(--gray400);margin-top:14px;text-align:center">If an account with that email exists you will receive a reset link within a few minutes.</p>'
    }
  };

  function openInfoModal(key) {
    const c = INFO_CONTENT[key];
    if (!c) return;
    document.getElementById('info-modal-title').textContent = c.title;
    document.getElementById('info-modal-sub').textContent = c.sub;
    document.getElementById('info-modal-body').innerHTML = c.body;
    document.getElementById('info-modal').classList.add('open');
  }
  function closeInfoModal() { document.getElementById('info-modal').classList.remove('open'); }
  function submitForgot() {
    const e = document.getElementById('forgot-email')?.value || '';
    if (!/^\S+@\S+\.\S+$/.test(e)) return showToast('Enter a valid email', 'error');
    closeInfoModal();
    showToast('If that account exists, a reset link is on its way.', 'success');
  }

  // Expose extra helpers
  window.goToDashOrLogin = goToDashOrLogin;
  window.applyPropSearch = applyPropSearch;
  window.openInfoModal   = openInfoModal;
  window.closeInfoModal  = closeInfoModal;
  window.submitForgot    = submitForgot;

  // Expose for debugging
  window.FPH = { api, Auth, renderDashShell };
})();
