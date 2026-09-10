'use strict';
window.FPH = window.FPH || {};

window.FPH.dashboard = (() => {
  let _currentTab = 'overview';
  let _role = 'tenant';

  const TABS = {
    tenant:   ['overview','tenancies','rent','maintenance','inquiries','settings'],
    landlord: ['overview','listings','tenancies','rent','maintenance','inquiries','settings'],
    admin:    ['overview','properties','users','verifications','rent','inquiries','audit','settings'],
  };

  const TAB_LABELS = {
    overview:'Overview', listings:'My Listings', tenancies:'Tenancies',
    rent:'Rent & Invoices', maintenance:'Maintenance', inquiries:'Inquiries',
    settings:'Settings', properties:'Properties', users:'Users',
    verifications:'Verifications', audit:'Audit Log',
  };

  const TAB_ICONS = {
    overview:'dashboard', listings:'building', tenancies:'list',
    rent:'receipt', maintenance:'tool', inquiries:'message-square',
    settings:'settings', properties:'building', users:'users',
    verifications:'shield', audit:'clipboard',
  };

  async function init() {
    const user = FPH.auth.getUser();
    if (!user) return;
    _role = user.role || 'tenant';
    _currentTab = FPH.settings.getDashTab();
    const tabs = TABS[_role] || TABS.tenant;
    if (!tabs.includes(_currentTab)) _currentTab = 'overview';
  }

  function goTo(tab) {
    _currentTab = tab;
    FPH.settings.setDashTab(tab);
    window.dispatchEvent(new CustomEvent('fph:tab-change', {detail:{tab}}));
  }

  function getCurrentTab() { return _currentTab; }
  function getTabs()       { return TABS[_role] || TABS.tenant; }
  function getRole()       { return _role; }
  function getTabLabel(t)  { return TAB_LABELS[t] || t; }
  function getTabIcon(t)   { return TAB_ICONS[t] || '•'; }

  // Load data for a specific tab (with cache)
  async function loadTabData(tab) {
    const { Cache } = FPH.storage;
    const cacheKey = `dash:${tab}`;
    const hit = Cache.get(cacheKey);
    if (hit) return hit;

    let data = null;
    try {
      switch(tab) {
        case 'overview':
          if (_role==='admin') {
            data = await FPH.admin.getDashboard();
          } else {
            const results = await Promise.allSettled([
              FPH.tenancies.getMine({limit:5}),
              FPH.rent.myInvoices({limit:5}),
              _role==='landlord' ? FPH.properties.getMyListings() : Promise.resolve(null),
            ]);
            data = {
              tenancies: results[0].status==='fulfilled' ? results[0].value : null,
              invoices:  results[1].status==='fulfilled' ? results[1].value : null,
              listings:  results[2].status==='fulfilled' ? results[2].value : null,
            };
          }
          break;
        case 'listings':    data = await FPH.properties.getMyListings(); break;
        case 'tenancies':   data = await FPH.tenancies.getMine(); break;
        case 'rent':        data = await FPH.rent.myInvoices(); break;
        case 'inquiries':   data = await FPH.chat.getAll(); break;
        case 'users':       data = await FPH.admin.getUsers(); break;
        case 'properties':  data = await FPH.admin.getPendingProperties(); break;
        case 'verifications': data = await FPH.admin.getPendingVerifications(); break;
        case 'audit':       data = await FPH.admin.getAuditLog(); break;
        case 'maintenance': data = await FPH.maintenance.myRequests(); break;
        case 'settings':    data = await FPH.settings.getProfile(); break;
      }
    } catch(e) {
      // In demo mode or when server is unreachable, show empty state rather than error
      const isNetworkErr = e.offline || e.status === 0 || FPH.storage.Session.isDemo;
      data = isNetworkErr ? _emptyDataForTab(tab) : {error: e.message};
    }
    if (data && !data.error) Cache.set(cacheKey, data);
    return data;
  }

  function invalidate(tab) { FPH.storage.Cache.del(`dash:${tab}`); }
  function invalidateAll() { getTabs().forEach(t => invalidate(t)); }

  function _emptyDataForTab(tab) {
    const empty = {data:{properties:[],tenancies:[],invoices:[],requests:[],inquiries:[],tickets:[],users:[],logs:[],total:0}};
    return empty;
  }

    return { init, goTo, getCurrentTab, getTabs, getRole, getTabLabel, getTabIcon, loadTabData, invalidate, invalidateAll };
})();