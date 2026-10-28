// privacy.js — behaviour unique to privacy-policy.html. Nothing here needs editing when the policy text changes.
//  1. Highlights the section you are reading in the "On this page" list (desktop sidebar).
//  2. On phones the list starts closed; tapping a link jumps there and folds the list away.
//  3. "Print or save as PDF" button opens the browser's print dialog (print styles are in privacy.css).
(function () {
  var toc = document.getElementById('ppToc');
  var printBtn = document.getElementById('ppPrint');
  var desktop = window.matchMedia('(min-width: 1024px)');

  if (printBtn) printBtn.addEventListener('click', function () { window.print(); });
  if (!toc) return;

  // Open on desktop (it is a sidebar), closed on phones (it would push the policy far down).
  function syncOpen() { toc.open = desktop.matches; }
  syncOpen();
  if (desktop.addEventListener) desktop.addEventListener('change', syncOpen);

  var links = Array.prototype.slice.call(toc.querySelectorAll('a[href^="#"]'));
  links.forEach(function (a) {
    a.addEventListener('click', function () { if (!desktop.matches) toc.open = false; });
  });

  // Scroll-spy: the section nearest the top of the screen is the active one.
  if (!('IntersectionObserver' in window)) return;
  var byId = {};
  links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
  var visible = {};

  function setActive(id) {
    links.forEach(function (a) {
      var on = a === byId[id];
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { visible[e.target.id] = e.isIntersecting; });
    for (var i = 0; i < links.length; i++) {
      var id = links[i].getAttribute('href').slice(1);
      if (visible[id]) { setActive(id); return; }
    }
  }, { rootMargin: '-20% 0px -65% 0px' });

  Object.keys(byId).forEach(function (id) {
    var sec = document.getElementById(id);
    if (sec) io.observe(sec);
  });
})();
