// student-guide.js — turns every <article class="sg-page"> in #sgSource into a page of a 3D page-turn book,
// sizes the book to the screen (no page scrolling), fits each page's text to its page, and runs the PDF download gate.
document.addEventListener('DOMContentLoaded', function () {

  // ---- SETTINGS (edit here) ----
  var PDF = 'assets/downloads/mathura-overseas-mbbs-handbook-2026-27.pdf';
  var WHATSAPP_NUMBER = '919360859919';
  // Same idea as tools.js: paste your Google Apps Script web-app URL to save downloads as leads in your sheet.
  // While it is empty, the PDF still downloads and the thank-you box offers a one-tap "send my details on WhatsApp".
  var LEAD_ENDPOINT = '';
  var STORE_KEY = 'mo_guide_unlocked';
  var RATIO = 0.72;            // page width / height on desktop spreads
  var MIN_FONT = 10.5;         // smallest text size (px) a page may shrink to before it is allowed to scroll inside

  var book = document.getElementById('sgBook'), stage = document.getElementById('sgStage'), src = document.getElementById('sgSource');
  if (!book || !stage || !src) return;
  document.body.classList.add('sg-reader');

  var pages = [].slice.call(src.querySelectorAll('.sg-page')), N = pages.length;
  var label = document.getElementById('sgLabel'), ring = document.getElementById('sgRing'), numEl = document.getElementById('sgNum'), ofEl = document.getElementById('sgOf');
  var btnPrev = document.getElementById('sgPrev'), btnNext = document.getElementById('sgNext');
  var leaves = [], state = 0, spread = false, timer = null, faces = [], fitted = [], dims = '';

  // ---------- build ----------
  function makeFace(p, side, i) {
    var f = document.createElement('div');
    f.className = 'sg-face sg-face--' + side + (p.classList.contains('sg-page--cover') ? ' sg-face--cover' : '') + (p.classList.contains('sg-page--dark') ? ' sg-face--dark' : '');
    f.appendChild(p);
    if (!p.classList.contains('sg-page--cover') && !p.classList.contains('sg-page--dark')) {
      var run = document.createElement('div'); run.className = 'sg-run';
      run.innerHTML = '<span>MBBS Abroad Handbook</span><span></span>';
      run.lastChild.textContent = (p.getAttribute('data-run') || '') + '  \u00B7  ' + i;
      f.appendChild(run);
    }
    faces[i] = f;
    return f;
  }

  function build(idx) {
    pages.forEach(function (p) { src.appendChild(p); });
    book.innerHTML = ''; leaves = []; faces = []; fitted = [];
    book.classList.toggle('is-spread', spread);
    if (spread) { ['left', 'right'].forEach(function (s) { var b = document.createElement('div'); b.className = 'sg-board sg-board--' + s; book.appendChild(b); }); }
    var step = spread ? 2 : 1;
    state = spread ? Math.min(Math.ceil(idx / 2), Math.ceil(N / 2)) : Math.min(idx, N - 1);
    for (var i = 0, k = 0; i < N; i += step, k++) {
      var leaf = document.createElement('div');
      leaf.className = 'sg-leaf' + (i === 0 ? ' sg-leaf--cover' : '');
      leaf.appendChild(makeFace(pages[i], 'right', i));
      if (spread && pages[i + 1]) leaf.appendChild(makeFace(pages[i + 1], 'left', i + 1));
      book.appendChild(leaf); leaves.push(leaf);
    }
    paint(); ui();
    idle(fitRest);   // the other pages are sized while the browser is idle, so the first page appears fast
  }

  // ---------- sizing: the book fills the stage, nothing scrolls ----------
  function size() {
    var cs = getComputedStyle(stage), w = stage.clientWidth, h = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    var aw = w - (w < 640 ? 16 : 32), ah = h - 4;
    var wantSpread = w >= 880 && w / h >= 1.2;
    var pw, ph;
    if (wantSpread) { ph = Math.min(ah, 860); pw = Math.min(ph * RATIO, (aw - 24) / 2); ph = Math.min(ph, pw / RATIO + 40); }
    else { pw = Math.min(aw, 600); ph = ah; if (pw / ph > 0.9) pw = Math.floor(ph * 0.9); }
    book.style.setProperty('--pw', Math.floor(pw) + 'px');
    book.style.setProperty('--ph', Math.floor(ph) + 'px');
    dims = wantSpread + ':' + Math.floor(pw) + 'x' + Math.floor(ph);
    return wantSpread;
  }

  // ---------- fit each page's text to its page ----------
  function fit(p) {
    var pg = p.querySelector('.pg, .pg-end'); if (!pg) return;
    var w = p.clientWidth; if (!w) return;
    var hi = Math.max(13, Math.min(22, w / 21));
    function ok(px) { p.style.setProperty('--fs', px + 'px'); return pg.scrollHeight <= pg.clientHeight + 1; }
    // largest font size (between MIN_FONT and hi) at which the whole page content fits; null if even the smallest does not
    function solve() {
      if (ok(hi)) return hi;
      var lo = MIN_FONT; if (!ok(lo)) return null;
      var top = hi;
      for (var n = 0; n < 7; n++) { var mid = (lo + top) / 2; if (ok(mid)) lo = mid; else top = mid; }
      return lo;
    }
    pg.classList.remove('is-scroll', 'is-tight');
    var fs = solve();
    // still too small to read comfortably: drop the optional lines (anything marked class="pg-opt") and try again
    if ((fs === null || fs < 13) && pg.querySelector('.pg-opt')) { pg.classList.add('is-tight'); fs = solve(); }
    if (fs === null) { ok(MIN_FONT); pg.classList.add('is-scroll'); } else ok(fs);
  }
  function idle(f) { if (window.requestIdleCallback) requestIdleCallback(f, { timeout: 900 }); else setTimeout(f, 80); }
  // size a page's text only when it is needed (on screen), the rest later while idle
  function ensureFit(i) { if (pages[i] && !fitted[i]) { fit(pages[i]); fitted[i] = true; } }
  function fitVisible() { visible().forEach(function (i) { if (i >= 0 && i < N) ensureFit(i); }); }
  function fitRest(deadline) {
    for (var i = 0; i < N; i++) {
      if (fitted[i]) continue;
      ensureFit(i);
      if (deadline && deadline.timeRemaining && deadline.timeRemaining() < 3) { idle(fitRest); return; }
    }
  }
  function refit() { fitted = []; fitVisible(); idle(fitRest); }

  // ---------- turning ----------
  function maxState() { return spread ? leaves.length : N - 1; }
  function clamp(v) { return Math.max(0, Math.min(maxState(), v)); }
  function paint() {
    leaves.forEach(function (leaf, i) {
      var flipped = i < state;
      leaf.classList.toggle('is-flipped', flipped);
      leaf.classList.toggle('is-far', Math.abs(i - state) > 2);   // pages far from the reader are not rendered at all
      if (!leaf.classList.contains('is-turning')) leaf.style.zIndex = flipped ? 100 + i : leaves.length - i + 1;
    });
    book.classList.toggle('is-open', state > 0);
    book.classList.toggle('is-end', spread && state === leaves.length);
  }
  function turn(leaf) {
    leaf.classList.add('is-turning'); leaf.style.zIndex = 500;
    setTimeout(function () { leaf.classList.remove('is-turning'); paint(); }, 900);
  }
  function visible() {
    if (!spread) return [state];
    return [state > 0 ? 2 * state - 1 : -1, state < leaves.length ? 2 * state : -1];
  }
  function ui() {
    var vis = visible();
    faces.forEach(function (f, i) { if (f) f.inert = vis.indexOf(i) < 0; });
    var right = spread ? (state < leaves.length ? 2 * state : N - 1) : state;
    var left = spread && state > 0 ? 2 * state - 1 : right;
    var cur = spread && state > 0 && state < leaves.length ? left + '–' + right : right;
    label.textContent = right === 0 ? 'MBBS Abroad Handbook' : (pages[right].getAttribute('data-title') || '');
    numEl.textContent = right === 0 ? 'Cover' : cur; numEl.toggleAttribute('data-long', right === 0 || String(cur).length > 2);
    ofEl.textContent = right === 0 ? '' : 'of ' + (N - 1);
    ring.style.strokeDashoffset = 100 - (right / (N - 1)) * 100;
    btnPrev.disabled = state === 0; btnNext.disabled = state === maxState();
    btnNext.classList.toggle('is-hint', right === 0);
    fitVisible();
  }
  function go(t) {
    t = clamp(t); clearTimeout(timer);
    (function step() {
      if (state === t) { ui(); return; }
      var d = t > state ? 1 : -1;
      turn(leaves[d > 0 ? state : state - 1]);
      state += d; paint(); ui();
      if (state !== t) timer = setTimeout(step, 140);
    })();
  }
  function pageIndex(id) { for (var i = 0; i < N; i++) if (pages[i].id === id) return i; return -1; }
  function goTo(id) { var i = pageIndex(id); if (i >= 0) go(spread ? Math.ceil(i / 2) : i); }
  function current() { return spread ? Math.min(2 * state, N - 1) : state; }

  // ---------- download gate ----------
  var modal = document.getElementById('sgModal'), formView = document.getElementById('sgFormView'),
      doneView = document.getElementById('sgDoneView'), err = document.getElementById('sgError'), lastFocus = null;
  function startDownload() { var a = document.createElement('a'); a.href = PDF; a.download = ''; document.body.appendChild(a); a.click(); a.remove(); }
  function unlocked() { try { return localStorage.getItem(STORE_KEY) === '1'; } catch (e) { return false; } }
  function openModal() {
    lastFocus = document.activeElement; formView.hidden = false; doneView.hidden = true; err.hidden = true; modal.hidden = false;
    setTimeout(function () { document.getElementById('sgName').focus(); }, 30);
  }
  function closeModal() { modal.hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  function download() { if (unlocked()) startDownload(); else openModal(); }

  document.getElementById('sgForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = document.getElementById('sgName').value.trim(), city = document.getElementById('sgCity').value.trim();
    var mobile = document.getElementById('sgMobile').value.replace(/[\s\-()]/g, '').replace(/^\+?91/, '');
    if (!name || !city || !/^[6-9]\d{9}$/.test(mobile)) {
      err.textContent = !name || !city ? 'Please fill in your name and city.' : 'Please enter a valid 10-digit mobile number.';
      err.hidden = false; return;
    }
    var wa = document.getElementById('sgWaSend');
    if (LEAD_ENDPOINT) {
      fetch(LEAD_ENDPOINT, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ name: name, phone: mobile, city: city, source: 'student-guide-pdf', page: location.pathname, time: new Date().toISOString() }) }).catch(function () {});
      wa.hidden = true;
    } else {
      wa.href = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent('Hi Mathura Overseas, I downloaded the MBBS Abroad Handbook. My name is ' + name + ' from ' + city + '. Please call me on ' + mobile + '.');
      wa.hidden = false;
    }
    try { localStorage.setItem(STORE_KEY, '1'); } catch (x) {}
    startDownload(); formView.hidden = true; doneView.hidden = false;
  });

  // ---------- pre-admission checklist counter ----------
  var ticks = [].slice.call(document.querySelectorAll('.pg-tick input')), tickOut = document.getElementById('sgTickCount');
  function countTicks() { if (tickOut) tickOut.textContent = ticks.filter(function (t) { return t.checked; }).length; }
  ticks.forEach(function (t) { t.addEventListener('change', countTicks); });

  // ---------- events ----------
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-sg],[data-goto]');
    if (t && t.dataset.goto) { e.preventDefault(); goTo(t.dataset.goto); return; }
    if (t) {
      var a = t.dataset.sg;
      if (a === 'next') go(state + 1);
      else if (a === 'prev') go(state - 1);
      else if (a === 'download') download();
      else if (a === 'close') closeModal();
      return;
    }
    if (e.target === modal) closeModal();
    if (state === 0 && e.target.closest('.sg-face--cover')) go(1);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.hidden) { closeModal(); return; }
    if (!modal.hidden || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') go(state + 1);
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(state - 1);
    if (e.key === 'Home') go(0);
  });
  var sx = 0, sy = 0;
  stage.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  stage.addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) go(state + (dx < 0 ? 1 : -1));
  }, { passive: true });

  // the reader never scrolls: if a deep link (#ch3) or focus makes the browser scroll the locked page, snap it back
  function lock() { [document.documentElement, document.body, main, stage].forEach(function (el) { if (el && el.scrollTop) el.scrollTop = 0; }); }
  var main = document.getElementById('main');
  [main, stage, document.body].forEach(function (el) { if (el) el.addEventListener('scroll', lock); });
  window.addEventListener('scroll', lock);

  // re-size when the window changes (rotation, resizing); keep the reader on the same page
  var rt = null;
  function relayout() {
    var idx = current(), was = spread, before = dims;
    spread = size();
    if (spread !== was) build(idx); else if (dims !== before) refit();
  }
  if ('ResizeObserver' in window) new ResizeObserver(function () { clearTimeout(rt); rt = setTimeout(relayout, 120); }).observe(stage);
  else window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(relayout, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refit);
  // keep the reader exactly as tall as what is visible (mobile browser toolbars come and go)
  window.addEventListener('resize', setAppH); window.addEventListener('orientationchange', function () { setTimeout(setAppH, 250); });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', setAppH);

  spread = size();
  build(0);
  // deep links: student-guide.html#ch5 opens the book at that page (also when the #part of the address changes later)
  window.addEventListener('hashchange', function () { if (location.hash) goTo(location.hash.slice(1)); });
  // initial deep link
  if (location.hash) { var di = pageIndex(location.hash.slice(1)); if (di > 0) { state = spread ? Math.ceil(di / 2) : di; paint(); ui(); } }
  lock(); setTimeout(lock, 300);
});
