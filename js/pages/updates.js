// updates.js — behaviour unique to neet-2026-updates.html.
// ADD AN UPDATE: edit assets/data/latest-updates.json (newest first, date as "DD Mon YYYY", "cycle": "2026").
// UPDATE THE TRACKER: edit assets/data/counselling-tracker.json (each round: start date, last date of reporting; null = date awaited).
// Allowed cats: ug, pg, mds, exam, counselling, mcc, state, tn, abroad
document.addEventListener('DOMContentLoaded', function () {
  var DATA_URL = 'assets/data/latest-updates.json';
  var TRACKER_URL = 'assets/data/counselling-tracker.json';
  var PAGE_SIZE = 5;       // updates shown first, and added by each "View more"
  var NEW_DAYS = 7;        // an update younger than this gets a "New" tag
  var WA = 'https://wa.me/919360859919?text=';

  // Filter groups. [cat, label]. Desktop shows them as headed lists with counts; phones show one swipe row.
  // A filter hides itself when the chosen year has no updates for it. Edit this list to add or rename filters.
  var GROUPS = [
    { title: 'Exam', chips: [['all', 'All updates'], ['ug', 'NEET UG'], ['pg', 'NEET PG'], ['mds', 'PG-MDS']] },
    { title: 'Type', chips: [['exam', 'NEET exam'], ['counselling', 'Counselling']] },
    { title: 'Counselling level', chips: [['mcc', 'MCC (All India)'], ['state', 'State counselling'], ['tn', 'Tamil Nadu']] }
  ];

  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var MONTH_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var $ = function (id) { return document.getElementById(id); };
  var listEl = $('updList'), statusEl = $('updStatus'), emptyEl = $('updEmpty'), moreWrap = $('updMoreWrap'), moreBtn = $('updMore');
  var groupsEl = $('updGroups'), yearsEl = $('updYears'), searchEl = $('updSearch'), resetBtn = $('updEmptyReset');
  var items = [], cycles = [], tracker = null;
  var state = { cycle: '', filter: 'all', q: '', shown: PAGE_SIZE, lastKey: '' };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function icon(name) { return '<svg class="icon" aria-hidden="true"><use href="#i-' + name + '"></use></svg>'; }
  function parseDate(str) {
    var p = String(str).trim().split(/\s+/), m = MONTHS.indexOf(p[1]);
    var d = parseInt(p[0], 10), y = parseInt(p[2], 10);
    return { d: d, m: m, y: y, t: new Date(y, m, d).getTime() };
  }
  function today() { var n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime(); }
  function has(it, cat) { return (it.cats || []).indexOf(cat) !== -1; }
  function inYear() { return items.filter(function (it) { return it._cycle === state.cycle; }); }

  // ---- What is in the current view ----
  function pool() {
    var q = state.q.toLowerCase();
    return inYear().filter(function (it) {
      if (state.filter !== 'all' && !has(it, state.filter)) return false;
      return !q || (it.title + ' ' + it.summary + ' ' + (it.points || []).join(' ')).toLowerCase().indexOf(q) !== -1;
    });
  }

  // ---- Card parts ----
  function labels(it) {
    var a = has(it, 'mds') ? 'PG-MDS' : has(it, 'pg') ? 'NEET PG' : has(it, 'ug') ? 'NEET UG' : '';
    var b = has(it, 'mcc') ? 'MCC · All India' : has(it, 'tn') ? 'Tamil Nadu' : has(it, 'state') ? 'State' : has(it, 'exam') ? 'Exam' : has(it, 'abroad') ? 'Study abroad' : '';
    return { a: a, b: b };
  }
  function badge(it) {   // colour = exam level, icon = type of news
    var col = has(it, 'mds') ? 'teal' : has(it, 'pg') ? 'purple' : has(it, 'ug') ? 'blue' : has(it, 'abroad') ? 'orange' : 'navy';
    var ic = has(it, 'counselling') ? 'users' : has(it, 'exam') ? 'file' : has(it, 'abroad') ? 'globe' : 'news';
    return '<span class="icon-badge icon-badge--sm icon-badge--' + col + '">' + icon(ic) + '</span>';
  }
  function monthKey(d) { return d.y + '-' + d.m; }

  function card(it) {
    var d = parseDate(it.date), l = labels(it), pills = '';
    var isNew = (today() - d.t) / 86400000 <= NEW_DAYS && d.t <= today();
    if (isNew) pills += '<span class="upd-tag upd-tag--new">New</span>';
    if (l.a) pills += '<span class="upd-tag upd-tag--exam">' + l.a + '</span>';
    if (l.b) pills += '<span class="upd-tag">' + l.b + '</span>';
    var pts = (it.points || []).map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('');
    var ext = it.source && /^https?:/.test(it.source);
    var src = it.source ? '<a class="upd-card__source" href="' + esc(it.source) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + (ext ? 'Official source' : 'Read more') + ' ' + icon('arrow-right') + '</a>' : '';
    var ask = '<a class="upd-card__ask" href="' + WA + encodeURIComponent('Hi, I have a question about: ' + it.title) + '" target="_blank" rel="noopener">' + icon('whatsapp') + 'Ask a counsellor</a>';
    var via = it.via ? '<p class="upd-card__via">Reported by ' + esc(it.via) + '</p>' : '';
    return '<article class="card upd-card' + (it.important ? ' is-important' : '') + '" id="u-' + esc(it.id) + '" tabindex="-1">' +
      '<div class="upd-card__top">' + badge(it) + '<div class="upd-card__meta"><time class="upd-card__when" datetime="' + d.y + '-' + ('0' + (d.m + 1)).slice(-2) + '-' + ('0' + d.d).slice(-2) + '">' + d.d + ' ' + MONTHS[d.m] + ' ' + d.y + '</time>' + pills + '</div></div>' +
      '<h3>' + esc(it.title) + '</h3><p class="upd-card__summary">' + esc(it.summary) + '</p>' +
      '<button type="button" class="upd-card__toggle" aria-expanded="false" aria-controls="d-' + esc(it.id) + '"><span>Key details</span>' + icon('chevron-right') + '</button>' +
      '<div class="upd-card__detail" id="d-' + esc(it.id) + '" hidden>' + (pts ? '<ul class="upd-points">' + pts + '</ul>' : '') + via +
      '<div class="upd-card__actions">' + src + ask + '</div></div></article>';
  }

  // Cards for items[from..to), with a month label whenever the month changes (state.lastKey survives "View more")
  function cardsHtml(arr) {
    return arr.map(function (it) {
      var d = parseDate(it.date), k = monthKey(d), out = '';
      if (k !== state.lastKey) { out += '<p class="upd-month">' + MONTH_FULL[d.m] + ' ' + d.y + '</p>'; state.lastKey = k; }
      return out + card(it);
    }).join('');
  }

  function render(append, from) {
    var all = pool(), visible = all.slice(0, state.shown);
    if (append) listEl.insertAdjacentHTML('beforeend', cardsHtml(all.slice(from, state.shown)));
    else { state.lastKey = ''; listEl.innerHTML = cardsHtml(visible); }
    emptyEl.hidden = all.length > 0;
    if (!all.length) {
      $('updEmptyTitle').textContent = 'No updates match'; $('updEmptyText').textContent = 'Try a different filter or search.';
      resetBtn.hidden = false;
    }
    moreWrap.hidden = state.shown >= all.length;
    var left = all.length - state.shown;
    moreBtn.textContent = left > 0 ? 'View more updates (' + left + ' more)' : 'View more updates';
    statusEl.textContent = all.length ? 'Showing ' + visible.length + ' of ' + all.length + (all.length === 1 ? ' update' : ' updates') : '';
  }

  // ---- Filters (rebuilt only when the year changes, so the swipe position is kept) ----
  function buildGroups() {
    var yr = inYear();
    groupsEl.innerHTML = GROUPS.map(function (g) {
      var btns = g.chips.map(function (c) {
        var n = c[0] === 'all' ? yr.length : yr.filter(function (it) { return has(it, c[0]); }).length;
        if (!n) return '';
        return '<button type="button" class="upd-chip' + (c[0] === state.filter ? ' is-active' : '') + '" data-cat="' + c[0] + '" aria-pressed="' + (c[0] === state.filter) + '"><span>' + c[1] + '</span><span class="upd-chip__n">' + n + '</span></button>';
      }).join('');
      return btns ? '<div class="upd-group"><p class="upd-group__title">' + g.title + '</p><div class="upd-group__list">' + btns + '</div></div>' : '';
    }).join('');
  }
  function markChips() {
    groupsEl.querySelectorAll('.upd-chip').forEach(function (b) {
      var on = b.dataset.cat === state.filter;
      b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  function buildYears() {
    yearsEl.hidden = cycles.length < 2;
    yearsEl.innerHTML = cycles.map(function (y) {
      return '<button type="button" class="upd-year' + (y === state.cycle ? ' is-active' : '') + '" data-year="' + y + '" aria-pressed="' + (y === state.cycle) + '">NEET ' + y + '</button>';
    }).join('');
  }
  function headerLine() {
    var yr = inYear();
    $('updCycleLabel').textContent = 'NEET ' + state.cycle + ' cycle';
    $('updLast').textContent = yr.length ? yr[0].date : 'no updates yet';
  }

  // ---- Counselling tracker ----
  // Each round in counselling-tracker.json is [label, start, end, note]:
  //   start = the day the round opens (registration), end = the LAST DATE OF REPORTING. Use null when a date is not announced.
  //   note  = optional text shown when there is no range, e.g. "Result 4 Dec".
  // Status is worked out from today's date: done (last reporting date passed), live (running now), next (first one still to come).
  function short(str) { var d = parseDate(str); return d.d + ' ' + MONTHS[d.m]; }
  function rangeText(st) {
    if (st.s && st.e) return short(st.raw[1]) + ' – ' + short(st.raw[2]);
    if (st.s) return 'From ' + short(st.raw[1]);
    return st.raw[3] || 'Date awaited';
  }
  function renderTracker() {
    var box = $('updTracker');
    if (!tracker || !tracker.tracks || String(tracker.cycle) !== state.cycle) { box.hidden = true; return; }
    var t0 = today();
    $('updTrackerNote').textContent = 'Start to last date of reporting · as of ' + tracker.asOf;
    $('updTrackerRow').innerHTML = tracker.tracks.map(function (tr) {
      var focus = -1;
      var steps = tr.steps.map(function (r) {
        var s = r[1] ? parseDate(r[1]).t : null, e = r[2] ? parseDate(r[2]).t : null;
        return { raw: r, label: r[0], s: s, e: e, done: e !== null && e < t0, live: s !== null && s <= t0 && (e === null || e >= t0) };
      });
      // focus = the round happening now, otherwise the first one still to come
      steps.forEach(function (st, i) { if (focus === -1 && !st.done) focus = i; });
      var li = steps.map(function (st, i) {
        var cls = st.done ? 'is-done' : i === focus ? (st.live ? 'is-live' : 'is-next') : '';
        return '<li class="' + cls + '"><span class="upd-track__dot"></span><span>' + esc(st.label) + '</span><time>' + esc(rangeText(st)) + '</time></li>';
      }).join('');
      var chip;
      if (focus === -1) chip = '<span class="upd-track__state is-done">All rounds complete</span>';
      else if (steps[focus].live) chip = '<span class="upd-track__state is-live">Live: ' + esc(steps[focus].label) + '</span>';
      else chip = '<span class="upd-track__state">Next: ' + esc(steps[focus].label) + (steps[focus].s ? ' · ' + short(steps[focus].raw[1]) : '') + '</span>';
      return '<div class="upd-track"><div class="upd-track__head"><div><h3>' + esc(tr.name) + '</h3><p class="upd-track__sub">' + esc(tr.sub || '') + '</p></div></div>' +
        '<ul class="upd-track__steps">' + li + '</ul><div>' + chip + '</div></div>';
    }).join('');
    box.hidden = false;
    syncArrows();
  }

  // Arrow buttons: scroll the tracker row by about one card; they only show when the row overflows
  function syncArrows() {
    var row = $('updTrackerRow'), nav = $('updTrackerNav'), max = row.scrollWidth - row.clientWidth;
    nav.hidden = max <= 4;
    $('updTrackerPrev').disabled = row.scrollLeft <= 4;
    $('updTrackerNext').disabled = row.scrollLeft >= max - 4;
  }
  function nudge(dir) {
    var row = $('updTrackerRow'), card = row.querySelector('.upd-track');
    row.scrollBy({ left: dir * (card ? card.offsetWidth + 12 : 280), behavior: 'smooth' });
  }
  $('updTrackerPrev').addEventListener('click', function () { nudge(-1); });
  $('updTrackerNext').addEventListener('click', function () { nudge(1); });
  $('updTrackerRow').addEventListener('scroll', syncArrows, { passive: true });
  window.addEventListener('resize', syncArrows);

  function setCycle(y) {
    state.cycle = y; state.filter = 'all'; state.q = ''; state.shown = PAGE_SIZE; searchEl.value = '';
    buildYears(); buildGroups(); headerLine(); renderTracker(); render(false);
  }

  // ---- Events ----
  groupsEl.addEventListener('click', function (e) {
    var b = e.target.closest('.upd-chip'); if (!b) return;
    state.filter = b.dataset.cat; state.shown = PAGE_SIZE; markChips(); render(false);
  });
  yearsEl.addEventListener('click', function (e) {
    var b = e.target.closest('.upd-year'); if (b && b.dataset.year !== state.cycle) setCycle(b.dataset.year);
  });
  var timer;
  searchEl.addEventListener('input', function () {
    clearTimeout(timer);
    timer = setTimeout(function () { state.q = searchEl.value.trim(); state.shown = PAGE_SIZE; render(false); }, 150);
  });
  resetBtn.addEventListener('click', function () {
    state.filter = 'all'; state.q = ''; searchEl.value = ''; state.shown = PAGE_SIZE; markChips(); render(false);
  });
  moreBtn.addEventListener('click', function () {
    var from = state.shown; state.shown += PAGE_SIZE; render(true, from);
    var cards = listEl.querySelectorAll('.upd-card'); if (cards[from]) cards[from].focus();
  });
  listEl.addEventListener('click', function (e) {
    var btn = e.target.closest('.upd-card__toggle'); if (!btn) return;
    var panel = $(btn.getAttribute('aria-controls')), open = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', open ? 'false' : 'true'); panel.hidden = open;
    btn.querySelector('span').textContent = open ? 'Key details' : 'Hide details';
  });

  // Links from other pages: neet-2026-updates.html#ug  #pg  #mds  #mcc  #tn  #counselling ...  or  #2027 for a year
  function fromHash() {
    var h = location.hash.replace('#', '');
    if (cycles.indexOf(h) !== -1) state.cycle = h;
    else if (GROUPS.some(function (g) { return g.chips.some(function (c) { return c[0] === h; }); })) state.filter = h;
  }

  // ---- Load ----
  fetch(TRACKER_URL).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }).then(function (t) { tracker = t; renderTracker(); });
  fetch(DATA_URL)
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (data) {
      items = data.map(function (it) { it._cycle = String(it.cycle || parseDate(it.date).y); return it; })
        .sort(function (a, b) { return parseDate(b.date).t - parseDate(a.date).t; });
      items.forEach(function (it) { if (cycles.indexOf(it._cycle) === -1) cycles.push(it._cycle); });
      cycles.sort().reverse();
      state.cycle = cycles[0] || String(new Date().getFullYear());
      fromHash();
      buildYears(); buildGroups(); headerLine(); renderTracker(); render(false);
    })
    .catch(function () {
      statusEl.textContent = ''; $('updLast').textContent = 'unavailable'; listEl.innerHTML = '';
      emptyEl.hidden = false; resetBtn.hidden = true;
      $('updEmptyTitle').textContent = 'Updates could not load';
      $('updEmptyText').textContent = 'Refresh the page. If you opened this file straight from your computer, view it through the live site or a local server instead.';
    });
});
