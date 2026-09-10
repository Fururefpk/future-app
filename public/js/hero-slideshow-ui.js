'use strict';
window.FPH = window.FPH || {};

window.FPH.heroSlideshowUI = (() => {
  // Injects nav arrows onto the slideshow container
  function addControls(containerSel='.auth-hero') {
    const c = document.querySelector(containerSel);
    if (!c) return;
    const prev = document.createElement('button');
    const next = document.createElement('button');
    const styles = `position:absolute;top:50%;transform:translateY(-50%);z-index:3;background:rgba(255,255,255,.2);
      border:none;color:white;font-size:20px;padding:8px 14px;border-radius:50%;cursor:pointer;
      transition:background .2s;backdrop-filter:blur(4px);`;
    prev.style.cssText = styles + 'left:12px;';
    next.style.cssText = styles + 'right:12px;';
    prev.textContent = '‹';
    next.textContent = '›';
    prev.onclick = () => FPH.heroSlideshow.goTo((_currentIdx()-1+FPH.heroSlideshow.SLIDES.length)%FPH.heroSlideshow.SLIDES.length);
    next.onclick = () => FPH.heroSlideshow.goTo((_currentIdx()+1)%FPH.heroSlideshow.SLIDES.length);
    c.appendChild(prev);
    c.appendChild(next);
  }

  function _currentIdx() {
    const slides = document.querySelectorAll('.auth-hero-slide');
    let idx = 0;
    slides.forEach((s,i) => { if(s.classList.contains('active')) idx=i; });
    return idx;
  }

  function setCaption(text) {
    const cap = document.querySelector('.auth-hero-caption');
    if (cap) cap.textContent = text;
  }

  return { addControls, setCaption };
})();