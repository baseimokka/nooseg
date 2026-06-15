(function () {
  'use strict';

  // Respect reduced-motion — no splash at all.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.__noosRevealed = true;
    return;
  }

  var DURATION = 1500;            // hold the full NOOS logo for 3s before reveal
  var OLIVE = '#626B4C';          // matches the logo artwork background (seamless)
  var BLUSH = '#F5E3E1';          // logo mark tone
  var base  = window.location.pathname.indexOf('/pages/') !== -1 ? '../' : '';

  var style = document.createElement('style');
  style.textContent =
    '.noos-pl{position:fixed;inset:0;z-index:99999;background:' + OLIVE + ';' +
      'display:grid;place-items:center;will-change:transform}' +
    '.noos-pl.done{transform:translateY(-100%);transition:transform .95s cubic-bezier(.76,0,.24,1)}' +
    '.noos-pl-inner{display:flex;flex-direction:column;align-items:center;gap:34px}' +
    '.noos-pl-logo{width:min(42vw,360px);height:auto;display:block;' +
      'opacity:0;transform:scale(1.05)}' +
    '.noos-pl.pl-on .noos-pl-logo{opacity:1;transform:none;' +
      'transition:opacity 1s ease,transform 1.3s cubic-bezier(.5,0,.18,1)}' +
    '.noos-pl-bar{position:relative;width:120px;height:1.5px;overflow:hidden;' +
      'background:rgba(245,227,225,.25)}' +
    '.noos-pl-bar::after{content:"";position:absolute;inset:0;background:' + BLUSH + ';' +
      'transform-origin:left;transform:scaleX(0)}' +
    '.noos-pl.pl-on .noos-pl-bar::after{transform:scaleX(1);' +
      'transition:transform ' + (DURATION - 450) + 'ms cubic-bezier(.4,0,.2,1) .45s}';
  (document.head || document.documentElement).appendChild(style);

  var pl = document.createElement('div');
  pl.className = 'noos-pl';
  pl.setAttribute('aria-hidden', 'true');
  pl.innerHTML =
    '<div class="noos-pl-inner">' +
      '<img class="noos-pl-logo" alt="NOOS" src="' + base + 'images/noos-monogram.jpg">' +
      '<div class="noos-pl-bar"></div>' +
    '</div>';
  (document.body || document.documentElement).appendChild(pl);

  requestAnimationFrame(function () {
    requestAnimationFrame(function () { pl.classList.add('pl-on'); });
  });

  setTimeout(function () {
    window.__noosRevealed = true;
    try { document.dispatchEvent(new CustomEvent('noos:revealed')); } catch (e) {}
    pl.classList.add('done');
  }, DURATION);

  pl.addEventListener('transitionend', function (e) {
    if (e.propertyName === 'transform' && pl.classList.contains('done')) {
      if (pl.parentNode) pl.parentNode.removeChild(pl);
      if (style.parentNode) style.parentNode.removeChild(style);
    }
  });
})();
