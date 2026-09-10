'use strict';
window.FPH = window.FPH || {};

window.FPH.heroSlideshow = (() => {
  let _idx = 0;
  let _timer = null;
  let _paused = false;
  let _slides = [];
  let _dots = [];

  const SLIDES = [
    {bg:'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=1200', caption:'Find verified rentals across Ghana'},
    {bg:'https://images.unsplash.com/photo-1568605114967-8130f3a36994?q=80&w=1200', caption:'Trusted by landlords and tenants'},
    {bg:'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1200', caption:'Secure identity verification built in'},
  ];

  function init(containerSel='.auth-hero', intervalMs=5000) {
    const container = document.querySelector(containerSel);
    if (!container) return;

    // Build slides
    container.innerHTML = '';
    SLIDES.forEach((s,i) => {
      const div = document.createElement('div');
      div.className = 'auth-hero-slide' + (i===0?' active':'');
      div.style.backgroundImage = `url('${s.bg}')`;
      div.style.cssText += ';position:absolute;inset:0;background-size:cover;background-position:center;opacity:0;transition:opacity 1.2s ease-in-out;';
      if(i===0) div.style.opacity='1';
      container.appendChild(div);
    });

    const caption = document.createElement('div');
    caption.className = 'auth-hero-caption';
    caption.textContent = SLIDES[0].caption;
    container.appendChild(caption);

    const dotsEl = document.createElement('div');
    dotsEl.className = 'auth-hero-dots';
    SLIDES.forEach((_,i) => {
      const s = document.createElement('span');
      if(i===0) s.classList.add('active');
      s.onclick = () => goTo(i);
      dotsEl.appendChild(s);
    });
    container.appendChild(dotsEl);

    _slides = [...container.querySelectorAll('.auth-hero-slide')];
    _dots   = [...dotsEl.querySelectorAll('span')];

    container.addEventListener('mouseenter', () => { _paused=true; });
    container.addEventListener('mouseleave', () => { _paused=false; });

    _timer = setInterval(() => { if(!_paused) goTo((_idx+1)%SLIDES.length); }, intervalMs);
  }

  function goTo(i) {
    _slides[_idx]?.classList.remove('active');
    _slides[_idx] && (_slides[_idx].style.opacity='0');
    _dots[_idx]?.classList.remove('active');
    _idx = i;
    _slides[_idx]?.classList.add('active');
    _slides[_idx] && (_slides[_idx].style.opacity='1');
    _dots[_idx]?.classList.add('active');
    const cap = document.querySelector('.auth-hero-caption');
    if (cap) cap.textContent = SLIDES[_idx]?.caption || '';
  }

  function destroy() { if(_timer){clearInterval(_timer);_timer=null;} }

  return { init, goTo, destroy, SLIDES };
})();