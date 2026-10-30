// destinations.js — the Countries page (destinations.html) only. Two parts:
//   A. "Fly the route from Chennai": the country explorer. Its data is written into the page from
//      _data/countries.yml (the <script id="countryData"> block), so there is NOTHING to edit in this file
//      when a country, fare or exchange rate changes. Edit _data/countries.yml instead.
//   B. The universities: search box, country chips and the "Full fee structure" chip filter the cards
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
    meter.style.setProperty('--fill', Math.max(6, Math.min(100, Math.round((+c.hours_num || 0) / DAY * 100))));
    document.getElementById('routeWhy').innerHTML = (c.why || []).map(function (w) {
      return '<li><span class="route__tick"><svg class="icon" aria-hidden="true"><use href="#i-check"></use></svg></span><span>' + esc(w) + '</span></li>';
    }).join('');
    document.getElementById('routeGo').href = c.page;
    document.getElementById('routeCmp').href = 'mbbs-abroad-planner.html?cmp=' + encodeURIComponent(c.planner || c.slug) + '#compare';
    if (animate === false) { timeEl.textContent = c.hours; return; }
    countUp(c.hours);
    route.classList.remove('is-swap'); void route.offsetWidth; route.classList.add('is-swap');
    if (!reduce && motion && motion.beginElement) { plane.setAttribute('opacity', '1'); motion.beginElement(); }
  }

  each(chips, function (b) { b.addEventListener('click', function () { show(b.dataset.dest); }); });

  // "Its universities": filter the list below to this country and scroll to it
  var unis = document.getElementById('routeUnis');
  if (unis) unis.addEventListener('click', function () { if (window.MO_showUniversities) window.MO_showUniversities(current); });

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
      if (en[0].isIntersecting && !started) { started = true; io.disconnect(); show(current); }
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
  var pageBtn = $('[data-udir-page]');
  var input = $('#udirQ');
  var clearQ = $('#udirClearQ');
  var empty = $('#udirEmpty');
  var status = $('#udirStatus');
  var results = $('#results');
  var bar = $('.udir-bar');
  if (!cards.length) return;

  var names = {};   // country slug -> display name (read from the chips)
  each(countryBtns, function (b) { names[b.dataset.udirCountry] = b.textContent.trim(); });

  var state = { country: 'all', q: '', pageOnly: false };

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
               (!state.pageOnly || c.hasAttribute('data-has-page')) &&
               words.every(function (w) { return c._hay.indexOf(w) !== -1; });
      c.hidden = !ok;
      if (ok) any = true;
    });
    each(groups, function (g) { g.hidden = !g.querySelector('.udir-card:not([hidden])'); });

    // Long countries open with three cards + "Show all"; while searching or filtering, every match shows
    var filtering = state.country !== 'all' || !!state.q || state.pageOnly;
    each(groups, function (g) {
      g.classList.toggle('is-collapsed', !!g.querySelector('[data-udir-more]') && !filtering && !g._open);
    });
    if (empty) empty.hidden = any;
    var askStrip = $('.udir-ask');            // the empty box already asks, so don't repeat it
    if (askStrip) askStrip.hidden = !any;

    each(countryBtns, function (b) { b.setAttribute('aria-pressed', b.dataset.udirCountry === state.country ? 'true' : 'false'); });
    if (pageBtn) pageBtn.setAttribute('aria-pressed', state.pageOnly ? 'true' : 'false');
    if (clearQ) clearQ.hidden = !state.q;

    // The empty-state WhatsApp button carries what the visitor typed
    var ask = $('#udirAskEmpty');
    if (ask) ask.href = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent('Hi Mathura Overseas, can you check a university for me? The university is: ' + state.q);

    // Status line in words (never a count)
    if (status) {
      var parts = [];
      if (state.country !== 'all') parts.push('in ' + names[state.country]);
      if (state.pageOnly) parts.push('with a full fee structure page');
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
      if (state.pageOnly) p.set('fees', '1');
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
  // "Full fee structure" chip
  if (pageBtn) pageBtn.addEventListener('click', function () { state.pageOnly = !state.pageOnly; apply('chip'); });

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
      state = { country: 'all', q: '', pageOnly: false }; if (input) input.value = ''; apply('chip');
    });
  });

  // Used by the flight explorer's "Its universities" button
  window.MO_showUniversities = function (slug) {
    state = { country: names[slug] ? slug : 'all', q: '', pageOnly: false };
    if (input) input.value = '';
    apply();
    var wrap = document.getElementById('universities');
    if (wrap) wrap.scrollIntoView({ behavior: 'smooth' });
  };

  // Start from the address bar, e.g. ?country=georgia or ?q=ksma
  var params = new URLSearchParams(location.search);
  if (params.get('country') && names[params.get('country')]) state.country = params.get('country');
  if (params.get('q')) { state.q = params.get('q'); if (input) input.value = state.q; }
  if (params.get('fees') === '1') state.pageOnly = true;
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
