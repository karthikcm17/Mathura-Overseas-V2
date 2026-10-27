// student-guide.js — turns every <article class="sg-page"> in #sgSource into a page of a 3D page-turn book,
// sizes the book to the screen (no page scrolling), keeps ONE text size across the whole book, and runs the PDF download gate.
// This script is loaded first on the page and starts straight away (it does not wait for the shared site scripts).
(function () {
  if (!document.getElementById('sgBook') || !document.getElementById('sgModal')) document.addEventListener('DOMContentLoaded', init);
  else init();

  function init() {

  // ---- SETTINGS (edit here) ----
  var PDF = 'assets/downloads/mathura-overseas-mbbs-handbook-2026-27.pdf';
  var WHATSAPP_NUMBER = '919360859919';
  // GOOGLE SHEETS: paste your Google Apps Script web-app URL between the quotes (steps are in google-sheets-lead-script.gs).
  // Every download is then saved as a row in your sheet. While it is empty, the PDF still downloads and the
  // thank-you box offers a one-tap "send my details on WhatsApp", so no lead is lost.
  var LEAD_ENDPOINT = '';
  var STORE_KEY = 'mo_guide_unlocked';
  var QUEUE_KEY = 'mo_guide_pending';
  var RATIO = 0.72;            // page width / height on desktop spreads
  var MIN_FONT = 10.5;         // smallest text size (px) before a page is allowed to scroll inside
  var MAX_FONT = 22;           // largest text size (px)

  // TEXT SIZE TABLE — the book uses ONE text size on every page. It is worked out from the page size:
  // text size = page width x factor, where the factor depends on how tall the page is compared with its width.
  // [height / width, factor]. If you add a lot of text to a page and it no longer fits, the book shrinks the text
  // for the whole book automatically, so you never need to touch this table.
  var SIZE_TABLE = [[1.1, 0.0239], [1.3, 0.0292], [1.5, 0.034], [1.7, 0.0383], [1.9, 0.0411], [2.2, 0.0447], [2.6, 0.0447]];

  var book = document.getElementById('sgBook'), stage = document.getElementById('sgStage'), src = document.getElementById('sgSource');
  if (!book || !stage || !src) return;
  document.body.classList.add('sg-reader');

  var pages = [].slice.call(src.querySelectorAll('.sg-page')), N = pages.length;
  var label = document.getElementById('sgLabel'), ring = document.getElementById('sgRing'), numEl = document.getElementById('sgNum'), ofEl = document.getElementById('sgOf');
  var btnPrev = document.getElementById('sgPrev'), btnNext = document.getElementById('sgNext');
  var leaves = [], state = 0, spread = false, timer = null, faces = [], fitted = [], dims = '', gfs = 14, guard = 0;

  // ---------- build ----------
  function makeFace(p, side, i) {
    var f = document.createElement('div');
    f.className = 'sg-face sg-face--' + side + (p.classList.contains('sg-page--cover') ? ' sg-face--cover' : '') + (p.classList.contains('sg-page--dark') ? ' sg-face--dark' : '');
    f.appendChild(p);
    if (!p.classList.contains('sg-page--cover') && !p.classList.contains('sg-page--dark')) {
      var run = document.createElement('div'); run.className = 'sg-run';
      run.innerHTML = '<span>MBBS Abroad Handbook</span><span></span>';
      run.lastChild.textContent = (p.getAttribute('data-run') || '') + '  ·  ' + i;
      f.appendChild(run);
      var foot = document.createElement('div'); foot.className = 'sg-foot'; foot.textContent = 'mathuraoverseas.com';
      f.appendChild(foot);
    }
    faces[i] = f;
    return f;
  }

  function build(idx) {
    pages.forEach(function (p) { src.appendChild(p); });
    book.innerHTML = ''; leaves = []; faces = []; fitted = []; guard = 0;
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
    idle(fitRest);   // the other pages are checked while the browser is idle, so the first page appears fast
  }

  // ---------- sizing: the book fills the stage, nothing scrolls ----------
  function baseFont(pw, ph) {
    var r = ph / pw, t = SIZE_TABLE, g = t[t.length - 1][1];
    if (r <= t[0][0]) g = t[0][1];
    else for (var i = 1; i < t.length; i++) { if (r <= t[i][0]) { g = t[i - 1][1] + (t[i][1] - t[i - 1][1]) * (r - t[i - 1][0]) / (t[i][0] - t[i - 1][0]); break; } }
    return Math.max(MIN_FONT, Math.min(MAX_FONT, Math.floor(pw * g * 10) / 10));
  }
  function size() {
    var cs = getComputedStyle(stage), w = stage.clientWidth, h = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    var aw = w - (w < 640 ? 16 : 32), ah = h - 4;
    var wantSpread = w >= 880 && w / h >= 1.2;
    var pw, ph;
    if (wantSpread) { ph = Math.min(ah, 860); pw = Math.min(ph * RATIO, (aw - 24) / 2); ph = Math.min(ph, pw / RATIO + 40); }
    else { pw = Math.min(aw, 600); ph = ah; if (pw / ph > 0.9) pw = Math.floor(ph * 0.9); }
    pw = Math.floor(pw); ph = Math.floor(ph);
    book.style.setProperty('--pw', pw + 'px');
    book.style.setProperty('--ph', ph + 'px');
    gfs = baseFont(pw, ph);
    book.style.setProperty('--fs', gfs + 'px');
    dims = wantSpread + ':' + pw + 'x' + ph;
    return wantSpread;
  }

  // ---------- one text size for the whole book ----------
  // Every page uses the book's text size (--fs on the book). A page is only touched if its content does not fit:
  // first its optional lines (class="pg-opt") are dropped; if that is still not enough the text size of the WHOLE
  // book is lowered, so all pages stay consistent. Pages are checked on screen first, the rest while idle.
  function pgOf(p) { return p.querySelector('.pg, .pg-end'); }
  function fits(pg) { return pg.scrollHeight <= pg.clientHeight + 1; }
  // spare height on a page is shared out between its blocks (a little, never more than one line) so lighter pages
  // end near the footer line instead of leaving a gap at the bottom
  function relax(pg) {
    if (pg.classList.contains('pg-end')) return;
    var vis = [].filter.call(pg.children, function (k) { return k.offsetHeight > 0; }), n = vis.length; if (n < 2) return;
    // a heading stays attached to what follows it, so those pairs count as one block
    var joins = vis.filter(function (k, i) { return i > 0 && (vis[i - 1].tagName === 'H3' || (vis[i - 1].classList.contains('pg-head') && k.classList.contains('pg-lede'))); }).length;
    var gaps = n - 1 - joins; if (gaps < 1) return;
    var last = vis[n - 1], free = pg.clientHeight - parseFloat(getComputedStyle(pg).paddingBottom) - (last.offsetTop + last.offsetHeight);
    var add = Math.min(free / gaps, parseFloat(getComputedStyle(pg).fontSize) * 1.1);
    if (add > 1) pg.style.setProperty('--gapx', Math.floor(add) + 'px');
  }
  function checkPage(i) {
    var p = pages[i], pg = pgOf(p); if (!pg) return;
    p.style.removeProperty('--fs'); pg.classList.remove('is-scroll', 'is-tight'); pg.style.removeProperty('--gapx');
    if (fits(pg)) { relax(pg); return; }
    if (pg.querySelector('.pg-opt')) { pg.classList.add('is-tight'); if (fits(pg)) { relax(pg); return; } }
    function ok(px) { p.style.setProperty('--fs', px + 'px'); return fits(pg); }
    var lo = MIN_FONT, top = gfs;
    if (!ok(lo)) { p.style.removeProperty('--fs'); pg.classList.add('is-scroll'); return; }
    for (var n = 0; n < 7; n++) { var mid = (lo + top) / 2; if (ok(mid)) lo = mid; else top = mid; }
    ok(lo); relax(pg);
    return lo;
  }
  function idle(f) { if (window.requestIdleCallback) requestIdleCallback(f, { timeout: 900 }); else setTimeout(f, 80); }
  function ensureFit(i) {
    if (!pages[i] || fitted[i]) return;
    fitted[i] = true;
    var r = checkPage(i);
    if (typeof r === 'number' && r < gfs * 0.97 && guard < 8) {
      guard++; gfs = Math.max(MIN_FONT, Math.floor(r * 10) / 10);
      book.style.setProperty('--fs', gfs + 'px');
      fitted = []; pages.forEach(function (q) { q.style.removeProperty('--fs'); });
      fitVisible(); idle(fitRest);
    }
  }
  function fitVisible() { visible().forEach(function (i) { if (i >= 0 && i < N) ensureFit(i); }); }
  function fitRest(deadline) {
    for (var i = 0; i < N; i++) {
      if (fitted[i]) continue;
      ensureFit(i);
      if (deadline && deadline.timeRemaining && deadline.timeRemaining() < 3) { idle(fitRest); return; }
    }
  }
  function refit() { fitted = []; guard = 0; pages.forEach(function (q) { q.style.removeProperty('--fs'); }); fitVisible(); idle(fitRest); }

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

  // ---------- leads → Google Sheets ----------
  // Sent as a background POST to your Apps Script web app. If the phone is offline the lead is kept on the device
  // and sent the next time the page is open with a connection.
  function queueLead(d) { try { var q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); q.push(d); localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-20))); } catch (e) {} }
  function sendLead(d) {
    if (!LEAD_ENDPOINT) return false;
    try {
      fetch(LEAD_ENDPOINT, { method: 'POST', mode: 'no-cors', keepalive: true, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(d) })
        .catch(function () { queueLead(d); });
    } catch (e) { queueLead(d); }
    return true;
  }
  function flushLeads() {
    if (!LEAD_ENDPOINT) return;
    try { var q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); if (!q.length) return; localStorage.removeItem(QUEUE_KEY); q.forEach(sendLead); } catch (e) {}
  }
  window.addEventListener('online', flushLeads); flushLeads();

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
  function download() { openModal(); }   // every download asks for details first, so every download becomes a lead

  document.getElementById('sgForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = document.getElementById('sgName').value.trim(), city = document.getElementById('sgCity').value.trim();
    var mobile = document.getElementById('sgMobile').value.replace(/[\s\-()]/g, '').replace(/^\+?91/, '');
    if (!name || !city || !/^[6-9]\d{9}$/.test(mobile)) {
      err.textContent = !name || !city ? 'Please fill in your name and city.' : 'Please enter a valid 10-digit mobile number.';
      err.hidden = false; return;
    }
    var wa = document.getElementById('sgWaSend'), bot = document.getElementById('sgCompany').value;   // the hidden "company" box is a spam trap
    var saved = false;
    if (!bot) {
      saved = sendLead({ name: name, phone: mobile, city: city, source: 'student-guide-pdf', page: location.pathname,
        device: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop', time: new Date().toISOString() });
    }
    if (saved) { wa.hidden = true; }
    else {
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
  var main = document.getElementById('main');
  function lock() { [document.documentElement, document.body, main, stage].forEach(function (el) { if (el && el.scrollTop) el.scrollTop = 0; }); }
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
  // the web font arrives after the first fit and is wider than the fallback, so fit again whenever a font finishes loading
  var ft; function refitSoon() { clearTimeout(ft); ft = setTimeout(refit, 60); }
  if (document.fonts) { document.fonts.ready.then(refitSoon); if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', refitSoon); }
  window.addEventListener('load', refitSoon);
  // keep the reader exactly as tall as what is visible (mobile browser toolbars come and go)
  window.addEventListener('resize', setAppH); window.addEventListener('orientationchange', function () { setTimeout(setAppH, 250); });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', setAppH);

  spread = size();
  build(0);
  // deep links: student-guide.html#ch5 opens the book at that page (also when the #part of the address changes later)
  window.addEventListener('hashchange', function () { if (location.hash) goTo(location.hash.slice(1)); });
  if (location.hash) { var di = pageIndex(location.hash.slice(1)); if (di > 0) { state = spread ? Math.ceil(di / 2) : di; paint(); ui(); } }
  lock(); setTimeout(lock, 300);
  }
})();
