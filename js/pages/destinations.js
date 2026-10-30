// destinations.js — the Countries page (destinations.html) only. Two parts:
//   A. "Fly the route from Chennai": the country explorer. Its data is written into the page from
//      _data/countries.yml (the <script id="countryData"> block), so there is NOTHING to edit in this file
//      when a country, fare or exchange rate changes. Edit _data/countries.yml instead.
//   B. The universities: the search box and the country chips filter the cards
//      built from _data/universities.yml. Countries with more than three universities open with three
//      and a "Show all" button. The address bar remembers the filter, so a link like
//      destinations.html?country=russia  or  destinations.html?q=kazan  opens the page already filtered.
// Comparing countries side by side lives in ONE place: the MBBS Planner (mbbs-abroad-planner.html#compare).

/* ======================= A. FLY THE ROUTE ======================= */
document.addEventListener('DOMContentLoaded', function () {
  var route = document.getElementById('route');
  var dataEl = document.getElementById('countryData');
  if (!route || !dataEl) return;
  var COUNTRIES = [];
  try { COUNTRIES = JSON.parse(dataEl.textContent); } catch (e) { return; }
  var bySlug = {};
  COUNTRIES.forEach(function (c) { bySlug[c.slug] = c; });

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  var chips = route.querySelectorAll('.route-chip');
  var motion = document.getElementById('routeMotion'), plane = document.getElementById('routePlane');
  var meter = document.getElementById('routeMeter'), timeEl = document.getElementById('routeTime');
  var current = COUNTRIES.length ? COUNTRIES[0].slug : null, tick = null;
  var DAY = 24;   // the bar shows the flight as a share of a 24-hour day

  // The flight time counts up: "~10" → 0…10, "9–10" → both numbers together
  function countUp(text) {
    if (tick) cancelAnimationFrame(tick);
    var nums = String(text).match(/\d+(\.\d+)?/g);
    if (reduce || !nums) { timeEl.textContent = text; return; }
    var t0 = null;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min((ts - t0) / 900, 1), e = 1 - Math.pow(1 - p, 3), i = 0;
      timeEl.textContent = String(text).replace(/\d+(\.\d+)?/g, function (n) {
        var v = parseFloat(nums[i++]) * e; return n.indexOf('.') > -1 ? v.toFixed(1) : Math.round(v);
      });
      if (p < 1) tick = requestAnimationFrame(step);
    }
    tick = requestAnimationFrame(step);
  }

  function show(slug, animate) {
    var c = bySlug[slug]; if (!c) return;
    current = slug;
    each(chips, function (b) { b.setAttribute('aria-pressed', b.dataset.dest === slug ? 'true' : 'false'); });
    each(route.querySelectorAll('[data-r]'), function (el) { if (el.id !== 'routeTime') el.textContent = c[el.dataset.r] == null ? '' : c[el.dataset.r]; });
    // Optional values: a country without a single flight time (the Caribbean) hides the bar, etc.
    document.getElementById('routeUnit').textContent = c.hours_unit == null ? 'hrs' : c.hours_unit;
    document.getElementById('routeMeterWrap').classList.toggle('is-off', !c.hours_num);
    if (c.hours_num) meter.style.setProperty('--fill', Math.max(6, Math.min(100, Math.round(+c.hours_num / DAY * 100))));
    document.getElementById('routeFareDate').hidden = !c.fare_as_of;
    document.getElementById('routeFareLabel').textContent = c.fare_label || 'Lowest fare, one-way';
    document.getElementById('routeWhy').innerHTML = (c.why || []).map(function (w) {
      return '<li><span class="route__tick"><svg class="icon" aria-hidden="true"><use href="#i-check"></use></svg></span><span>' + esc(w) + '</span></li>';
    }).join('');
    document.getElementById('routeGo').href = c.page;
    var cmp = document.getElementById('routeCmp');
    cmp.hidden = c.planner === false;                  // planner: false → the Planner doesn't have this country yet
    if (c.planner !== false) cmp.href = 'mbbs-abroad-planner.html?cmp=' + encodeURIComponent(c.planner || c.slug) + '#compare';
    if (animate === false) { timeEl.textContent = c.hours; return; }
    countUp(c.hours);
    route.classList.remove('is-swap'); void route.offsetWidth; route.classList.add('is-swap');
    if (!reduce && motion && motion.beginElement) { plane.setAttribute('opacity', '1'); motion.beginElement(); }
  }

  each(chips, function (b) { b.addEventListener('click', function () { show(b.dataset.dest); }); });

  // "Its universities": filter the list below to this country and scroll to it
  var unis = document.getElementById('routeUnis');
  //  A country with no universities in _data/universities.yml (e.g. the Caribbean, whose page keeps its own school list)
  //  goes to its country page instead.
  if (unis) unis.addEventListener('click', function () {
    if (document.querySelector('[data-udir-group="' + current + '"]') && window.MO_showUniversities) window.MO_showUniversities(current);
    else location.href = bySlug[current].page + '#universities';
  });

  // Phones: the chips are a swipe row. Keep the tapped chip in view, hide the "Swipe" hint after the first swipe,
  // and nudge the row once when the card first appears, so visitors see that it moves.
  var chipRow = document.getElementById('routeChips'), chipWrap = document.getElementById('routeChipsWrap'), nudging = false;
  function isPhone() { return chipRow && chipRow.scrollWidth > chipRow.clientWidth + 4; }
  if (chipRow) {
    chipRow.addEventListener('scroll', function () { if (!nudging && chipRow.scrollLeft > 8) chipWrap.classList.add('is-swiped'); }, { passive: true });
    each(chips, function (b) {
      b.addEventListener('click', function () {
        if (!isPhone()) return;
        chipRow.scrollTo({ left: Math.max(0, b.offsetLeft - (chipRow.clientWidth - b.offsetWidth) / 2), behavior: 'smooth' });
      });
    });
  }
  function nudge() {
    if (reduce || !isPhone() || chipWrap.classList.contains('is-swiped')) return;
    nudging = true;
    chipRow.scrollTo({ left: 70, behavior: 'smooth' });
    setTimeout(function () { chipRow.scrollTo({ left: 0, behavior: 'smooth' }); setTimeout(function () { nudging = false; }, 500); }, 650);
  }

  // Hero cost chart: tap a country to fly its route
  each(document.querySelectorAll('[data-route-set]'), function (b) {
    b.addEventListener('click', function () {
      show(b.dataset.routeSet);
      document.getElementById('route-sec').scrollIntoView({ behavior: 'smooth' });
    });
  });

  // Set the first country's bar without animation, then play it when the card scrolls into view
  show(current, false);
  var started = false;
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (en) {
      if (en[0].isIntersecting && !started) { started = true; io.disconnect(); show(current); setTimeout(nudge, 500); }
    }, { threshold: 0.3 });
    io.observe(route);
  }
});

