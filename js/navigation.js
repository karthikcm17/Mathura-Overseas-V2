// navigation.js — announcement bar, menu drawer, app-style header, bottom tab bar.
document.addEventListener('DOMContentLoaded', function () {

  // ---- Announcement bar: rotate the messages (no close button — same on every page) ----
  var items = document.querySelectorAll('.announce__item');
  if (items.length > 1) {
    var i = 0;
    setInterval(function () {
      items[i].classList.remove('is-active');
      i = (i + 1) % items.length;
      items[i].classList.add('is-active');
    }, 2000);
  }

  // ---- Menu drawer (phones / tablets) ----
  // Opening moves keyboard focus into the drawer and keeps Tab inside it; closing returns focus to the menu button.
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.site-nav');
  var scrim = document.querySelector('.nav-scrim');
  var closeNavBtn = document.querySelector('.site-nav__close');
  var DESKTOP = 1024;

  function isOpen() { return nav && nav.classList.contains('is-open'); }
  function focusables() {
    return Array.prototype.filter.call(nav.querySelectorAll('a[href], button:not([disabled])'), function (el) { return el.offsetParent !== null; });
  }
  function setMenu(open) {
    if (!nav || open === isOpen()) return;
    nav.classList.toggle('is-open', open);
    if (scrim) scrim.classList.toggle('is-open', open);
    document.body.classList.toggle('nav-open', open);
    if (toggle) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }
    if (window.innerWidth < DESKTOP) {
      nav.setAttribute('role', open ? 'dialog' : 'navigation');
      if (open) nav.setAttribute('aria-modal', 'true'); else nav.removeAttribute('aria-modal');
    }
    if (open) {
      nav.scrollTop = 0;
      setTimeout(function () { if (closeNavBtn) closeNavBtn.focus({ preventScroll: true }); }, 60);
    } else if (toggle && window.innerWidth < DESKTOP) {
      toggle.focus({ preventScroll: true });
    }
  }

  if (toggle && nav) {
    toggle.addEventListener('click', function () { setMenu(!isOpen()); });
    if (scrim) scrim.addEventListener('click', function () { setMenu(false); });
    if (closeNavBtn) closeNavBtn.addEventListener('click', function () { setMenu(false); });
    nav.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) {
      if (!isOpen()) return;
      if (e.key === 'Escape') { setMenu(false); return; }
      if (e.key === 'Tab') {   // keep focus inside the drawer
        var f = focusables(); if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    window.addEventListener('resize', function () { if (window.innerWidth >= DESKTOP) setMenu(false); });

    // Swipe the drawer to the right to close it (phones)
    var startX = null, startY = null;
    nav.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; startY = e.touches[0].clientY; }, { passive: true });
    nav.addEventListener('touchend', function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX, dy = Math.abs(e.changedTouches[0].clientY - startY);
      if (dx > 70 && dx > dy * 1.5) setMenu(false);
      startX = null;
    }, { passive: true });
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
    if (window.innerWidth < DESKTOP && !document.body.classList.contains('nav-open') && !document.body.classList.contains('sheet-open')) {
      var nearBottom = window.innerHeight + y >= document.documentElement.scrollHeight - 80;
      if (nearBottom || y < 60 || y < lastY - 6) setBars(false);
      else if (y > 120 && y > lastY + 6) setBars(true);
    }
    lastY = y;
  }, { passive: true });

  // ---- Bottom tab bar, 6th tab: WhatsApp and Ask AI take turns ----
  // Markup: _includes/bottom-nav.html (#navSwap). Timing: data-every="4" there (seconds).
  // It holds still whenever swapping would get in the way: the chat, the menu or a bottom sheet is open,
  // the tab bar is tucked away, the browser tab isn't being looked at, or the tab has keyboard focus.
  var swap = document.getElementById('navSwap');
  if (swap) {
    var faces = swap.querySelectorAll('.bottom-nav__face');
    var every = (parseFloat(swap.getAttribute('data-every')) || 4) * 1000;
    var on = 0;

    // Keyboard focus only (:focus-visible). A finger tap also leaves focus on the button, and that must
    // not freeze the swap after the visitor comes back from the chat or WhatsApp.
    function keyboardOnIt() {
      try { return !!swap.querySelector(':focus-visible'); } catch (e) { return false; }
    }
    function paused() {
      var b = document.body.classList;
      return keyboardOnIt() || document.hidden || window.innerWidth >= DESKTOP ||
        b.contains('ask-open') || b.contains('nav-open') || b.contains('sheet-open') ||
        (bottomNav && bottomNav.classList.contains('is-hidden'));
    }
    function turn() {
      if (faces.length < 2 || paused()) return;
      var out = faces[on];
      on = (on + 1) % faces.length;
      var next = faces[on];
      out.classList.remove('is-on');
      out.classList.add('is-out');                 // leaves upward
      next.classList.add('is-snap');               // jump back below, unseen…
      next.classList.remove('is-out');
      void next.offsetWidth;                       // …let the browser register that position…
      next.classList.remove('is-snap');
      next.classList.add('is-on');                 // …then rise into place
    }
    setInterval(turn, every);
  }
});
