// universities.js — the Universities page (mbbs-universities.html) only.
// Nothing to edit here when you add a university: the cards come from _data/universities.yml.
//
// What it does:
//   1. Search box, country chips and the "Full fee structure" chip filter the cards together.
//   2. Groups with no matching card hide themselves; if nothing matches, a friendly "ask us" box appears.
//      Countries with more than three universities open with three and a "Show all" button.
//   3. The address bar remembers the filter, so a link like  mbbs-universities.html?country=russia
//      or  mbbs-universities.html?q=kazan  opens the page already filtered (handy from country pages and WhatsApp).
//   4. WhatsApp buttons get their ready-made message.
//   5. The "a year, all-in" bars in the hero are sized from each country's yearly cost.

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

  // Hero cost list: tap a country to filter and jump to its universities
  each(document.querySelectorAll('[data-udir-country-set]'), function (b) {
    b.addEventListener('click', function () {
      state.country = b.dataset.udirCountrySet; state.q = ''; if (input) input.value = '';
      apply();
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
