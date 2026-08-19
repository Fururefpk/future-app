'use strict';
window.FPH = window.FPH || {};

window.FPH.dashboardUIHelpers2 = (() => {
  const I      = n => FPH.icons?.get(n) || '';
  const esc    = s => FPH.utils.escapeHtml(s);
  const ghs    = n => FPH.utils.formatGHS(n);
  const dt     = d => FPH.utils.formatDate(d);
  const ago    = d => FPH.utils.timeAgo(d);
  const cap    = s => FPH.utils.capitalize(s);
  const badge  = s => FPH.dashboardUIHelpers.statusBadge(s);
  const empty  = (icon,t,d,a) => FPH.dashboardUIHelpers.emptyState(icon,t,d,a);
  const header = (t,s,a) => FPH.dashboardUIHelpers.panelHeader(t,s,a);

  /* ── Inquiries / Chat ──────────────────────────────────── */
  function renderInquiries(data) {
    const items = data?.data?.inquiries || [];
    const role  = FPH.dashboard.getRole();
    const isLandlordOrAdmin = role==='landlord'||role==='admin';

    return `
      ${header('Inquiries','Messages and property inquiries',
        !isLandlordOrAdmin
          ? `<button class="btn btn-primary btn-sm" onclick="FPH.chatUI.openNewModal()">${I('plus')} New Inquiry</button>`
          : '')}
      ${items.length === 0
        ? empty('message-square','No Inquiries','No inquiries yet.',
            !isLandlordOrAdmin
              ? `<button class="btn btn-primary" onclick="FPH.chatUI.openNewModal()">${I('plus')} Send an Inquiry</button>`
              : '')
        : `<div class="table-wrap"><table class="data-table">
            <thead><tr><th>Subject</th><th>Property</th><th>${isLandlordOrAdmin?'From':'To'}</th><th>Status</th><th>Last Activity</th><th>Actions</th></tr></thead>
            <tbody>${items.map(q => {
              const me      = FPH.auth.getUser()?._id;
              const other   = q.sender?._id===me||q.sender===me ? q.recipient : q.sender;
              const otherName = (other?.firstName||'')+' '+(other?.lastName||'');
              return `<tr>
                <td>
                  <div style="font-weight:500;display:flex;align-items:center;gap:8px;">
                    ${q.unreadCount ? `<span class="badge badge-danger" style="padding:2px 6px;font-size:10px;">${q.unreadCount}</span>` : ''}
                    ${esc(q.subject||'Inquiry')}
                  </div>
                </td>
                <td style="color:var(--gray-600);font-size:13px;">${esc(q.property?.name||'—')}</td>
                <td style="font-size:13px;">${esc(otherName.trim()||'—')}</td>
                <td>${badge(q.status)}</td>
                <td style="color:var(--gray-400);font-size:12px;">${ago(q.updatedAt||q.createdAt)}</td>
                <td><div class="table-actions">
                  <button class="btn btn-outline btn-sm" onclick="FPH.chatUI.openThread('${esc(q._id)}')">${I('message-square')} Open</button>
                  ${q.status!=='closed'
                    ? `<button class="btn btn-ghost btn-sm" onclick="FPH.chatUI.close('${esc(q._id)}').then(()=>FPH.dashboard.invalidate('inquiries')&&FPH.dashboardUI.goTo('inquiries'))">Close</button>`
                    : ''}
                </div></td>
              </tr>`;
            }).join('')}</tbody>
          </table></div>`}`;
  }

  /* ── Maintenance ───────────────────────────────────────── */
  function renderMaintenance(data) {
    const items = data?.data?.requests || [];
    const role  = FPH.dashboard.getRole();
    const PRIORITY_COLORS = { low:'success', medium:'warning', high:'danger', emergency:'danger' };

    return `
      ${header('Maintenance','Track and manage maintenance requests',
        role==='tenant'
          ? `<button class="btn btn-primary btn-sm" onclick="FPH.maintenanceUI.openCreateModal()">${I('plus')} New Request</button>`
          : '')}
      ${items.length === 0
        ? empty('tool','No Maintenance Requests',
            role==='tenant'
              ? 'Submit a request when something needs attention.'
              : 'No maintenance requests from your tenants.',
            role==='tenant'
              ? `<button class="btn btn-primary" onclick="FPH.maintenanceUI.openCreateModal()">${I('plus')} Submit Request</button>`
              : '')
        : `<div class="table-wrap"><table class="data-table">
            <thead><tr><th>Title</th><th>Property</th><th>Priority</th><th>Status</th><th>Submitted</th><th>Actions</th></tr></thead>
            <tbody>${items.map(x => `<tr>
              <td><div style="font-weight:500;">${esc(x.title||'Request')}</div></td>
              <td style="font-size:13px;color:var(--gray-600);">${esc(x.property?.name||'—')}</td>
              <td><span class="badge badge-${PRIORITY_COLORS[x.priority]||'neutral'}">${esc(cap(x.priority||''))}</span></td>
              <td>${badge(x.status)}</td>
              <td style="font-size:12px;color:var(--gray-400);">${dt(x.createdAt)}</td>
              <td><div class="table-actions">
                ${role!=='tenant'&&x.status!=='completed'&&x.status!=='cancelled'
                  ? `<select class="form-control" style="height:32px;font-size:12px;padding:0 8px;min-width:130px;" onchange="FPH.maintenanceUI.updateStatus('${esc(x._id)}',this.value)">
                      <option value="">Update status</option>
                      <option value="in_progress"${x.status==='in_progress'?' selected':''}>In Progress</option>
                      <option value="completed"${x.status==='completed'?' selected':''}>Completed</option>
                      <option value="cancelled"${x.status==='cancelled'?' selected':''}>Cancelled</option>
                    </select>`
                  : ''}
                ${x.status==='completed'&&role==='tenant'&&!x.rating
                  ? `<button class="btn btn-outline btn-sm" onclick="FPH.maintenanceUI.openRateModal('${esc(x._id)}')">${I('star')} Rate</button>`
                  : ''}
              </div></td>
            </tr>`).join('')}</tbody>
          </table></div>`}`;
  }

  /* ── Admin: Users ──────────────────────────────────────── */
  function renderUsers(data) {
    const users = data?.data?.users || [];
    const total = data?.data?.total || 0;

    return `
      ${header('User Management',`${total} registered users`,
        `<div class="panel-actions">
          <div class="search-bar"><span>${I('search')}</span>
            <input type="text" class="form-control" id="userSearchInput" placeholder="Search users…" oninput="FPH.adminUI.searchUsers(this.value)" style="height:36px;">
          </div>
          <select class="form-control" style="height:36px;width:140px;" onchange="FPH.adminUI.filterUsers(this.value)">
            <option value="">All roles</option>
            <option value="tenant">Tenants</option>
            <option value="landlord">Landlords</option>
            <option value="admin">Admins</option>
          </select>
        </div>`)}
      ${users.length === 0
        ? empty('users','No Users Found','No users match the current filter.')
        : `<div class="table-wrap"><table class="data-table">
            <thead><tr><th>User</th><th>Role</th><th>Verification</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
            <tbody>${users.map(u => `<tr>
              <td><div class="table-user">
                <div class="table-avatar">${esc(FPH.utils.initials(u.firstName,u.lastName))}</div>
                <div><div class="table-user-name">${esc(u.firstName+' '+u.lastName)}</div>
                     <div class="table-user-email">${esc(u.email)}</div></div>
              </div></td>
              <td>${badge(u.role)}</td>
              <td>${badge(u.verification?.status||'unverified')}</td>
              <td>${u.isActive!==false?'<span class="badge badge-success">Active</span>':'<span class="badge badge-danger">Suspended</span>'}</td>
              <td style="font-size:12px;color:var(--gray-400);">${dt(u.createdAt)}</td>
              <td><div class="table-actions">
                ${u.isActive!==false
                  ? `<button class="btn btn-danger btn-sm"  onclick="FPH.adminUI.toggleUser('${esc(u._id)}',false)">Suspend</button>`
                  : `<button class="btn btn-secondary btn-sm" onclick="FPH.adminUI.toggleUser('${esc(u._id)}',true)">Activate</button>`}
                <select class="form-control" style="height:32px;font-size:12px;padding:0 8px;min-width:120px;" onchange="FPH.adminUI.changeRole('${esc(u._id)}',this.value)">
                  <option value="">Change role</option>
                  <option value="tenant">Tenant</option>
                  <option value="landlord">Landlord</option>
                  <option value="admin">Admin</option>
                </select>
              </div></td>
            </tr>`).join('')}</tbody>
          </table></div>`}`;
  }

  /* ── Admin: Properties ─────────────────────────────────── */
  function renderAdminProperties(data) {
    const props = data?.data?.properties || [];

    return `
      ${header('Pending Properties',`${props.length} listings awaiting review`)}
      ${props.length === 0
        ? empty('building','No Pending Listings','All property listings have been reviewed.')
        : `<div class="table-wrap"><table class="data-table">
            <thead><tr><th>Property</th><th>Landlord</th><th>City</th><th>Price</th><th>Submitted</th><th>Actions</th></tr></thead>
            <tbody>${props.map(p => `<tr>
              <td><div style="font-weight:500;">${esc(p.name||'')}</div>
                  <div style="font-size:12px;color:var(--gray-500);">${esc(cap(p.propertyType||''))}</div></td>
              <td><div style="font-size:13px;">${esc((p.landlord?.firstName||'')+' '+(p.landlord?.lastName||''))}</div>
                  <div style="font-size:11px;color:var(--gray-400);">${esc(p.landlord?.email||'')}</div></td>
              <td>${esc(p.city||'')}</td>
              <td style="font-weight:600;">${ghs(p.price)}</td>
              <td style="font-size:12px;color:var(--gray-400);">${dt(p.createdAt)}</td>
              <td><div class="table-actions">
                <button class="btn btn-secondary btn-sm" onclick="FPH.adminUI.reviewProperty('${esc(p._id)}','approved')">${I('check')} Approve</button>
                <button class="btn btn-danger btn-sm"    onclick="FPH.adminUI.reviewProperty('${esc(p._id)}','rejected')">${I('x')} Reject</button>
              </div></td>
            </tr>`).join('')}</tbody>
          </table></div>`}`;
  }

  /* ── Admin: Verifications ──────────────────────────────── */
  function renderVerifications(data) {
    const users = data?.data?.users || [];

    return `
      ${header('Verification Queue',`${users.length} users pending identity review`)}
      ${users.length === 0
        ? empty('shield-check','All Verified','No identity submissions are pending review.')
        : `<div class="table-wrap"><table class="data-table">
            <thead><tr><th>User</th><th>Ghana Card</th><th>Submitted</th><th>Actions</th></tr></thead>
            <tbody>${users.map(u => {
              const v = u.verification || {};
              return `<tr>
                <td><div class="table-user">
                  <div class="table-avatar">${esc(FPH.utils.initials(u.firstName,u.lastName))}</div>
                  <div><div class="table-user-name">${esc(u.firstName+' '+u.lastName)}</div>
                       <div class="table-user-email">${esc(u.email)}</div></div>
                </div></td>
                <td>
                  <div style="font-size:13px;font-weight:500;">${esc(v.ghanaCardNumber||'—')}</div>
                  <div style="font-size:11px;color:var(--gray-500);">${esc(v.ghanaCardName||'')}</div>
                  ${v.ghanaCardImageUrl ? `<a href="${esc(v.ghanaCardImageUrl)}" target="_blank" class="btn btn-ghost btn-sm" style="padding:2px 6px;font-size:11px;">${I('eye')} View Card</a>` : ''}
                </td>
                <td style="font-size:12px;color:var(--gray-400);">${v.submittedAt?dt(v.submittedAt):'—'}</td>
                <td><div class="table-actions">
                  <button class="btn btn-secondary btn-sm" onclick="FPH.adminUI.reviewVerification('${esc(u._id)}','approved')">${I('check-circle')} Approve</button>
                  <button class="btn btn-danger btn-sm"    onclick="FPH.adminUI.reviewVerification('${esc(u._id)}','rejected')">${I('x-circle')} Reject</button>
                  <button class="btn btn-outline btn-sm"   onclick="FPH.adminUI.override('${esc(u._id)}')">Override</button>
                </div></td>
              </tr>`;
            }).join('')}</tbody>
          </table></div>`}`;
  }

  /* ── Admin: Audit Log ──────────────────────────────────── */
  function renderAuditLog(data) {
    const logs  = data?.data?.logs  || [];
    const total = data?.data?.total || 0;

    return `
      ${header('Audit Log',`${total} administrative actions recorded`)}
      ${logs.length === 0
        ? empty('clipboard','No Audit Records','No administrative actions have been recorded yet.')
        : `<div class="table-wrap"><table class="data-table">
            <thead><tr><th>Action</th><th>Admin</th><th>Target</th><th>Details</th><th>When</th></tr></thead>
            <tbody>${logs.map(l => `<tr>
              <td><span class="badge badge-neutral" style="font-size:11px;">${esc(l.action||'')}</span></td>
              <td style="font-size:13px;">${esc((l.admin?.firstName||'')+' '+(l.admin?.lastName||''))}</td>
              <td style="font-size:12px;color:var(--gray-500);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(l.target||'—')}</td>
              <td style="font-size:12px;color:var(--gray-600);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(l.details||'—')}</td>
              <td style="font-size:12px;color:var(--gray-400);white-space:nowrap;">${ago(l.createdAt)}</td>
            </tr>`).join('')}</tbody>
          </table></div>`}`;
  }

  return { renderInquiries, renderMaintenance, renderUsers, renderAdminProperties, renderVerifications, renderAuditLog };
})();