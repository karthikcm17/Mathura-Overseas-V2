// student-guide.js — builds the page-turn book from the <article class="sg-page"> blocks and handles the PDF download gate.
document.addEventListener('DOMContentLoaded', function () {

  // ---- SETTINGS (edit here) ----
  var PDF = 'assets/downloads/mathura-overseas-mbbs-handbook-2026-27.pdf';
  // Paste your Google Apps Script web-app URL here (same one the apply form / home tool uses) to save leads to your sheet.
  // While empty, the PDF still downloads but the details are NOT saved anywhere.
  var LEAD_ENDPOINT = '';
  var STORE_KEY = 'mo_guide_unlocked';

  var book = document.getElementById('sgBook'), src = document.getElementById('sgSource');
  if (!book || !src) return;
  var pages = [].slice.call(src.querySelectorAll('.sg-page')), N = pages.length;
  var mq = window.matchMedia('(min-width: 900px)');
  var label = document.getElementById('sgLabel'), bar = document.getElementById('sgBar');
  var leaves = [], state = 0, spread = mq.matches, timer;

  function face(p, side, i) {
    var f = document.createElement('div');
    f.className = 'sg-face sg-face--' + side + (i === 0 ? ' sg-face--cover' : '');
    f.appendChild(p);
    if (i > 0) { var s = document.createElement('span'); s.className = 'sg-folio'; s.textContent = i; f.appendChild(s); }
    return f;
  }
  function board(side) { var b = document.createElement('div'); b.className = 'sg-board sg-board--' + side; return b; }
  function maxState() { return spread ? leaves.length : N - 1; }
  function clamp(v) { return Math.max(0, Math.min(maxState(), v)); }

  function build(idx) {
    pages.forEach(function (p) { src.appendChild(p); });
    book.innerHTML = ''; leaves = []; spread = mq.matches;
    if (spread) { book.appendChild(board('left')); book.appendChild(board('right')); }
    var step = spread ? 2 : 1, count = Math.ceil(N / step);
    state = Math.min(spread ? Math.ceil(idx / 2) : idx, spread ? count : N - 1);
    for (var i = 0, k = 0; i < N; i += step, k++) {
      var leaf = document.createElement('div');
      leaf.className = 'sg-leaf' + (i === 0 ? ' sg-leaf--cover' : '') + (k < state ? ' is-flipped' : '');
      leaf.appendChild(face(pages[i], 'right', i));
      if (spread && pages[i + 1]) { var b = face(pages[i + 1], 'left', i + 1); b.classList.add('sg-face--back'); leaf.appendChild(b); }
      book.appendChild(leaf); leaves.push(leaf);
    }
    paint(); ui();
  }

  function paint() {
    leaves.forEach(function (leaf, i) {
      var flipped = i < state;
      leaf.classList.toggle('is-flipped', flipped);
      if (!leaf.classList.contains('is-turning')) leaf.style.zIndex = flipped ? 100 + i : leaves.length - i + 1;
    });
    book.classList.toggle('is-open', state > 0);
    book.classList.toggle('is-end', spread && state === leaves.length);
  }
  function turn(leaf) {
    leaf.classList.add('is-turning'); leaf.style.zIndex = 500;
    setTimeout(function () { leaf.classList.remove('is-turning'); paint(); }, 1000);
  }
  function ui() {
    var vis = spread ? [state > 0 ? 2 * state - 1 : -1, state < leaves.length ? 2 * state : -1] : [state];
    pages.forEach(function (p, i) { p.parentNode.inert = vis.indexOf(i) < 0; });
    var right = spread ? (state < leaves.length ? 2 * state : N - 1) : state;
    var left = spread && state > 0 ? 2 * state - 1 : right;
    var cur = spread && state > 0 && state < leaves.length ? left + '–' + right : right;
    label.textContent = right === 0 ? 'Cover' : pages[right].getAttribute('data-title') + ' · p. ' + cur;
    bar.style.transform = 'scaleX(' + (right / (N - 1)) + ')';
  }
  function go(t) {
    t = clamp(t); clearTimeout(timer);
    (function step() {
      if (state === t) { ui(); return; }
      var d = t > state ? 1 : -1;
      turn(leaves[d > 0 ? state : state - 1]);
      state += d; paint(); ui();
      if (state !== t) timer = setTimeout(step, 130);
    })();
  }
  function pageIndex(id) { for (var i = 0; i < N; i++) if (pages[i].id === id) return i; return -1; }
  function goTo(id) {
    var i = pageIndex(id); if (i < 0) return;
    go(spread ? Math.ceil(i / 2) : i);
    book.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ---- Download gate ----
  var modal = document.getElementById('sgModal'), formView = document.getElementById('sgFormView'),
      doneView = document.getElementById('sgDoneView'), err = document.getElementById('sgError');
  function startDownload() { var a = document.createElement('a'); a.href = PDF; a.download = ''; document.body.appendChild(a); a.click(); a.remove(); }
  function unlocked() { try { return localStorage.getItem(STORE_KEY) === '1'; } catch (e) { return false; } }
  function openModal() {
    formView.hidden = false; doneView.hidden = true; err.hidden = true; modal.hidden = false;
    document.body.classList.add('sg-lock'); document.getElementById('sgName').focus();
  }
  function closeModal() { modal.hidden = true; document.body.classList.remove('sg-lock'); }
  function download() { if (unlocked()) startDownload(); else openModal(); }

  document.getElementById('sgForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = document.getElementById('sgName').value.trim(), city = document.getElementById('sgCity').value.trim();
    var mobile = document.getElementById('sgMobile').value.replace(/[\s\-()]/g, '').replace(/^\+?91/, '');
    if (!name || !city || !/^[6-9]\d{9}$/.test(mobile)) {
      err.textContent = !name || !city ? 'Please fill in your name and city.' : 'Please enter a valid 10-digit mobile number.';
      err.hidden = false; return;
    }
    if (LEAD_ENDPOINT) {
      fetch(LEAD_ENDPOINT, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ name: name, phone: mobile, city: city, source: 'student-guide-pdf', page: location.pathname, time: new Date().toISOString() }) }).catch(function () {});
    }
    try { localStorage.setItem(STORE_KEY, '1'); } catch (x) {}
    startDownload(); formView.hidden = true; doneView.hidden = false;
  });

  // ---- Events ----
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-sg],[data-goto]');
    if (t && t.dataset.goto) { e.preventDefault(); goTo(t.dataset.goto); return; }
    if (t) {
      var a = t.dataset.sg;
      if (a === 'next') go(state + 1);
      else if (a === 'prev') go(state - 1);
      else if (a === 'open') { go(state === 0 ? 1 : state); book.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
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
    if (e.key === 'ArrowRight') go(state + 1);
    if (e.key === 'ArrowLeft') go(state - 1);
  });
  var sx = 0, sy = 0;
  book.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  book.addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) go(state + (dx < 0 ? 1 : -1));
  }, { passive: true });
  var onMode = function () { build(spread ? Math.min(2 * state, N - 1) : state); };
  if (mq.addEventListener) mq.addEventListener('change', onMode); else mq.addListener(onMode);

  build(0);
});
