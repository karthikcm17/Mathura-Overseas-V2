// Mathura Overseas — destinations.html page behavior

document.addEventListener('DOMContentLoaded', function () {

  var tiles = Array.prototype.slice.call(document.querySelectorAll('.dest-tile'));
  var grid = document.getElementById('destGrid');

  // ---- Staggered scroll-reveal ----
  if ('IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var index = tiles.indexOf(entry.target);
          var delay = Math.max(0, index % 3) * 90;
          setTimeout(function () { entry.target.classList.add('dest-tile--in'); }, delay);
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    tiles.forEach(function (tile) { revealObserver.observe(tile); });
  } else {
    tiles.forEach(function (tile) { tile.classList.add('dest-tile--in'); });
  }

  // ---- Animated count-up stats ----
  var counters = document.querySelectorAll('.dest-stats__number');
  if ('IntersectionObserver' in window && counters.length) {
    var countObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var target = parseInt(el.dataset.count, 10);
        var suffix = el.dataset.suffix || '';
        var start = 0;
        var duration = 1100;
        var startTime = null;
        function step(ts) {
          if (!startTime) startTime = ts;
          var progress = Math.min((ts - startTime) / duration, 1);
          var eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.round(eased * target) + suffix;
          if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
        countObserver.unobserve(el);
      });
    }, { threshold: 0.5 });
    counters.forEach(function (c) { countObserver.observe(c); });
  }

  // ---- Smart sort chips ----
  var chips = document.querySelectorAll('.sort-chip');
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      chips.forEach(function (c) { c.classList.remove('sort-chip--active'); });
      chip.classList.add('sort-chip--active');
      var sortKey = chip.dataset.sort;

      tiles.forEach(function (tile) {
        var tags = (tile.dataset.tags || '').split(' ');
        var matches = sortKey === 'all' || tags.indexOf(sortKey) !== -1;
        tile.style.display = matches ? '' : 'none';
      });
    });
  });

  // ---- Compare tray + panel ----
  var selected = [];
  var tray = document.getElementById('compareTray');
  var trayCount = document.getElementById('trayCount');
  var trayAvatars = document.getElementById('trayAvatars');
  var trayBtn = document.getElementById('trayCompareBtn');
  var panel = document.getElementById('comparePanel');
  var panelClose = document.getElementById('comparePanelClose');
  var compareTable = document.getElementById('compareTable');

  function updateTray() {
    trayCount.textContent = selected.length + ' selected';
    trayAvatars.innerHTML = selected.map(function () {
      return '<span class="compare-tray__avatar"></span>';
    }).join('');
    tray.classList.toggle('compare-tray--open', selected.length >= 2);
  }

  var addIconPlus = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 5v14M5 12h14"/></svg> Compare';
  var addIconCheck = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12l5 5L20 6"/></svg> Added';

  tiles.forEach(function (tile) {
    var addBtn = tile.querySelector('.dest-tile__add');
    addBtn.addEventListener('click', function (e) {
      e.preventDefault();
      var name = tile.dataset.name;
      var idx = selected.indexOf(name);
      if (idx === -1) {
        if (selected.length >= 4) return; // cap comparison at 4
        selected.push(name);
        addBtn.classList.add('dest-tile__add--selected');
        addBtn.innerHTML = addIconCheck;
      } else {
        selected.splice(idx, 1);
        addBtn.classList.remove('dest-tile__add--selected');
        addBtn.innerHTML = addIconPlus;
      }
      updateTray();
    });
  });

  function openComparePanel() {
    var chosenTiles = tiles.filter(function (t) { return selected.indexOf(t.dataset.name) !== -1; });
    var rows = [
      ['', ...chosenTiles.map(function (t) { return t.dataset.name; })],
      ['Duration', ...chosenTiles.map(function (t) { return t.dataset.duration; })],
      ['Est. fee', ...chosenTiles.map(function (t) { return t.dataset.fee; })],
      ['Climate', ...chosenTiles.map(function (t) { return t.dataset.climate; })],
    ];
    compareTable.innerHTML = rows.map(function (row, i) {
      var cellTag = i === 0 ? 'th' : 'td';
      return '<tr>' + row.map(function (cell) { return '<' + cellTag + '>' + cell + '</' + cellTag + '>'; }).join('') + '</tr>';
    }).join('');
    panel.classList.add('compare-panel--open');
  }

  trayBtn.addEventListener('click', openComparePanel);
  panelClose.addEventListener('click', function () { panel.classList.remove('compare-panel--open'); });
  panel.addEventListener('click', function (e) { if (e.target === panel) panel.classList.remove('compare-panel--open'); });

});

