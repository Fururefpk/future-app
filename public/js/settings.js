'use strict';
window.FPH = window.FPH || {};

window.FPH.settings = (() => {
  const { api, storage:{Session,Prefs} } = FPH;

  async function getProfile() {
    if (Session.isDemo) return {success:true,data:{user:Session.user}};
    return api.get('/users/profile/me');
  }

  async function updateProfile(payload) {
    if (Session.isDemo) {
      const user = {...Session.user,...payload};
      Session.patch({user}); return {success:true,data:{user}};
    }
    const d = await api.put('/users/profile', payload);
    if (d.data?.user) Session.patch({user: d.data.user});
    return d;
  }

  async function updateAvatar(file) {
    const fd = new FormData(); fd.append('avatar', file);
    const d = await api.upload('PUT','/users/avatar', fd);
    if (d.data?.user) Session.patch({user: d.data.user});
    return d;
  }

  async function changePassword(currentPassword, newPassword) {
    return api.put('/users/password',{currentPassword,newPassword});
  }

  async function updateNotifications(prefs) {
    return api.put('/users/notifications', prefs);
  }

  async function deleteAccount(password) {
    return api.del('/users/account',{body:{password}});
  }

  async function setup2FA()    { return api.post('/users/2fa/setup',{}); }
  async function verify2FA(code){ return api.post('/users/2fa/verify',{code}); }
  async function disable2FA()  { return api.del('/users/2fa'); }

  // Local preferences (theme, etc.)
  function getTheme() { return Prefs.getKey('theme','light'); }
  function setTheme(t) {
    Prefs.set('theme',t);
    document.documentElement.setAttribute('data-theme',t);
  }
  function getDashTab() { return Prefs.getKey('dashTab','overview'); }
  function setDashTab(t){ Prefs.set('dashTab',t); }

  return {
    getProfile, updateProfile, updateAvatar, changePassword,
    updateNotifications, deleteAccount, setup2FA, verify2FA, disable2FA,
    getTheme, setTheme, getDashTab, setDashTab,
  };
})();