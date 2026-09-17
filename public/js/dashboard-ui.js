'use strict';
window.FPH = window.FPH || {};

window.FPH.dashboardUI = (() => {
  const I = name => FPH.icons?.get(name) || '';

  const TAB_ICONS = {
    overview: 'dashboard', listings: 'building', tenancies: 'list',
    rent: 'receipt', maintenance: 'tool', inquiries: 'message-square',
    settings: 'settings', properties: 'building', users: 'users',
    verifications: 'shield', audit: 'clipboard',
  };

  const TAB_LABELS = {
    overview: 'Overview', listings: 'My Listings', tenancies: 'Tenancies',
    rent: 'Rent & Invoices', maintenance: 'Maintenance', inquiries: 'Inquiries',
    settings: 'Settings', properties: 'Properties', users: 'Users',
    verifications: 'Verifications', audit: 'Audit Log',
  };

  /* ── Shell ─────────────────────────────────────────────── */
  function renderShell() {
    const user = FPH.auth.getUser();
    if (!user) return;

    const nameEl = document.getElementById('dashUserName');
    const roleEl = document.getElementById('dashUserRole');
    if (nameEl) nameEl.textContent = `${user.firstName} ${user.lastName}`;
    if (roleEl) roleEl.textContent = FPH.utils.capitalize(user.role || 'tenant');

    renderNav();
  }

  function renderNav() {
    const nav  = document.getElementById('dashNav');
    if (!nav) return;
    const tabs = FPH.dashboard.getTabs();
    const cur  = FPH.dashboard.getCurrentTab();
    const role = FPH.dashboard.getRole();

    const mainTabs = tabs.filter(t => t !== 'settings');
    const hasSectionLabels = role === 'admin';

    let html = '';
    if (hasSectionLabels) {
      const platformTabs = mainTabs.filter(t => ['overview','properties','users','verifications','audit'].includes(t));
      const otherTabs    = mainTabs.filter(t => !platformTabs.includes(t) && t !== 'settings');
      if (platformTabs.length) {
        html += `<div class="dash-nav-section"><div class="dash-nav-label">Platform</div>${platformTabs.map(t => _navItem(t, cur)).join('')}</div>`;
      }
      if (otherTabs.length) {
        html += `<div class="dash-nav-section"><div class="dash-nav-label">Manage</div>${otherTabs.map(t => _navItem(t, cur)).join('')}</div>`;
      }
    } else {
      html += `<div class="dash-nav-section">${mainTabs.map(t => _navItem(t, cur)).join('')}</div>`;
    }

    html += `<div class="dash-nav-section" style="margin-top:auto;border-top:1px solid var(--gray-100);padding-top:8px;">${_navItem('settings', cur)}</div>`;
    nav.innerHTML = html;
  }

  function _navItem(tab, current) {
    const unread = tab === 'inquiries' ? FPH.notifications.getCount() : 0;
    return `<button class="dash-nav-item${tab === current ? ' active' : ''}" data-tab="${tab}" data-action="FPH.dashboardUI.goTo" data-value="${tab}">
      ${I(TAB_ICONS[tab] || 'list')}
      <span>${TAB_LABELS[tab] || tab}</span>
      ${unread ? `<span class="badge badge-danger nav-badge" style="padding:2px 6px;font-size:10px;">${unread}</span>` : ''}
    </button>`;
  }

  function setActiveNav(tab) {
    document.querySelectorAll('.dash-nav-item').forEach(b =>
      b.classList.toggle('active', b.dataset.tab === tab));
  }

  /* ── Tab navigation ────────────────────────────────────── */
  async function goTo(tab) {
    FPH.dashboard.goTo(tab);
    setActiveNav(tab);
    updatePanelHeading(tab);
    closeSidebar();
    await renderTab(tab);
  }

  function updatePanelHeading(tab) {
    const h = document.getElementById('panelHeading');
    if (h) h.textContent = TAB_LABELS[tab] || tab;
  }

  async function renderTab(tab) {
    const panel = document.getElementById('dashPanel');
    if (!panel) return;
    panel.innerHTML = `<div class="loading-center"><div class="loading-spinner"></div><span>Loading ${TAB_LABELS[tab]}…</span></div>`;

    const data = await FPH.dashboard.loadTabData(tab);
    if (data?.error && tab !== 'overview') {
      panel.innerHTML = `<div class="alert alert-danger">${I('alert-circle')} <span>${FPH.utils.escapeHtml(data.error)}</span></div>`;
      return;
    }

    try {
      switch (tab) {
        case 'overview':     panel.innerHTML = FPH.dashboardUIHelpers.renderOverview(data);         break;
        case 'listings':     panel.innerHTML = FPH.dashboardUIHelpers.renderListings(data);         break;
        case 'tenancies':    panel.innerHTML = FPH.dashboardUIHelpers.renderTenancies(data);        break;
        case 'rent':         panel.innerHTML = FPH.dashboardUIHelpers.renderRent(data);             break;
        case 'inquiries':    panel.innerHTML = FPH.dashboardUIHelpers2.renderInquiries(data);       break;
        case 'maintenance':  panel.innerHTML = FPH.dashboardUIHelpers2.renderMaintenance(data);     break;
        case 'users':        panel.innerHTML = FPH.dashboardUIHelpers2.renderUsers(data);           break;
        case 'properties':   panel.innerHTML = FPH.dashboardUIHelpers2.renderAdminProperties(data); break;
        case 'verifications':panel.innerHTML = FPH.dashboardUIHelpers2.renderVerifications(data);   break;
        case 'audit':        panel.innerHTML = FPH.dashboardUIHelpers2.renderAuditLog(data);        break;
        case 'settings':     FPH.settingsUI.render(panel);                                          return;
        default:             panel.innerHTML = `<div class="alert alert-info">${I('info')} Panel coming soon.</div>`;
      }
    } catch (e) {
      console.error('renderTab error:', e);
      panel.innerHTML = `<div class="alert alert-danger">${I('alert-circle')} <span>${FPH.utils.escapeHtml(e.message)}</span></div>`;
    }
  }

  function updateVerificationBadge() {
    const user = FPH.auth.getUser();
    const v    = user?.verification || {};
    const status = v.status || 'unverified';
    const cls    = status === 'verified' ? 'success' : status === 'pending' ? 'warning' : 'neutral';
    const label  = status === 'verified' ? 'Verified' : status === 'pending' ? 'Pending' : 'Not Verified';
    ['dashVerificationPill','verificationStatusPill'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.className = `badge badge-${cls}`;
      el.textContent = label;
    });
  }

  /* ── Mobile sidebar ────────────────────────────────────── */
  function openSidebar() {
    document.getElementById('dashSidebar')?.classList.add('open');
    const overlay = document.getElementById('sidebarOverlay');
    if (overlay) overlay.style.display = 'block';
  }
  function closeSidebar() {
    document.getElementById('dashSidebar')?.classList.remove('open');
    const overlay = document.getElementById('sidebarOverlay');
    if (overlay) overlay.style.display = 'none';
  }

  return { renderShell, renderNav, setActiveNav, goTo, renderTab, updateVerificationBadge, openSidebar, closeSidebar };
})();