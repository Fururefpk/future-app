'use strict';
window.FPH = window.FPH || {};

/** hero-slideshow-ui-helpers.js */
window.FPH.HeroSlideshowUIHelpers = (() => {
  const esc = s => FPH.utils.escapeHtml(s);
  function renderEmpty(icon, text) { return '<div class="empty-state">'+esc(icon)+'<p>'+esc(text)+'</p></div>'; }
  function renderLoading(label) { return '<div style="padding:32px;text-align:center;color:#999;">'+esc(label||'Loading…')+'</div>'; }
  function renderError(msg) { return '<div style="padding:16px;color:#ef4444;">⚠ '+esc(msg)+'</div>'; }
  function renderListItem(left, right) { return '<div class="list-item">'+left+(right?'<div>'+right+'</div>':'')+'</div>'; }
  
  function renderDots(count,active){return Array.from({length:count},(_,i)=>'<span style="width:8px;height:8px;border-radius:50%;background:'+(i===active?'white':'rgba(255,255,255,.4)')+';cursor:pointer;display:inline-block;margin:0 3px;" onclick="FPH.heroSlideshow.goTo('+i+')"></span>').join('');}
  return { renderEmpty, renderLoading, renderError, renderListItem };
})();