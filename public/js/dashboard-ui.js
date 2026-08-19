'use strict';
window.FPH = window.FPH || {};

window.FPH.dashboardUIHelpers = (() => {
  const I   = n  => FPH.icons?.get(n) || '';
  const esc = s  => FPH.utils.escapeHtml(s);
  const ghs = n  => FPH.utils.formatGHS(n);
  const dt  = d  => FPH.utils.formatDate(d);
  const ago = d  => FPH.utils.timeAgo(d);
  const cap = s  => FPH.utils.capitalize(s);

  /* ── Shared components ─────────────────────────────────── */
  function statCard(icon, label, value, sub, color = 'blue') {
    return `<div class="stat-card">
      <div class="stat-icon-wrap ${color}">${I(icon)}</div>
      <div class="stat-content">
        <div class="stat-value">${esc(String(value))}</div>
        <div class="stat-label">${esc(label)}</div>
        ${sub ? `<div class="stat-change">${esc(sub)}</div>` : ''}
      </div>
    </div>`;
  }

  function emptyState(icon, title, desc, action = '') {
    return `<div class="empty-state">
      <div class="empty-icon">${I(icon)}</div>
      <div class="empty-title">${esc(title)}</div>
      <div class="empty-desc">${esc(desc)}</div>
      ${action}
    </div>`;
  }

  function statusBadge(status) {
    const map = {
      active: 'success', approved: 'success', paid: 'success', completed: 'success', verified: 'success',
      pending: 'warning', unpaid: 'warning', in_progress: 'warning',
      rejected: 'danger', overdue: 'danger', cancelled: 'danger',
      ended: 'neutral', closed: 'neutral', voided: 'neutral', unverified: 'neutral', open: 'primary',
    };
    const cls = map[status] || 'neutral';
    return `<span class="badge badge-${cls}">${esc(cap(status?.replace('_', ' ') || ''))}</span>`;
  }

  function actionBtn(label, onclick, type = 'outline') {
    return `<button class="btn btn-${type} btn-sm" onclick="${onclick}">${label}</button>`;
  }

  function panelHeader(title, subtitle = '', actions = '') {
    return `<div class="panel-header">
      <div><div class="panel-title">${esc(title)}</div>${subtitle ? `<div style="font-size:13px;color:var(--gray-500);margin-top:2px;">${esc(subtitle)}</div>` : ''}</div>
      ${actions ? `<div class="panel-actions">${actions}</div>` : ''}
    </div>`;
  }

  function verificationBanner(user) {
    const v = user?.verification;
    if (v?.status === 'verified') return '';
    if (v?.status === 'pending') {
      return `<div class="banner banner-info">
        <div class="banner-content">${I('info')} Your identity verification is under review. We will notify you within 24-48 hours.</div>
      </div>`;
    }
    return `<div class="banner banner-warning">
      <div class="banner-content">${I('alert-triangle')} Your identity is not yet verified. Some features are restricted until verification is complete.</div>
      <button class="btn btn-warning btn-sm" onclick="FPH.dashboardUI.goTo('settings')">Verify Now</button>
    </div>`;
  }

  /* ── Overview panel ────────────────────────────────────── */
  function renderOverview(data) {
    const user = FPH.auth.getUser();
    const role = FPH.dashboard.getRole();

    if (role === 'creator') return renderCreatorOverview(data, user);
    if (role === 'admin')   return renderAdminOverview(data);
    if (role === 'landlord')return renderLandlordOverview(data, user);
    return renderTenantOverview(data, user);
  }

  function renderCreatorOverview(data, user) {
    const tenancies = data?.tenancies?.data?.tenancies || [];
    const invoices  = data?.invoices?.data?.invoices   || [];
    const listings  = data?.listings?.data?.properties || [];
    const unpaid    = invoices.filter(i => ['unpaid','overdue'].includes(i.status));

    return `
      ${panelHeader('Platform Overview', `Welcome back, ${esc(user?.firstName||'')} — Admin & Landlord`)}
      <div class="alert alert-info" style="margin-bottom:20px;">
        ${I('shield-check')}
        <div><strong>Creator Account</strong> &mdash; You have simultaneous admin and landlord access. Use <em>My Account</em> tabs to manage your properties and <em>Administration</em> tabs to manage the platform.</div>
      </div>
      <div class="stats-grid">
        ${statCard('building',   'My Listings',      listings.length,                       '', 'blue')}
        ${statCard('list',       'My Tenancies',      tenancies.filter(t=>t.status==='active').length, tenancies.filter(t=>t.status==='pending').length+' pending', 'green')}
        ${statCard('receipt',    'Unpaid Invoices',   unpaid.length,                         FPH.utils.formatGHS(unpaid.reduce((s,i)=>s+(i.amount||0),0))+' outstanding', unpaid.length?'red':'green')}
        ${statCard('shield-check','Verification',     'Verified',                            'Creator account', 'green')}
      </div>
      ${tenancies.filter(t=>t.status==='pending').length ? `<div class="alert alert-warning" style="margin-top:8px;">${I('alert-triangle')}
        <div>You have ${tenancies.filter(t=>t.status==='pending').length} pending tenancy request${tenancies.filter(t=>t.status==='pending').length>1?'s':''} awaiting your approval.
        <a href="#" onclick="FPH.dashboardUI.goTo('tenancies');return false;" style="font-weight:600;"> Review now</a></div></div>` : ''}`;
  }

  function renderAdminOverview(data) {
    const s = data?.data?.stats || {};
    const recent = data?.data?.recentUsers || [];
    const props  = data?.data?.recentProperties || [];

    return `
      ${panelHeader('Platform Overview', 'Real-time statistics and recent activity')}
      <div class="stats-grid">
        ${statCard('users',    'Total Users',      s.users?.total || 0,        `${s.users?.landlords||0} landlords, ${s.users?.tenants||0} tenants`, 'blue')}
        ${statCard('building', 'Total Properties', s.properties?.total || 0,   `${s.properties?.pending||0} pending review`, 'green')}
        ${statCard('list',     'Active Tenancies', s.tenancies?.active || 0,   `${s.tenancies?.total||0} total`, 'amber')}
        ${statCard('shield',   'Pending Verif.',   s.verifications?.pending||0,'awaiting review', 'red')}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:8px;">
        <div class="card">
          <div class="card-header"><h3>Recent Registrations</h3></div>
          <div class="card-body" style="padding:0;">
            ${recent.length
              ? `<table class="data-table">${recent.map(u => `
                  <tr>
                    <td><div class="table-user">
                      <div class="table-avatar">${esc(FPH.utils.initials(u.firstName,u.lastName))}</div>
                      <div><div class="table-user-name">${esc(u.firstName+' '+u.lastName)}</div>
                           <div class="table-user-email">${esc(u.email)}</div></div>
                    </div></td>
                    <td>${statusBadge(u.role)}</td>
                    <td>${statusBadge(u.verification?.status||'unverified')}</td>
                    <td style="color:var(--gray-400);font-size:12px;">${ago(u.createdAt)}</td>
                  </tr>`).join('')}</table>`
              : emptyState('users','No recent users','No new registrations yet.')}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3>Recent Listings</h3>
            <button class="btn btn-outline btn-sm" onclick="FPH.dashboardUI.goTo('properties')">View All</button>
          </div>
          <div class="card-body" style="padding:0;">
            ${props.length
              ? `<table class="data-table">${props.map(p => `
                  <tr>
                    <td><div style="font-weight:500;">${esc(p.name||'')}</div><div style="font-size:12px;color:var(--gray-500);">${esc(p.city||'')}</div></td>
                    <td>${statusBadge(p.status)}</td>
                    <td style="color:var(--gray-400);font-size:12px;">${ago(p.createdAt)}</td>
                  </tr>`).join('')}</table>`
              : emptyState('building','No listings yet','No properties have been added.')}
          </div>
        </div>
      </div>`;
  }

  function renderTenantOverview(data, user) {
    const tenancies = data?.tenancies?.data?.tenancies || [];
    const invoices  = data?.invoices?.data?.invoices   || [];
    const overdue   = invoices.filter(i => i.status === 'overdue');

    return `
      ${verificationBanner(user)}
      ${panelHeader(`Welcome back, ${esc(user?.firstName||'there')}`, 'Here is a summary of your account')}
      <div class="stats-grid">
        ${statCard('list',     'My Tenancies', tenancies.length, tenancies.filter(t=>t.status==='active').length+' active', 'blue')}
        ${statCard('receipt',  'Invoices',     invoices.length,  overdue.length+' overdue', overdue.length?'red':'green')}
        ${statCard('shield-check','Verification', cap(user?.verification?.status||'unverified'), '', user?.verification?.status==='verified'?'green':'amber')}
      </div>
      ${overdue.length ? `<div class="alert alert-danger">${I('alert-triangle')}
        <div><div class="alert-title">Overdue Invoices</div>You have ${overdue.length} overdue invoice${overdue.length>1?'s':''} totalling ${ghs(overdue.reduce((s,i)=>s+(i.amount||0),0))}.
        <a href="#" onclick="FPH.dashboardUI.goTo('rent');return false;" style="font-weight:600;">View and pay now</a></div></div>` : ''}
      ${tenancies.length ? `<div class="card" style="margin-top:16px;">
        <div class="card-header"><h3>Recent Tenancies</h3><button class="btn btn-outline btn-sm" onclick="FPH.dashboardUI.goTo('tenancies')">View All</button></div>
        <div class="card-body" style="padding:0;"><table class="data-table">
          <thead><tr><th>Property</th><th>Status</th><th>Since</th><th></th></tr></thead>
          <tbody>${tenancies.slice(0,5).map(t => `<tr>
            <td><div style="font-weight:500;">${esc(t.property?.name||'Property')}</div><div style="font-size:12px;color:var(--gray-500);">${esc(t.property?.city||'')}</div></td>
            <td>${statusBadge(t.status)}</td>
            <td style="color:var(--gray-500);font-size:13px;">${dt(t.createdAt)}</td>
            <td>${t.status==='active'?actionBtn('Maintenance','FPH.dashboardUI.goTo(\'maintenance\')'):''}
            </td></tr>`).join('')}</tbody>
        </table></div></div>` : ''}`;
  }

  function renderLandlordOverview(data, user) {
    const tenancies = data?.tenancies?.data?.tenancies || [];
    const invoices  = data?.invoices?.data?.invoices   || [];
    const unpaid    = invoices.filter(i => ['unpaid','overdue'].includes(i.status));

    return `
      ${verificationBanner(user)}
      ${panelHeader(`Welcome back, ${esc(user?.firstName||'there')}`, 'Your property portfolio at a glance')}
      <div class="stats-grid">
        ${statCard('building', 'My Listings',     data?.listings?.data?.properties?.length||0, '', 'blue')}
        ${statCard('list',     'Active Tenancies',tenancies.filter(t=>t.status==='active').length,`${tenancies.filter(t=>t.status==='pending').length} pending`, 'green')}
        ${statCard('receipt',  'Unpaid Invoices', unpaid.length, ghs(unpaid.reduce((s,i)=>s+(i.amount||0),0))+' outstanding', unpaid.length?'red':'green')}
        ${statCard('shield-check','Verification', cap(user?.verification?.status||'unverified'),'','verified'===user?.verification?.status?'green':'amber')}
      </div>
      ${tenancies.filter(t=>t.status==='pending').length ? `<div class="alert alert-warning">${I('alert-triangle')}
        <div><div class="alert-title">Pending Tenancy Requests</div>
        You have ${tenancies.filter(t=>t.status==='pending').length} tenancy request${tenancies.filter(t=>t.status==='pending').length>1?'s':''} awaiting your decision.
        <a href="#" onclick="FPH.dashboardUI.goTo('tenancies');return false;" style="font-weight:600;"> Review now</a></div></div>` : ''}`;
  }

  /* ── Listings panel ────────────────────────────────────── */
  function renderListings(data) {
    const listings = data?.data?.properties || [];
    return `
      ${panelHeader('My Listings','Manage your property listings',
        `<button class="btn btn-primary btn-sm" onclick="FPH.propertiesUI.openCreateModal()">${I('plus')} New Listing</button>`)}
      ${listings.length === 0
        ? emptyState('building','No Listings Yet','You have not added any property listings.',
            `<button class="btn btn-primary" onclick="FPH.propertiesUI.openCreateModal()">${I('plus')} Add Your First Listing</button>`)
        : `<div class="table-wrap"><table class="data-table">
            <thead><tr><th>Property</th><th>City</th><th>Price</th><th>Status</th><th>Added</th><th>Actions</th></tr></thead>
            <tbody>${listings.map(p => `<tr>
              <td><div style="font-weight:500;">${esc(p.name||'')}</div><div style="font-size:12px;color:var(--gray-500);">${esc(cap(p.propertyType||''))}</div></td>
              <td>${esc(p.city||'')}</td>
              <td>${ghs(p.price)}</td>
              <td>${statusBadge(p.status)}</td>
              <td style="color:var(--gray-500);font-size:13px;">${dt(p.createdAt)}</td>
              <td><div class="table-actions">
                ${actionBtn('Edit',   `FPH.propertiesUI.openEditModal('${esc(p._id)}')`)}
                ${actionBtn('Delete', `FPH.propertiesUI.confirmDelete('${esc(p._id)}',decodeURIComponent('${encodeURIComponent(p.name||'')}'))`, 'danger')}
              </div></td>
            </tr>`).join('')}</tbody>
          </table></div>`}`;
  }

  /* ── Tenancies panel ───────────────────────────────────── */
  function renderTenancies(data) {
    const items = data?.data?.tenancies || [];
    const role  = FPH.dashboard.getRole();
    return `
      ${panelHeader('Tenancies','Track all tenancy requests and active agreements')}
      ${items.length === 0
        ? emptyState('list','No Tenancies Found',role==='tenant'?'You have not requested any tenancies yet.':'No tenancy records for your properties.')
        : `<div class="table-wrap"><table class="data-table">
            <thead><tr><th>Property</th><th>${role==='tenant'?'Landlord':'Tenant'}</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>${items.map(t => {
              const prop    = t.property?.name || 'Property';
              const partner = role==='tenant'
                ? (t.property?.landlord?.firstName||'') + ' ' + (t.property?.landlord?.lastName||'')
                : (t.tenant?.firstName||'') + ' ' + (t.tenant?.lastName||'');
              const id = esc(t._id);
              return `<tr>
                <td><div style="font-weight:500;">${esc(prop)}</div><div style="font-size:12px;color:var(--gray-500);">${esc(t.property?.city||'')}</div></td>
                <td>${esc(partner.trim()||'—')}</td>
                <td>${statusBadge(t.status)}</td>
                <td style="color:var(--gray-500);font-size:13px;">${dt(t.createdAt)}</td>
                <td><div class="table-actions">
                  ${t.status==='pending'&&role!=='tenant'
                    ? actionBtn('Approve',`FPH.tenanciesUI.decide('${id}','approved')`,'secondary')+
                      actionBtn('Reject', `FPH.tenanciesUI.decide('${id}','rejected')`,'danger')
                    : ''}
                  ${t.status==='active'
                    ? actionBtn('End',`FPH.tenanciesUI.endTenancy('${id}')`)
                    : ''}
                </div></td>
              </tr>`;
            }).join('')}</tbody>
          </table></div>`}`;
  }

  /* ── Rent & Invoices panel ─────────────────────────────── */
  function renderRent(data) {
    const invoices = data?.data?.invoices || [];
    const role     = FPH.dashboard.getRole();
    const overdue  = invoices.filter(i => i.status === 'overdue');
    const totalOut = invoices.filter(i => ['unpaid','overdue'].includes(i.status)).reduce((s,i)=>s+(i.amount||0),0);

    return `
      ${panelHeader('Rent & Invoices','Manage invoices and payment records',
        role==='landlord'||role==='admin'
          ? `<button class="btn btn-primary btn-sm" onclick="FPH.rentUI.openGenerateModal()">${I('plus')} Generate Invoice</button>`
          : '')}
      ${overdue.length ? `<div class="alert alert-danger">${I('alert-triangle')}<div>
        <div class="alert-title">${overdue.length} Overdue Invoice${overdue.length>1?'s':''}</div>
        Total outstanding: ${ghs(totalOut)}. Please settle immediately to avoid penalties.
      </div></div>` : ''}
      ${invoices.length === 0
        ? emptyState('receipt','No Invoices Yet','No invoices have been generated yet.')
        : `<div class="table-wrap"><table class="data-table">
            <thead><tr><th>Description</th><th>Amount</th><th>Due Date</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>${invoices.map(inv => {
              const id = esc(inv._id);
              return `<tr>
                <td><div style="font-weight:500;">${esc(inv.description||'Rent Invoice')}</div></td>
                <td style="font-weight:600;">${ghs(inv.amount)}</td>
                <td style="color:${inv.status==='overdue'?'var(--danger)':'var(--gray-700)'};">${dt(inv.dueDate)}</td>
                <td>${statusBadge(inv.status)}</td>
                <td><div class="table-actions">
                  ${inv.status!=='paid'&&inv.status!=='voided'
                    ? actionBtn('Record Payment',`FPH.rentUI.openPayModal('${id}')`, 'secondary')
                    : ''}
                  <a class="btn btn-outline btn-sm" href="${FPH.rent.pdfUrl(id)}" target="_blank">${I('download')} PDF</a>
                  ${(role==='landlord'||role==='admin')&&inv.status!=='paid'
                    ? actionBtn('Void',`FPH.rentUI.voidInvoice('${id}')`)
                    : ''}
                </div></td>
              </tr>`;
            }).join('')}</tbody>
          </table></div>`}`;
  }

  return { renderOverview, renderListings, renderTenancies, renderRent, statCard, emptyState, statusBadge, panelHeader };
})();
