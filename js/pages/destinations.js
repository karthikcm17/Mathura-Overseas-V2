// destinations.js — the Countries page (destinations.html) only.
// The page works in two steps, like an app:
//   Step 1  the country tiles.  Tapping one opens…
//   Step 2  that country's universities (destinations.html#russia).
// Each step has its own address, so the phone's Back button returns from a country to the tiles,
// and a link such as  destinations.html#vietnam  opens Vietnam straight away.
// Typing in the hero search box shows matching universities from every country.
// There is NOTHING to edit here when a country or university changes: edit _data/countries.yml
// and _data/universities.yml — the page is built from them.
// Older links still work:  ?country=georgia  opens Georgia,  ?q=kazan  starts a search.

document.addEventListener('DOMContentLoaded', function () {
  var WA_NUMBER = '919360859919';
  var root = document.querySelector('.dx');
  if (!root) return;

  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  function $(id) { return document.getElementById(id); }
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var countries = {};                       // slug -> its <section class="dx-country">
  each(root.querySelectorAll('.dx-country'), function (s) { countries[s.dataset.country] = s; });
  var stepCountries = $('dxCountries'), stepUnis = $('dxUnis');
  var input = $('dxQ'), clearQ = $('dxClearQ'), status = $('dxStatus'), empty = $('dxEmpty');
  var back = $('dxBack'), barTitle = $('dxBarTitle'), step1 = $('dxStep1'), step2 = $('dxStep2');
  var rows = root.querySelectorAll('.dx-uni');

  // From here on the steps hide and show (without the script everything stays visible)
  root.classList.add('js-steps');

  var state = { view: 'countries', country: null, q: '' };
  var openedFromTiles = false;              // true when this visit tapped a tile (so "Countries" can simply go back)
  var lastTile = null;                      // the tile to return to

  /* ---------- small helpers ---------- */
  function nameOf(slug) {
    var h = countries[slug] && countries[slug].querySelector('.dx-country__open');
    return h ? h.textContent.trim() : '';
  }
  // A country always opens at its top. Going back to the tiles only scrolls if the visitor is below them.
  function scrollToStep(el) {
    var top = root.getBoundingClientRect().top + window.pageYOffset - headerBottom();
    if (el === stepUnis || window.pageYOffset > top) window.scrollTo({ top: top, behavior: reduce ? 'auto' : 'smooth' });
  }
  // How much of the screen the header (and, on computers, the announcement bar) covers right now
  function headerBottom() {
    var h = document.querySelector('.app-header');
    return h ? Math.max(0, h.getBoundingClientRect().bottom) : 0;
  }
  function jumpToSteps() {
    window.scrollTo(0, root.getBoundingClientRect().top + window.pageYOffset - headerBottom());
  }
  function enter(el) {
    if (reduce) return;
    el.classList.remove('is-enter'); void el.offsetWidth; el.classList.add('is-enter');
  }
  function norm(s) {                        // lower-case, no accents: "catolica" finds "Católica"
    s = (s || '').toLowerCase();
    if (s.normalize) s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
    return s.replace(/\s+/g, ' ').trim();
  }
  each(rows, function (r) { r._hay = norm(r.dataset.search); });

  /* ---------- the flight card: count the hours up, draw the line, fly the plane ---------- */
  var tick = null;
  function playFlight(section) {
    var fly = section.querySelector('.dx-fly');
    if (!fly) return;
    var num = fly.querySelector('.dx-fly__num'), text = num.dataset.hours;
    fly.classList.remove('is-play'); void fly.offsetWidth; fly.classList.add('is-play');
    if (reduce) return;
    var motion = fly.querySelector('animateMotion'), plane = fly.querySelector('.dx-fly__plane');
    if (motion && motion.beginElement) { plane.setAttribute('opacity', '1'); motion.beginElement(); }
    var nums = String(text).match(/\d+(\.\d+)?/g);
    if (!nums) return;
    if (tick) cancelAnimationFrame(tick);
    var t0 = null;
    function step(ts) {                     // "~10" counts 0…10; "9–10" counts both numbers together
      if (t0 === null) t0 = ts;
      var p = Math.min((ts - t0) / 900, 1), e = 1 - Math.pow(1 - p, 3), i = 0;
      num.textContent = String(text).replace(/\d+(\.\d+)?/g, function (n) {
        var v = parseFloat(nums[i++]) * e; return n.indexOf('.') > -1 ? v.toFixed(1) : Math.round(v);
      });
      if (p < 1) tick = requestAnimationFrame(step); else num.textContent = text;
    }
    tick = requestAnimationFrame(step);
  }

  /* ---------- draw the current state ---------- */
  function render(how) {
    var v = state.view;
    root.classList.toggle('is-step1', v === 'countries');
    root.classList.toggle('is-step2', v === 'country');
    root.classList.toggle('is-search', v === 'search');

    // Step bar
    back.hidden = v === 'countries';
    back.querySelector('span').textContent = v === 'search' ? 'Clear' : 'Countries';
    barTitle.textContent = v === 'country' ? nameOf(state.country)
                         : v === 'search' ? 'Search results' : 'Choose a country';
    step1.classList.toggle('is-on', v === 'countries');
    step1.classList.toggle('is-done', v !== 'countries');
    step2.classList.toggle('is-on', v !== 'countries');

    if (v === 'country') {
      each(root.querySelectorAll('.dx-country'), function (s) { s.classList.toggle('is-active', s.dataset.country === state.country); });
      each(rows, function (r) { r.hidden = false; });
      status.hidden = true; empty.hidden = true;
      document.title = 'MBBS in ' + nameOf(state.country) + ': Universities | Mathura Overseas';
      if (how !== 'quiet') { enter(stepUnis); scrollToStep(stepUnis); playFlight(countries[state.country]); }
    } else if (v === 'search') {
      search();
    } else {
      status.hidden = true; empty.hidden = true;
      document.title = 'MBBS Abroad Countries & Universities | Mathura Overseas';
      if (how !== 'quiet') {
        enter(stepCountries);
        // Back from a country: return to its tile instead of the top of the page
        if (lastTile && how === 'back') {
          var r = lastTile.getBoundingClientRect();
          window.scrollBy({ top: r.top - window.innerHeight / 3, behavior: 'auto' });
          lastTile.focus({ preventScroll: true });
        } else if (how === 'user') { scrollToStep(stepCountries); }
      }
    }
  }

  /* ---------- search across every country ---------- */
  function search() {
    var words = norm(state.q).split(' ').filter(Boolean), any = false;
    each(rows, function (r) {
      var ok = words.every(function (w) { return r._hay.indexOf(w) !== -1; });
      r.hidden = !ok; if (ok) any = true;
    });
    each(root.querySelectorAll('.dx-country'), function (s) {
      s.classList.toggle('is-match', !!s.querySelector('.dx-uni:not([hidden])'));
      s.classList.remove('is-active');
    });
    status.hidden = !any;
    status.textContent = 'Universities matching “' + state.q + '”';
    empty.hidden = any;
    $('dxAskEmpty').href = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent('Hi Mathura Overseas, can you check a university for me? The university is: ' + state.q);
  }

  /* ---------- the address bar is the single source of truth ---------- */
  function readHash() {
    var h = decodeURIComponent(location.hash.replace('#', ''));
    return countries[h] ? h : null;
  }
  function fromHash(how) {
    var slug = readHash();
    if (state.view === 'search' && !slug) return;          // typing a search doesn't change the hash
    state.country = slug;
    state.view = slug ? 'country' : 'countries';
    if (slug) state.q = '';
    if (input && slug) { input.value = ''; clearQ.hidden = true; }
    render(how);
  }
  window.addEventListener('hashchange', function () { fromHash(state.view === 'country' && !readHash() ? 'back' : 'user'); });

  function openCountry(slug, tile) {
    lastTile = tile || lastTile;
    openedFromTiles = !!tile;
    before = null;
    state.q = ''; if (input) { input.value = ''; clearQ.hidden = true; }
    if (location.hash === '#' + slug) { state.view = 'country'; state.country = slug; render('user'); }
    else location.hash = slug;                               // adds a history step → Back returns to the tiles
  }
  function showCountries() {
    if (openedFromTiles && state.view === 'country') { history.back(); return; }
    openedFromTiles = false;
    state.view = 'countries'; state.q = '';
    if (input) { input.value = ''; clearQ.hidden = true; }
    if (location.hash) history.pushState(null, '', location.pathname + location.search);
    render('back');
  }

  // Tiles and "open this country" links (also the slim headings in search results)
  each(root.querySelectorAll('[data-open]'), function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      openCountry(a.dataset.open, a.classList.contains('dx-tile') ? a : null);
    });
  });
  back.addEventListener('click', function () {
    if (state.view === 'search') { clearSearch(); return; }
    showCountries();
  });
  each(root.querySelectorAll('[data-dx-reset]'), function (b) { b.addEventListener('click', clearSearch); });

  /* ---------- search box ---------- */
  var before = null, t;                    // where the visitor was before searching, to return there
  function clearSearch() {
    if (input) input.value = '';
    clearQ.hidden = true; state.q = '';
    var go = before || { view: 'countries', country: null }; before = null;
    state.view = go.view; state.country = go.country;
    render('quiet');
  }
  if (input) {
    input.addEventListener('input', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        var q = input.value.trim();
        clearQ.hidden = !q;
        if (!q) { clearSearch(); return; }
        if (state.view !== 'search') before = { view: state.view, country: state.country };
        state.q = q; state.view = 'search';
        render('quiet');
      }, 140);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); scrollToStep(stepUnis); }
    });
  }
  clearQ.addEventListener('click', function () { clearSearch(); input.focus(); });

  /* ---------- sort the tiles ---------- */
  var tilesBox = $('dxTiles');
  var tiles = Array.prototype.slice.call(tilesBox.querySelectorAll('.dx-tile'));
  each(root.querySelectorAll('[data-sort]'), function (b) {
    b.addEventListener('click', function () {
      var key = b.dataset.sort;
      tiles.slice().sort(function (x, y) { return (+x.dataset[key]) - (+y.dataset[key]) || (+x.dataset.order) - (+y.dataset.order); })
        .forEach(function (el) { tilesBox.appendChild(el); });
      each(root.querySelectorAll('[data-sort]'), function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
      enter(tilesBox);
    });
  });

  /* ---------- WhatsApp buttons with a ready-made message ---------- */
  each(document.querySelectorAll('[data-wa]'), function (a) {
    a.href = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(a.dataset.wa);
    a.target = '_blank'; a.rel = 'noopener';
  });
  var askEmpty = $('dxAskEmpty'); askEmpty.target = '_blank'; askEmpty.rel = 'noopener';

  /* ---------- start ---------- */
  var params = new URLSearchParams(location.search);
  var pc = params.get('country');
  if (pc && countries[pc] && !readHash()) history.replaceState(null, '', location.pathname + '#' + pc);
  if (params.get('q') && input) {
    input.value = params.get('q'); clearQ.hidden = false;
    state.q = input.value; state.view = 'search'; render('quiet');
  } else {
    fromHash('quiet');
    if (state.view === 'country') {
      // Arriving on a country link: bring its block into view and play the flight once it is on screen
      jumpToSteps();
      playFlight(countries[state.country]);
    } else if (location.hash === '#universities') {
      jumpToSteps();
    }
  }
});
