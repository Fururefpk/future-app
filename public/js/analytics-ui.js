'use strict';
window.FPH = window.FPH || {};

window.FPH.analyticsUI = (() => {
  const I   = n => FPH.icons?.get(n) || '';
  const ghs = n => FPH.utils.formatGHS(n);

  function renderAdminPanel(container) {
    container.innerHTML = `
      <div style="margin-bottom:24px;">
        <div class="panel-title">Platform Analytics</div>
        <div style="font-size:13px;color:var(--gray-500);margin-top:4px;">Overview of platform activity and growth metrics.</div>
      </div>
      <div id="analytics-stats" class="stats-grid" style="margin-bottom:24px;">
        <div class="stat-card"><div class="stat-icon-wrap blue">${I('bar-chart')}</div><div class="stat-content"><div class="stat-value">—</div><div class="stat-label">Loading&hellip;</div></div></div>
      </div>
      <div class="analytics-grid">
        <div class="card">
          <div class="card-header"><h3>User Growth</h3></div>
          <div class="card-body"><canvas id="userGrowthChart" style="width:100%;height:220px;display:block;"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header"><h3>Revenue Summary</h3></div>
          <div class="card-body"><canvas id="revenueChart" style="width:100%;height:220px;display:block;"></canvas></div>
        </div>
      </div>`;

    FPH.analytics.getPlatformStats()
      .then(d => {
        const s = d?.data || {};
        const statsEl = document.getElementById('analytics-stats');
        if (statsEl) {
          statsEl.innerHTML = `
            <div class="stat-card"><div class="stat-icon-wrap blue">${I('users')}</div>
              <div class="stat-content"><div class="stat-value">${s.newUsers||0}</div><div class="stat-label">New Users (30d)</div></div></div>
            <div class="stat-card"><div class="stat-icon-wrap green">${I('building')}</div>
              <div class="stat-content"><div class="stat-value">${s.newProperties||0}</div><div class="stat-label">New Listings (30d)</div></div></div>
            <div class="stat-card"><div class="stat-icon-wrap amber">${I('list')}</div>
              <div class="stat-content"><div class="stat-value">${s.newTenancies||0}</div><div class="stat-label">New Tenancies (30d)</div></div></div>`;
        }
        _drawBarChart('userGrowthChart', s.userGrowth || []);
      })
      .catch(() => {
        const statsEl = document.getElementById('analytics-stats');
        if (statsEl) statsEl.innerHTML = `<div class="alert alert-info">${I('info')} Analytics data is not available in demo mode.</div>`;
      });
  }

  function _drawBarChart(canvasId, points) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx   = canvas.getContext('2d');
    const W     = canvas.offsetWidth || 300;
    const H     = 200;
    canvas.width  = W;
    canvas.height = H;
    if (!points.length) {
      ctx.fillStyle = 'var(--gray-100)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'var(--gray-400)';
      ctx.font = '13px Inter,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No data available', W/2, H/2);
      return;
    }
    const max  = Math.max(...points.map(p => p.count || 0), 1);
    const pad  = { top: 16, bottom: 32, left: 8, right: 8 };
    const barW = Math.max(4, Math.floor((W - pad.left - pad.right) / points.length) - 4);
    ctx.clearRect(0, 0, W, H);
    points.forEach((p, i) => {
      const barH = Math.floor(((p.count || 0) / max) * (H - pad.top - pad.bottom));
      const x    = pad.left + i * (barW + 4);
      const y    = H - pad.bottom - barH;
      const grad = ctx.createLinearGradient(0, y, 0, H - pad.bottom);
      grad.addColorStop(0, '#3b82f6');
      grad.addColorStop(1, '#1d4ed8');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect?.(x, y, barW, barH, 3) || ctx.rect(x, y, barW, barH);
      ctx.fill();
      ctx.fillStyle = '#9ca3af';
      ctx.font = '10px Inter,sans-serif';
      ctx.textAlign = 'center';
      const label = p._id?.month ? `${p._id.month}/${String(p._id.year||'').slice(2)}` : String(i+1);
      ctx.fillText(label, x + barW/2, H - 8);
    });
  }

  return { renderAdminPanel };
})();