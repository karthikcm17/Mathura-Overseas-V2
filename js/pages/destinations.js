// destinations.js — Countries page: filters, compare (max 3) and the "Fly the route" explorer.
//
// WHERE TO EDIT:
//  • Fees, duration, living cost  → data-* attributes on each country card in destinations.html
//  • Flight, time, language, rates, highlights → the TRAVEL object below (one block per country)
// Exchange rates are indicative. Re-check them and update the "as of" date in destinations.html when you do.

var TRAVEL = {
  vietnam: {
    name: 'Vietnam', page: 'mbbs-in-vietnam.html',
    t: [7, null], n: 7, stop: '1 stop', tz: '1h 30m ahead', capital: 'Hanoi', lang: 'Vietnamese', climate: 'Tropical',
    fare: 'From \u20B912,679 one-way', currency: 'Vietnamese dong', rate: '1 INR ≈ 275.6 VND',
    why: [['shield-check', 'Modern, safe cities'], ['map-pin', 'Hanoi: lakes, an old quarter and famous street food'], ['plane', 'One of the shorter flights from South India']],
    know: 'Usually connects via Singapore or Bangkok. English availability varies by campus \u2014 ask us which teach it.'
  },
  philippines: {
    name: 'Philippines', page: 'mbbs-in-philippines.html',
    t: [10, null], n: 10, stop: '1 stop', tz: '2h 30m ahead', capital: 'Manila', lang: 'Filipino & English', climate: 'Tropical',
    fare: 'From \u20B913,434 one-way', currency: 'Philippine peso', rate: '1 INR ≈ 0.66 PHP',
    why: [['cap', 'American-style curriculum, taught in English'], ['users', 'A large Indian student community'], ['heart', 'Strong clinical exposure']],
    know: 'Fastest options connect via Kuala Lumpur; English is widely spoken, so day-to-day life is easy.'
  },
  uzbekistan: {
    name: 'Uzbekistan', page: 'mbbs-in-uzbekistan.html',
    t: [8, null], n: 8, stop: '1 stop', tz: '30m behind', capital: 'Tashkent', lang: 'Uzbek', climate: 'Continental',
    fare: 'From \u20B920,073 one-way', currency: 'Uzbek som', rate: '1 INR ≈ 124.5 UZS',
    why: [['map-pin', 'Silk Road cities like Tashkent and Samarkand'], ['building', 'Modern campuses'], ['users', 'Established Indian student communities']],
    know: 'Usually connects via Delhi or Sharjah. NMC advises extra caution here, so verify the campus before you pay.'
  },
  kazakhstan: {
    name: 'Kazakhstan', page: 'mbbs-in-kazakhstan.html',
    t: [9, null], n: 9, stop: 'lands in Almaty', tz: '30m behind', capital: 'Astana', lang: 'Kazakh & Russian', climate: 'Continental',
    fare: 'From \u20B928,502 one-way', currency: 'Kazakh tenge', rate: '1 INR ≈ 4.83 KZT',
    why: [['map-pin', 'Almaty sits right beneath snow-capped mountains'], ['building', 'Astana is a planned, modern capital'], ['globe', 'Kazakh and Russian are both widely spoken']],
    know: 'Usually connects via Delhi or Dubai and lands in Almaty; Astana is a further domestic hop.'
  },
  kyrgyzstan: {
    name: 'Kyrgyzstan', page: 'mbbs-in-kyrgyzstan.html',
    t: [9, 10], n: 9.5, stop: '1 stop', tz: '30m ahead', capital: 'Bishkek', lang: 'Kyrgyz & Russian', climate: 'Cold winters',
    fare: 'From \u20B934,725 one-way', currency: 'Kyrgyz som', rate: '1 INR ≈ 1.0 KGS',
    why: [['briefcase', 'Among the most affordable options'], ['map-pin', 'Bishkek sits at the foot of the Ala-Too mountains'], ['globe', 'Russian is widely used alongside Kyrgyz']],
    know: 'Winters are properly cold, so plan your wardrobe. Ask us for the best connecting route.'
  },
  georgia: {
    name: 'Georgia', page: 'mbbs-in-georgia.html',
    t: [10, null], n: 10, stop: '1 stop', tz: '1h 30m behind', capital: 'Tbilisi', lang: 'Georgian', climate: 'Temperate',
    fare: 'From \u20B927,271 one-way', currency: 'Georgian lari', rate: '1 INR ≈ 0.0273 GEL',
    why: [['map-pin', 'Tbilisi: an old town, sulphur baths and wine culture'], ['globe', 'Where Europe meets Asia'], ['sun', 'A mild, temperate climate']],
    know: 'Usually connects via Dubai, Doha or Sharjah. Ask us for current fees and course details.'
  },
  russia: {
    name: 'Russia', page: 'mbbs-in-russia.html',
    t: [12, 15], n: 13.5, stop: '1 stop', tz: '2h 30m behind', capital: 'Moscow', lang: 'Russian', climate: 'Cold',
    fare: 'About \u20B961,667 return', currency: 'Russian rouble', rate: '1 INR ≈ 0.90 RUB',
    why: [['building', 'Government universities with 60+ years of Indian students'], ['map-pin', 'Moscow is Russia’s capital and largest city'], ['target', 'Long, cold winters — a real change from home']],
    know: 'No direct flights; the fastest options take about 11h 45m. Moscow time is 2h 30m behind India.'
  },
  timor: {
    name: 'Timor-Leste', page: 'mbbs-in-timor-uct-timor.html',
    t: [20, 24], n: 22, stop: 'via Singapore', tz: '3h 30m ahead', capital: 'Dili', lang: 'Tetum & Portuguese', climate: 'Tropical',
    fare: 'From \u20B935,561 one-way', currency: 'US dollar', rate: '1 INR ≈ 0.0114 USD',
    why: [['cap', 'Indian-aligned syllabus, taught in English'], ['sun', 'A tropical island setting'], ['target', 'An emerging option — extra due diligence needed']],
    know: 'Usually connects via Singapore or Kuala Lumpur. The US dollar is the local currency, so budget in dollars.'
  },
  'central-america': {
    name: 'Central America', page: 'mbbs-in-central-america.html', explore: false,
    n: null, flightText: 'Ask a counsellor', climate: 'Tropical'
  }
};

