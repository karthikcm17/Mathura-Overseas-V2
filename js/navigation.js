// navigation.js — announcement bar, slide-in menu, app-style header.
document.addEventListener('DOMContentLoaded', function () {

  // ---- Announcement bar: rotate the messages (no close button — same on every page) ----
  var items = document.querySelectorAll('.announce__item');
  if (items.length > 1) {
    var i = 0;
    setInterval(function () {
      items[i].classList.remove('is-active');
      i = (i + 1) % items.length;
      items[i].classList.add('is-active');
    }, 4500);
  }

  // ---- Slide-in menu (mobile / tablet) ----
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.site-nav');
  var scrim = document.querySelector('.nav-scrim');
  var closeNavBtn = document.querySelector('.site-nav__close');
  function setMenu(open) {
    if (!nav) return;
    nav.classList.toggle('is-open', open);
    if (scrim) scrim.classList.toggle('is-open', open);
    document.body.classList.toggle('nav-open', open);
    if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  if (toggle && nav) {
    toggle.addEventListener('click', function () { setMenu(true); });
    if (scrim) scrim.addEventListener('click', function () { setMenu(false); });
    if (closeNavBtn) closeNavBtn.addEventListener('click', function () { setMenu(false); });
    nav.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
    window.addEventListener('resize', function () { if (window.innerWidth >= 1024) setMenu(false); });
  }

  // ---- App-style bars (mobile): top bar AND bottom tab bar slide away when scrolling down, return when scrolling up ----
  var header = document.querySelector('.app-header');
  var bottomNav = document.querySelector('.bottom-nav');
  var lastY = window.scrollY;
  function setBars(hidden) {
    if (header) header.classList.toggle('is-hidden', hidden);
    if (bottomNav) bottomNav.classList.toggle('is-hidden', hidden);
  }
  window.addEventListener('scroll', function () {
    var y = window.scrollY;
    if (window.innerWidth < 1024 && !document.body.classList.contains('nav-open')) {
      var nearBottom = window.innerHeight + y >= document.documentElement.scrollHeight - 80;
      if (nearBottom || y < 60 || y < lastY - 6) setBars(false);
      else if (y > 120 && y > lastY + 6) setBars(true);
    }
    lastY = y;
  }, { passive: true });
});
