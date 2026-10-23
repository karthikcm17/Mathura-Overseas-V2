// destinations.js — filter chips + compare tray for destinations.html
document.addEventListener('DOMContentLoaded', function () {
  var tiles = Array.prototype.slice.call(document.querySelectorAll('.dest-tile'));
  var chips = document.querySelectorAll('.dest-chip');
  var empty = document.getElementById('destEmpty');

  // ---- Filter ----
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      chips.forEach(function (c) { c.classList.remove('is-active'); c.setAttribute('aria-pressed', 'false'); });
      chip.classList.add('is-active'); chip.setAttribute('aria-pressed', 'true');
      var key = chip.dataset.sort, shown = 0;
      tiles.forEach(function (t) {
        var ok = key === 'all' || (t.dataset.tags || '').split(' ').indexOf(key) !== -1;
        t.hidden = !ok; if (ok) shown++;
      });
      empty.hidden = shown > 0;
    });
  });

  // ---- Compare ----
  var MAX = 3, selected = [];
  var tray = document.getElementById('compareTray');
  var count = document.getElementById('trayCount');
  var panel = document.getElementById('comparePanel');
  var table = document.getElementById('compareTable');

  tiles.forEach(function (tile) {
    var btn = tile.querySelector('.dest-compare');
    btn.addEventListener('click', function () {
      var name = tile.dataset.name, i = selected.indexOf(name);
      if (i === -1) {
        if (selected.length >= MAX) { flash('Max ' + MAX + ' to compare'); return; }   // keeps the table readable on a phone
        selected.push(name);
      } else { selected.splice(i, 1); }
      var on = selected.indexOf(name) !== -1;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.textContent = on ? 'Added' : 'Compare';
      updateTray();
    });
  });

  function updateTray() {
    count.textContent = selected.length + ' selected';
    tray.classList.toggle('is-open', selected.length >= 2);
  }
  function flash(msg) {
    count.textContent = msg;
    setTimeout(updateTray, 1400);
  }
  // Close (X) on the tray clears the whole selection
  document.getElementById('trayClear').addEventListener('click', function () {
    selected = [];
    tiles.forEach(function (t) {
      var b = t.querySelector('.dest-compare');
      b.setAttribute('aria-pressed', 'false'); b.textContent = 'Compare';
    });
    updateTray(); closePanel();
  });

  var ROWS = [['Flight', 'flight'], ['Duration', 'duration'], ['Est. fee', 'fee'], ['Climate', 'climate']];
  function openPanel() {
    var chosen = tiles.filter(function (t) { return selected.indexOf(t.dataset.name) !== -1; });
    var html = '<thead><tr><th></th>' + chosen.map(function (t) { return '<th>' + t.dataset.name + '</th>'; }).join('') + '</tr></thead><tbody>';
    ROWS.forEach(function (r) {
      html += '<tr><th>' + r[0] + '</th>' + chosen.map(function (t) { return '<td>' + t.dataset[r[1]] + '</td>'; }).join('') + '</tr>';
    });
    table.innerHTML = html + '</tbody>';
    panel.classList.add('is-open');
  }
  function closePanel() { panel.classList.remove('is-open'); }
  document.getElementById('trayCompareBtn').addEventListener('click', openPanel);
  document.getElementById('comparePanelClose').addEventListener('click', closePanel);
  panel.addEventListener('click', function (e) { if (e.target === panel) closePanel(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePanel(); });

  // ---- Travel explorer: one country at a time, details animate in ----
  var ROUTE = {
    vietnam:     { name: 'Vietnam',     time: '~7 hrs',      stop: '1-stop',            capital: 'Hanoi',    lang: 'Vietnamese',        climate: 'Tropical',     rate: '1 INR \u2248 275.6 VND' },
    philippines: { name: 'Philippines', time: '~8 hrs',      stop: '1-stop',            capital: 'Manila',   lang: 'Filipino & English', climate: 'Tropical',     rate: '1 INR \u2248 0.66 PHP' },
    uzbekistan:  { name: 'Uzbekistan',  time: '~8 hrs',      stop: '1-stop',            capital: 'Tashkent', lang: 'Uzbek',             climate: 'Continental',  rate: '1 INR \u2248 124.5 UZS' },
    kazakhstan:  { name: 'Kazakhstan',  time: '~9 hrs',      stop: 'lands in Almaty',   capital: 'Astana',   lang: 'Kazakh & Russian',  climate: 'Continental',  rate: '1 INR \u2248 4.83 KZT' },
    kyrgyzstan:  { name: 'Kyrgyzstan',  time: '~9\u201310 hrs', stop: '1-stop',        capital: 'Bishkek',  lang: 'Kyrgyz & Russian',  climate: 'Cold winters', rate: '1 INR \u2248 1.0 KGS' },
    georgia:     { name: 'Georgia',     time: '~10 hrs',     stop: '1-stop',            capital: 'Tbilisi',  lang: 'Georgian',          climate: 'Temperate',    rate: '1 INR \u2248 0.0273 GEL' },
    russia:      { name: 'Russia',      time: '~12\u201315 hrs', stop: '1-stop',       capital: 'Moscow',   lang: 'Russian',           climate: 'Cold',         rate: '1 INR \u2248 0.90 RUB' },
    timor:       { name: 'Timor-Leste', time: '~20\u201324 hrs', stop: 'via Singapore', capital: 'Dili',    lang: 'Tetum & Portuguese', climate: 'Tropical',    rate: '1 INR \u2248 0.0114 USD' }
  };
  var card = document.getElementById('routeCard');
  var rChips = document.querySelectorAll('.route-chip');
  var motion = document.getElementById('routeMotion');
  var plane = document.getElementById('routePlane');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function showRoute(key) {
    var d = ROUTE[key]; if (!d) return;
    rChips.forEach(function (c) {
      var on = c.dataset.dest === key;
      c.classList.toggle('is-active', on); c.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    document.getElementById('routeName').textContent = d.name;
    document.getElementById('routeTime').innerHTML = d.time + ' <small>' + d.stop + '</small>';
    card.querySelectorAll('[data-f]').forEach(function (el) {
      el.textContent = { capital: d.capital, lang: d.lang, climate: d.climate, rate: d.rate }[el.dataset.f];
    });
    // restart the draw + fade-in animations
    card.classList.remove('is-swap'); void card.offsetWidth; card.classList.add('is-swap');
    if (!reduce && motion && motion.beginElement) { plane.setAttribute('opacity', '1'); motion.beginElement(); }
  }
  rChips.forEach(function (c) { c.addEventListener('click', function () { showRoute(c.dataset.dest); }); });

  // Play the first route when the card scrolls into view
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { io.disconnect(); showRoute('vietnam'); } }, { threshold: 0.35 });
    io.observe(card);
  } else { showRoute('vietnam'); }
});