// WhatsApp link builder: uses the shared one in tools.js (MO.wa); falls back to a plain link if tools.js did not load.
function waLink(message) {
  if (typeof MO !== 'undefined' && MO.wa) return MO.wa(message);
  return 'https://wa.me/919360859919?text=' + encodeURIComponent(message);
}

document.addEventListener('DOMContentLoaded', function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(id) { return document.getElementById(id); }
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }

  /* ================= 1. FILTER CHIPS ================= */
  var cards = Array.prototype.slice.call(document.querySelectorAll('.dest-tile'));
  var chips = document.querySelectorAll('.dest-chip');
  var empty = $('destEmpty');
  each(chips, function (chip) {
    chip.addEventListener('click', function () {
      each(chips, function (c) { c.classList.remove('is-active'); c.setAttribute('aria-pressed', 'false'); });
      chip.classList.add('is-active'); chip.setAttribute('aria-pressed', 'true');
      var key = chip.dataset.filter, shown = 0;
      cards.forEach(function (card) {
        var ok = key === 'all' || (card.dataset.tags || '').split(' ').indexOf(key) !== -1;
        card.hidden = !ok; if (ok) shown++;
      });
      empty.hidden = shown > 0;
    });
  });

  /* ================= 2. COMPARE (max 3) ================= */
  var MAX = 3, selected = [];                       // array of card keys, in the order picked
  var tray = $('compareTray'), trayCount = $('trayCount'), trayNames = $('trayNames'), hint = $('destHint');
  var panel = $('comparePanel'), grid = $('compareGrid'), wa = $('compareWhatsApp');
  var HINT_DEFAULT = hint.textContent;

  function cardByKey(k) { return cards.filter(function (c) { return c.dataset.key === k; })[0]; }
  function setPressed(card, on) {
    var b = card.querySelector('.dest-cmp');
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.querySelector('.dest-cmp__label').textContent = on ? 'Added' : 'Compare';
    card.classList.toggle('is-picked', on);
  }
  function refresh() {
    trayCount.textContent = selected.length + ' selected';
    trayNames.textContent = selected.map(function (k) { return cardByKey(k).dataset.name; }).join(' · ');
    tray.classList.toggle('is-open', selected.length >= 2);
    hint.textContent = selected.length === 0 ? HINT_DEFAULT
      : selected.length === 1 ? 'One selected — pick one more to compare.'
      : selected.length < MAX ? 'Add one more, or open the comparison.'
      : 'Maximum of ' + MAX + ' reached. Remove one to swap.';
    cards.forEach(function (c) { c.classList.toggle('is-locked', selected.length >= MAX && selected.indexOf(c.dataset.key) === -1); });
  }
  cards.forEach(function (card) {
    card.querySelector('.dest-cmp').addEventListener('click', function () {
      var k = card.dataset.key, i = selected.indexOf(k);
      if (i === -1) { if (selected.length >= MAX) { shake(card); return; } selected.push(k); }
      else selected.splice(i, 1);
      setPressed(card, selected.indexOf(k) !== -1);
      refresh();
    });
  });
  function shake(card) { card.classList.remove('is-shake'); void card.offsetWidth; card.classList.add('is-shake'); }

  function clearAll() {
    selected.forEach(function (k) { setPressed(cardByKey(k), false); });
    selected = []; refresh(); closePanel();
  }
  $('trayClear').addEventListener('click', clearAll);
  $('comparePanelClear').addEventListener('click', clearAll);

  // Rows: [label, how to read it, which value wins]
  function flightOf(k) { var d = TRAVEL[k]; if (d && d.t) return '~' + d.t[0] + (d.t[1] ? '–' + d.t[1] : '') + ' hrs'; return (d && d.flightText) || 'Ask a counsellor'; }
  var ROWS = [
    ['Tuition (full course)', function (c) { return c.dataset.fee; },      function (c) { return parseFloat(c.dataset.low); }, 'Lowest fee'],
    ['Course length',         function (c) { return c.dataset.duration; }, null],
    ['Living cost / month',   function (c) { return c.dataset.living; },   null],
    ['Climate',               function (c) { return (TRAVEL[c.dataset.key] || {}).climate || '—'; }, null],
    ['Flight from Chennai',   function (c) { return flightOf(c.dataset.key); }, function (c) { var d = TRAVEL[c.dataset.key]; return d && d.n ? d.n : NaN; }, 'Shortest']
  ];
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  function openPanel() {
    var chosen = selected.map(cardByKey);
    var n = chosen.length, html = '';
    grid.style.setProperty('--n', n);
    html += '<div class="cmp__row cmp__row--head" role="row"><span class="cmp__label" role="presentation"></span>' +
      chosen.map(function (c) { return '<span class="cmp__head" role="columnheader">' + esc(c.dataset.name) + '</span>'; }).join('') + '</div>';
    ROWS.forEach(function (r) {
      var best = null;
      if (r[2]) {
        var nums = chosen.map(r[2]).filter(function (v) { return !isNaN(v); });
        if (nums.length >= 2) { var m = Math.min.apply(null, nums); if (nums.filter(function (v) { return v === m; }).length === 1) best = m; }
      }
      html += '<div class="cmp__row" role="row"><span class="cmp__label" role="rowheader">' + r[0] + '</span>' +
        chosen.map(function (c) {
          var isBest = best !== null && r[2](c) === best;
          return '<span class="cmp__cell' + (isBest ? ' is-best' : '') + '" role="cell">' + esc(r[1](c)) + (isBest ? '<em>' + r[3] + '</em>' : '') + '</span>';
        }).join('') + '</div>';
    });
    grid.innerHTML = html;
    var names = chosen.map(function (c) { return c.dataset.name; });
    wa.href = waLink('Hi Mathura Overseas, I’m comparing ' + names.join(', ').replace(/, ([^,]*)$/, ' and $1') + '. Can a counsellor guide me?');
    panel.classList.add('is-open'); document.body.classList.add('cmp-open');
    $('comparePanelClose').focus();
  }
  function closePanel() { panel.classList.remove('is-open'); document.body.classList.remove('cmp-open'); }
  $('trayCompareBtn').addEventListener('click', openPanel);
  $('comparePanelClose').addEventListener('click', closePanel);
  panel.addEventListener('click', function (e) { if (e.target === panel) closePanel(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePanel(); });

  /* ================= 3. FLY THE ROUTE (one country at a time) ================= */
  var route = $('route');
  if (!route) return;
  var rChips = route.querySelectorAll('.route-chip');
  var motion = $('routeMotion'), plane = $('routePlane');
  var timeEl = $('routeTime'), tick = null, started = false;
  var MAX_HRS = 24;                                  // the meter is "share of a 24-hour journey"

  function countUp(d) {
    if (tick) cancelAnimationFrame(tick);
    var a = d.t[0], b = d.t[1], t0 = null, dur = 900;
    function text(p) { return '~' + Math.round(a * p) + (b ? '–' + Math.round(b * p) : ''); }
    if (reduce) { timeEl.textContent = text(1); return; }
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3);
      timeEl.textContent = text(e);
      if (p < 1) tick = requestAnimationFrame(step);
    }
    tick = requestAnimationFrame(step);
  }

  function show(key) {
    var d = TRAVEL[key]; if (!d || d.explore === false) return;
    each(rChips, function (c) {
      var on = c.dataset.dest === key;
      c.classList.toggle('is-active', on); c.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    $('routeName').textContent = d.name;
    $('routeStop').textContent = d.stop;
    $('routeMeter').style.setProperty('--fill', Math.round(d.n / MAX_HRS * 100));
    each(route.querySelectorAll('[data-f]'), function (el) { el.textContent = d[el.dataset.f]; });
    $('routeWhyTitle').textContent = 'Why students pick ' + d.name;
    $('routeWhy').innerHTML = d.why.map(function (w) {
      return '<li><span class="icon-badge icon-badge--sm icon-badge--blue"><svg class="icon" aria-hidden="true"><use href="#i-' + w[0] + '"></use></svg></span><span>' + esc(w[1]) + '</span></li>';
    }).join('');
    $('routeKnow').textContent = d.know;
    $('routeGo').firstChild.nodeValue = 'See MBBS in ' + d.name + ' ';
    $('routeGo').href = d.page;
    $('routeAsk').href = waLink('Hi Mathura Overseas, I’d like to know more about MBBS in ' + d.name + '.');
    countUp(d);
    // Restart the draw-in / fade-in animations
    route.classList.remove('is-swap'); void route.offsetWidth; route.classList.add('is-swap');
    if (!reduce && motion && motion.beginElement) { plane.setAttribute('opacity', '1'); motion.beginElement(); }
  }
  each(rChips, function (c) { c.addEventListener('click', function () { show(c.dataset.dest); }); });

  // Play the first route when the card scrolls into view
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting && !started) { started = true; io.disconnect(); show('vietnam'); } }, { threshold: 0.25 });
    io.observe(route);
  } else { show('vietnam'); }
});