/* ======================= B. UNIVERSITIES ======================= */
document.addEventListener('DOMContentLoaded', function () {
  var WA_NUMBER = '919360859919';
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  function $(sel) { return document.querySelector(sel); }

  var cards = document.querySelectorAll('.udir-card');
  var groups = document.querySelectorAll('[data-udir-group]');
  var countryBtns = document.querySelectorAll('[data-udir-country]');
  var input = $('#udirQ');
  var clearQ = $('#udirClearQ');
  var empty = $('#udirEmpty');
  var status = $('#udirStatus');
  var results = $('#results');
  var bar = $('.udir-bar');
  if (!cards.length) return;

  var names = {};   // country slug -> display name (read from the chips)
  each(countryBtns, function (b) { names[b.dataset.udirCountry] = b.textContent.trim(); });

  var state = { country: 'all', q: '' };

  // Lower-case and strip accents, so "catolica" finds "Católica"
  function norm(s) {
    s = (s || '').toLowerCase();
    if (s.normalize) s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
    return s.replace(/\s+/g, ' ').trim();
  }
  each(cards, function (c) { c._hay = norm(c.dataset.search); });

  function apply(fromUser) {
    var words = norm(state.q).split(' ').filter(Boolean);
    var any = false;

    each(cards, function (c) {
      var ok = (state.country === 'all' || c.dataset.country === state.country) &&
               words.every(function (w) { return c._hay.indexOf(w) !== -1; });
      c.hidden = !ok;
      if (ok) any = true;
    });
    each(groups, function (g) { g.hidden = !g.querySelector('.udir-card:not([hidden])'); });

    // Long countries open with three cards + "Show all"; while searching or filtering, every match shows
    var filtering = state.country !== 'all' || !!state.q;
    each(groups, function (g) {
      g.classList.toggle('is-collapsed', !!g.querySelector('[data-udir-more]') && !filtering && !g._open);
    });
    if (empty) empty.hidden = any;
    var askStrip = $('.udir-ask');            // the empty box already asks, so don't repeat it
    if (askStrip) askStrip.hidden = !any;

    each(countryBtns, function (b) { b.setAttribute('aria-pressed', b.dataset.udirCountry === state.country ? 'true' : 'false'); });
    if (clearQ) clearQ.hidden = !state.q;

    // The empty-state WhatsApp button carries what the visitor typed
    var ask = $('#udirAskEmpty');
    if (ask) ask.href = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent('Hi Mathura Overseas, can you check a university for me? The university is: ' + state.q);

    // Status line in words (never a count)
    if (status) {
      var parts = [];
      if (state.country !== 'all') parts.push('in ' + names[state.country]);
      if (state.q) parts.push('matching “' + state.q + '”');
      status.textContent = !any ? 'No matches yet.'
        : parts.length ? 'Showing universities ' + parts.join(', ') + '.'
        : 'Showing every university, grouped by country.';
    }

    // Keep the filter in the address bar (no page reload)
    if (window.history && history.replaceState) {
      var p = new URLSearchParams();
      if (state.country !== 'all') p.set('country', state.country);
      if (state.q) p.set('q', state.q);
      var qs = p.toString();
      history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
    }

    // After tapping a chip low on the page, bring the top of the results back into view
    if (fromUser === 'chip' && results && bar) {
      var top = results.getBoundingClientRect().top + window.pageYOffset - bar.offsetHeight - 70;
      if (window.pageYOffset > top) window.scrollTo({ top: top, behavior: 'smooth' });
    }
  }

  // Country chips
  each(countryBtns, function (b) {
    b.addEventListener('click', function () { state.country = b.dataset.udirCountry; apply('chip'); });
  });

  // Search box (filters as you type)
  var t;
  if (input) {
    input.addEventListener('input', function () {
      clearTimeout(t);
      t = setTimeout(function () { state.q = input.value.trim(); apply(); }, 120);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); if (results) results.scrollIntoView({ behavior: 'smooth' }); }
    });
  }
  if (clearQ) clearQ.addEventListener('click', function () { input.value = ''; state.q = ''; apply(); input.focus(); });

  // "Try: Cebu, Samarkand…" shortcuts under the search box
  each(document.querySelectorAll('[data-udir-q]'), function (b) {
    b.addEventListener('click', function () {
      input.value = b.dataset.udirQ; state.q = input.value; state.country = 'all'; apply();
      if (results) results.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // "Show all universities in Russia" under a long country
  each(document.querySelectorAll('[data-udir-more]'), function (b) {
    b.addEventListener('click', function () {
      var g = b.closest('[data-udir-group]'); g._open = true; g.classList.remove('is-collapsed');
      var fourth = g.querySelectorAll('.udir-card')[3];
      if (fourth) { var a = fourth.querySelector('a'); if (a) a.focus({ preventScroll: true }); }
    });
  });

  // "Show all universities" in the empty box
  each(document.querySelectorAll('[data-udir-reset]'), function (b) {
    b.addEventListener('click', function () {
      state = { country: 'all', q: '' }; if (input) input.value = ''; apply('chip');
    });
  });

  // Used by the flight explorer's "Its universities" button
  window.MO_showUniversities = function (slug) {
    state = { country: names[slug] ? slug : 'all', q: '' };
    if (input) input.value = '';
    apply();
    var wrap = document.getElementById('universities');
    if (wrap) wrap.scrollIntoView({ behavior: 'smooth' });
  };

  // Start from the address bar, e.g. ?country=georgia or ?q=ksma
  var params = new URLSearchParams(location.search);
  if (params.get('country') && names[params.get('country')]) state.country = params.get('country');
  if (params.get('q')) { state.q = params.get('q'); if (input) input.value = state.q; }
  apply();

  // Hero cost bars: width = this country's yearly cost as a share of the dearest one
  var barEls = document.querySelectorAll('[data-bar-inr]');
  var max = 0;
  each(barEls, function (el) { max = Math.max(max, +el.dataset.barInr || 0); });
  each(barEls, function (el) { if (max) el.style.setProperty('--w', Math.max(8, Math.round(+el.dataset.barInr / max * 100))); });

  // WhatsApp buttons with a ready-made message
  each(document.querySelectorAll('[data-wa]'), function (a) {
    if (a.id === 'udirAskEmpty') return;   // set by apply() so it includes the search text
    a.href = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(a.dataset.wa);
    a.target = '_blank'; a.rel = 'noopener';
  });
  var askEmpty = $('#udirAskEmpty');
  if (askEmpty) { askEmpty.target = '_blank'; askEmpty.rel = 'noopener'; }
});