// Flight map — real data, Chennai origin, rates as of Sep 2026
document.addEventListener('DOMContentLoaded', function () {
  var FM_DATA = {
    philippines: { name: 'Philippines', flight: '~8 hrs (1-stop, via Bangkok)', capital: 'Manila', rate: '1 INR \u2248 0.66 PHP', lang: 'Filipino & English', climate: 'Tropical' },
    uzbekistan:  { name: 'Uzbekistan',  flight: '~8 hrs (1-stop)', capital: 'Tashkent', rate: '1 INR \u2248 124.5 UZS', lang: 'Uzbek', climate: 'Continental' },
    russia:      { name: 'Russia',      flight: '~12\u201315 hrs (1-stop)', capital: 'Moscow', rate: '1 INR \u2248 0.90 RUB', lang: 'Russian', climate: 'Cold' },
    georgia:     { name: 'Georgia',     flight: '~10 hrs (1-stop)', capital: 'Tbilisi', rate: '1 INR \u2248 0.0273 GEL', lang: 'Georgian', climate: 'Temperate' },
    kazakhstan:  { name: 'Kazakhstan',  flight: '~9 hrs (1-stop, to Almaty)', capital: 'Almaty*', rate: '1 INR \u2248 4.83 KZT', lang: 'Kazakh & Russian', climate: 'Continental' },
    kyrgyzstan:  { name: 'Kyrgyzstan',  flight: '~9\u201310 hrs (1-stop, est.)', capital: 'Bishkek', rate: '1 INR \u2248 1.0 KGS', lang: 'Kyrgyz & Russian', climate: 'Cold winters' },
    timor:       { name: 'Timor-Leste', flight: '~20\u201324 hrs (via Singapore)', capital: 'Dili', rate: '1 INR \u2248 0.0114 USD', lang: 'Tetum & Portuguese', climate: 'Tropical' },
    vietnam:     { name: 'Vietnam',     flight: '~7 hrs (1-stop)', capital: 'Hanoi', rate: '1 INR \u2248 275.6 VND', lang: 'Vietnamese', climate: 'Tropical' }
  };

  var svg = document.getElementById('flightMapSvg');
  var card = document.getElementById('flightMapCard');
  if (!svg || !card) return;

  function selectDest(key) {
    svg.querySelectorAll('.fm-line').forEach(function (l) { l.classList.toggle('fm-line--active', l.dataset.dest === key); });
    svg.querySelectorAll('.fm-node').forEach(function (n) { n.classList.toggle('fm-node--active', n.dataset.dest === key); });
    var d = FM_DATA[key];
    card.innerHTML = '<h3>' + d.name + '</h3><div class="fm-grid">' +
      '<span><span class="fm-label">FLIGHT TIME</span>' + d.flight + '</span>' +
      '<span><span class="fm-label">CAPITAL</span>' + d.capital + '</span>' +
      '<span><span class="fm-label">EXCHANGE RATE</span>' + d.rate + '</span>' +
      '<span><span class="fm-label">LANGUAGE</span>' + d.lang + '</span>' +
      '<span class="fm-full"><span class="fm-label">CLIMATE</span>' + d.climate + '</span></div>';
  }

  svg.querySelectorAll('.fm-node').forEach(function (node) {
    node.addEventListener('click', function () { selectDest(node.dataset.dest); });
  });
});