// updates.js — behaviour unique to neet-2026-updates.html.
// All updates live in assets/data/latest-updates.json (newest first). Edit that one file to add or change an update.
document.addEventListener('DOMContentLoaded', function () {
  var DATA_URL = 'assets/data/latest-updates.json';
  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var MONTH_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var LABELS = { ug: 'NEET UG', pg: 'NEET PG', counselling: 'Counselling', exam: 'Exam news', guide: 'Guidance', 'all-india': 'All India (MCC)', state: 'State' };

  var $ = function (id) { return document.getElementById(id); };
  var list = $('updList'), statusEl = $('updStatus'), emptyEl = $('updEmpty');
  var filtersEl = $('updFilters'), toggleBtn = $('updFilterToggle');
  var items = [];
  var state = { exam: 'all', type: 'all', scope: 'all', state: '', tag: '', q: '' };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function icon(name) { return '<svg class="icon" aria-hidden="true"><use href="#i-' + name + '"></use></svg>'; }
  function parseDate(str) {          // "27 Aug 2026" -> {d, m, y, t}
    var p = String(str).trim().split(/\s+/), m = MONTHS.indexOf(p[1]);
    return { d: parseInt(p[0], 10), m: m, y: parseInt(p[2], 10), t: new Date(parseInt(p[2], 10), m, parseInt(p[0], 10)).getTime() };
  }

  // ---- Filtering ----
  function matches(it, s) {
    if (s.exam !== 'all' && it.exam !== s.exam) return false;
    if (s.type !== 'all' && it.type !== s.type) return false;
    if (s.type === 'counselling' && s.scope !== 'all' && it.scope !== s.scope) return false;
    if (s.type === 'counselling' && s.scope === 'state' && s.state && it.state !== s.state) return false;
    if (s.tag && (it.tags || []).indexOf(s.tag) === -1) return false;
    if (s.q) {
      var hay = (it.title + ' ' + it.summary + ' ' + (it.state || '') + ' ' + (it.tags || []).join(' ')).toLowerCase();
      if (hay.indexOf(s.q.toLowerCase()) === -1) return false;
    }
    return true;
  }
  function isFiltered() { return state.exam !== 'all' || state.type !== 'all' || state.tag || state.q || state.scope !== 'all'; }

  // ---- Build tag chips + state list from the data ----
  function buildOptions() {
    var tags = [], states = [];
    items.forEach(function (it) {
      (it.tags || []).forEach(function (t) { if (tags.indexOf(t) === -1) tags.push(t); });
      if (it.state && states.indexOf(it.state) === -1) states.push(it.state);
    });
    tags.sort(); states.sort();
    var tagBox = $('updTags');
    tagBox.innerHTML = '<button type="button" class="upd-chip is-active" data-value="" aria-pressed="true">All topics</button>' +
      tags.map(function (t) { return '<button type="button" class="upd-chip" data-value="' + esc(t) + '" aria-pressed="false">' + esc(t) + ' <span class="upd-chip__n"></span></button>'; }).join('');
    $('updTagGroup').hidden = tags.length === 0;
    $('updState').innerHTML = '<option value="">All states</option>' + states.map(function (s) { return '<option>' + esc(s) + '</option>'; }).join('');
  }

  // ---- Chip counts: how many updates each chip would show, given the other filters ----
  function updateChips() {
    filtersEl.querySelectorAll('.upd-chips').forEach(function (box) {
      var group = box.dataset.group;
      box.querySelectorAll('.upd-chip').forEach(function (chip) {
        var val = chip.dataset.value, on = state[group] === val;
        chip.classList.toggle('is-active', on);
        chip.setAttribute('aria-pressed', on ? 'true' : 'false');
        var n = chip.querySelector('.upd-chip__n');
        if (n) {
          var probe = Object.assign({}, state); probe[group] = val;
          if (group === 'scope' && probe.type !== 'counselling') probe.type = 'counselling';
          var count = items.filter(function (it) { return matches(it, probe); }).length;
          n.textContent = count;
          chip.classList.toggle('is-zero', count === 0);
        }
      });
    });
    $('updScopeGroup').hidden = state.type !== 'counselling';
    $('updStateWrap').hidden = !(state.type === 'counselling' && state.scope === 'state');
    $('updReset').hidden = !isFiltered();
    var active = ['exam', 'type', 'scope', 'state', 'tag', 'q'].filter(function (k) { return state[k] && state[k] !== 'all'; }).length;
    var badge = $('updFilterCount');
    badge.textContent = active; badge.hidden = active === 0;
  }

  // ---- Render the feed (grouped by month) ----
  function card(it) {
    var d = parseDate(it.date), pills = '';
    if (it.important) pills += '<span class="upd-tag upd-tag--important">Important</span>';
    if (it.exam) pills += '<span class="upd-tag upd-tag--exam">' + LABELS[it.exam] + '</span>';
    if (it.type === 'counselling') {
      pills += '<span class="upd-tag upd-tag--scope">' + icon(it.scope === 'state' ? 'map-pin' : 'globe') + esc(it.scope === 'state' ? (it.state || 'State') : 'All India (MCC)') + '</span>';
    } else {
      pills += '<span class="upd-tag upd-tag--scope">' + LABELS[it.type] + '</span>';
      if (it.state) pills += '<span class="upd-tag upd-tag--scope">' + icon('map-pin') + esc(it.state) + '</span>';
    }
    var topics = (it.tags || []).length ? '<ul class="upd-topics">' + it.tags.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '';
    var hasDetail = !!(it.details || it.source);
    return '<article class="card upd-card' + (it.important ? ' is-important' : '') + '" id="u-' + esc(it.id) + '">' +
      '<div class="upd-card__meta"><time class="upd-card__when" datetime="' + d.y + '-' + ('0' + (d.m + 1)).slice(-2) + '-' + ('0' + d.d).slice(-2) + '">' + d.d + ' ' + MONTHS[d.m] + '</time>' + pills + '</div>' +
      '<h3>' + esc(it.title) + '</h3><p class="upd-card__summary">' + esc(it.summary) + '</p>' + topics +
      (hasDetail ? '<button type="button" class="upd-card__toggle" aria-expanded="false" aria-controls="d-' + esc(it.id) + '"><span>Read full update</span>' + icon('chevron-right') + '</button>' +
        '<div class="upd-card__detail" id="d-' + esc(it.id) + '" hidden>' + (it.details || '') +
        (it.source ? '<a class="upd-card__source" href="' + esc(it.source) + '" target="_blank" rel="noopener">Official source ' + icon('arrow-right') + '</a>' : '') + '</div>' : '') +
      '</article>';
  }

  function render() {
    var shown = items.filter(function (it) { return matches(it, state); });
    var html = '', lastKey = '';
    shown.forEach(function (it) {
      var d = parseDate(it.date), key = d.y + '-' + d.m;
      if (key !== lastKey) { html += '<h2 class="upd-month">' + MONTH_FULL[d.m] + ' ' + d.y + '</h2>'; lastKey = key; }
      html += card(it);
    });
    list.innerHTML = html;
    emptyEl.hidden = shown.length > 0;
    if (!shown.length) {
      var none = !items.length;
      $('updEmptyTitle').textContent = none ? 'No updates yet' : 'No updates match these filters';
      $('updEmptyText').textContent = none ? 'New NEET and counselling updates will appear here.' : 'Try a different exam or counselling level, or clear the filters.';
      $('updEmptyReset').hidden = none;
    }
    statusEl.textContent = shown.length === 0 ? '' : 'Showing ' + shown.length + (shown.length === items.length ? '' : ' of ' + items.length) + (shown.length === 1 ? ' update' : ' updates');
    updateChips();
  }

  // ---- Events ----
  filtersEl.addEventListener('click', function (e) {
    var chip = e.target.closest('.upd-chip');
    if (!chip) return;
    var group = chip.parentElement.dataset.group, val = chip.dataset.value;
    state[group] = (group === 'tag' && state.tag === val) ? '' : val;
    if (group === 'type' && val !== 'counselling') { state.scope = 'all'; state.state = ''; $('updState').value = ''; }
    if (group === 'scope' && val !== 'state') { state.state = ''; $('updState').value = ''; }
    render();
  });
  $('updState').addEventListener('change', function (e) { state.state = e.target.value; render(); });
  $('updSearch').addEventListener('input', function (e) { state.q = e.target.value.trim(); render(); });
  function reset() { state = { exam: 'all', type: 'all', scope: 'all', state: '', tag: '', q: '' }; $('updSearch').value = ''; $('updState').value = ''; render(); }
  $('updReset').addEventListener('click', reset);
  $('updEmptyReset').addEventListener('click', reset);
  toggleBtn.addEventListener('click', function () {
    var open = filtersEl.classList.toggle('is-open');
    toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  list.addEventListener('click', function (e) {
    var btn = e.target.closest('.upd-card__toggle');
    if (!btn) return;
    var panel = $(btn.getAttribute('aria-controls')), open = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', open ? 'false' : 'true');
    panel.hidden = open;
    btn.querySelector('span').textContent = open ? 'Read full update' : 'Hide full update';
  });

  // Deep links from other pages: updates.html#ug  #pg  #counselling  #all-india  #state
  function applyHash() {
    var h = location.hash.replace('#', '');
    if (h === 'ug' || h === 'pg') state.exam = h;
    else if (h === 'counselling') state.type = 'counselling';
    else if (h === 'all-india' || h === 'state') { state.type = 'counselling'; state.scope = h; }
  }

  // ---- Load ----
  fetch(DATA_URL)
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (data) {
      items = data.slice().sort(function (a, b) { return parseDate(b.date).t - parseDate(a.date).t; });
      if (items.length) $('updLast').textContent = items[0].date;
      else $('updLast').textContent = 'no updates yet';
      buildOptions(); applyHash(); render();
    })
    .catch(function () {
      statusEl.textContent = '';
      $('updLast').textContent = 'unavailable';
      emptyEl.hidden = false;
      $('updEmptyTitle').textContent = 'Updates could not load';
      $('updEmptyText').textContent = 'Refresh the page. If you opened this file straight from your computer, view it through the live site or a local server instead.';
      $('updEmptyReset').hidden = true;
    });
});
