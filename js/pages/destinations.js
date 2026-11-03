// destinations.js — the Countries page (destinations.html) only.
// The page works in two steps, like an app:
//   Step 1  the country tiles. The hero shows a route map: a plane flies from Chennai to each country in turn.
//   Step 2  tap a tile: the hero becomes that country's hero (its flight, "Get my free shortlist", "Explore …")
//           and its universities show below. The address becomes destinations.html#russia.
// Each step has its own address, so the phone's Back button returns from a country to the tiles,
// and a link such as  destinations.html#vietnam  opens Vietnam straight away (?country=vietnam works too).
// There is NOTHING to edit here when a country or university changes: edit _data/countries.yml
// and _data/universities.yml — the page is built from them.

document.addEventListener('DOMContentLoaded', function () {
  var WA_NUMBER = '919360859919';
  var root = document.querySelector('.dx');
  var hero = document.getElementById('dxHero');
  if (!root || !hero) return;

  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  function $(id) { return document.getElementById(id); }
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Country data, written into the page from _data/countries.yml
  var COUNTRIES = [];
  try { COUNTRIES = JSON.parse($('countryData').textContent); } catch (e) { COUNTRIES = []; }
  var bySlug = {};
  COUNTRIES.forEach(function (c) { bySlug[c.slug] = c; });

  var sections = {};                       // slug -> its <section class="dx-country"> (only countries with universities)
  each(root.querySelectorAll('.dx-country'), function (s) { sections[s.dataset.country] = s; });

  var stepCountries = $('dxCountries'), stepUnis = $('dxUnis');
  var back = $('dxBack'), barTitle = $('dxBarTitle'), step1 = $('dxStep1'), step2 = $('dxStep2');
  var faceHome = $('dxHeroHome'), faceCountry = $('dxHeroCountry');

  // From here on the steps hide and show (without the script everything stays visible)
  root.classList.add('js-steps');

  var state = { view: 'countries', country: null };
  var openedFromTiles = false;             // this visit tapped a tile, so "Countries" can simply go back
  var lastTile = null;                     // the tile to return to

  function enter(el) {
    if (reduce) return;
    el.classList.remove('is-enter'); void el.offsetWidth; el.classList.add('is-enter');
  }
  function smooth() { return reduce ? 'auto' : 'smooth'; }

  /* =====================================================================
     The plane: moves along an SVG line, nose pointing the way it flies.
     ===================================================================== */
  function flyAlong(path, plane, ms, done) {
    if (reduce || !path.getTotalLength) { plane.setAttribute('opacity', '0'); if (done) done(); return null; }
    var len = path.getTotalLength(), t0 = null, job = { stop: false };
    plane.setAttribute('opacity', '1');
    function frame(ts) {
      if (job.stop) return;
      if (t0 === null) t0 = ts;
      var p = Math.min((ts - t0) / ms, 1), e = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      var a = path.getPointAtLength(e * len), b = path.getPointAtLength(Math.min(len, e * len + 1));
      var ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
      plane.setAttribute('transform', 'translate(' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) + ') rotate(' + ang.toFixed(1) + ')');
      if (p < 1) requestAnimationFrame(frame); else if (done) done();
    }
    requestAnimationFrame(frame);
    return job;
  }

  /* =====================================================================
     FACE 1 — route map. One faint arc per country (fanned out from Chennai),
     then the plane flies each one in turn while the ticket line updates.
     ===================================================================== */
  var NS = 'http://www.w3.org/2000/svg';
  var arcsBox = $('dxTourArcs'), live = $('dxTourLive'), tourPlane = $('dxTourPlane');
  var tourTo = $('dxTourTo'), tourHrs = $('dxTourHrs');
  var ORIGIN = { x: 40, y: 178 };
  var stops = COUNTRIES.filter(function (c) { return c.hours_num && c.airport; });   // the Caribbean has no single route
  var stopEls = [];

  stops.forEach(function (c, i) {
    // Spread the destinations over two rings to the upper right, alternating, so no two names touch
    // (a picture of "far away", not a real map)
    var n = Math.max(stops.length - 1, 1);
    var ang = (80 - i * (72 / n)) * Math.PI / 180, ring = i % 2 ? 0.7 : 1;
    var x = ORIGIN.x + 450 * ring * Math.cos(ang), y = ORIGIN.y - 165 * ring * Math.sin(ang);
    var mx = (ORIGIN.x + x) / 2, my = (ORIGIN.y + y) / 2;
    var lift = 0.28 * Math.hypot(x - ORIGIN.x, y - ORIGIN.y);
    var d = 'M' + ORIGIN.x + ',' + ORIGIN.y + ' Q' + (mx - lift * 0.35).toFixed(1) + ',' + Math.max(4, my - lift).toFixed(1) + ' ' + x.toFixed(1) + ',' + y.toFixed(1);
    var arc = document.createElementNS(NS, 'path');
    arc.setAttribute('class', 'dx-tour__arc'); arc.setAttribute('d', d);
    arcsBox.appendChild(arc);
    var g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'dx-tour__stop');
    var dot = document.createElementNS(NS, 'circle');
    dot.setAttribute('class', 'dx-tour__dest'); dot.setAttribute('cx', x.toFixed(1)); dot.setAttribute('cy', y.toFixed(1)); dot.setAttribute('r', '4.5');
    var code = document.createElementNS(NS, 'text');
    code.setAttribute('class', 'dx-tour__code'); code.textContent = c.airport;
    code.setAttribute('x', (x + 8).toFixed(1)); code.setAttribute('y', (y + 4).toFixed(1));
    if (x > 470) { code.setAttribute('x', (x - 8).toFixed(1)); code.setAttribute('text-anchor', 'end'); code.setAttribute('y', (y - 9).toFixed(1)); }
    g.appendChild(dot); g.appendChild(code); arcsBox.appendChild(g);
    stopEls.push({ c: c, d: d, g: g });
  });

  var tourI = -1, tourTimer = null, tourJob = null, heroOnScreen = true;
  function hoursText(c) { return c.hours + (c.hours_unit == null ? ' hrs' : (c.hours_unit ? ' ' + c.hours_unit : '')); }
  function tourStep() {
    if (!stopEls.length) return;
    tourI = (tourI + 1) % stopEls.length;
    var s = stopEls[tourI];
    stopEls.forEach(function (o) { o.g.classList.toggle('is-on', o === s); });
    live.setAttribute('d', s.d);
    live.classList.remove('is-draw'); void live.getBoundingClientRect(); live.classList.add('is-draw');
    tourTo.innerHTML = '<b>' + s.c.airport + '</b>' + s.c.city;
    tourHrs.textContent = hoursText(s.c) + ' · ' + s.c.stops;
    [tourTo, tourHrs].forEach(function (el) { el.classList.remove('is-swap'); void el.offsetWidth; el.classList.add('is-swap'); });
    if (tourJob) tourJob.stop = true;
    tourJob = flyAlong(live, tourPlane, 1700);
  }
  function tourPlay() {
    if (tourTimer || !stopEls.length || state.view !== 'countries' || !heroOnScreen || document.hidden) return;
    tourStep();
    if (!reduce) tourTimer = setInterval(tourStep, 3400);
  }
  function tourPause() { clearInterval(tourTimer); tourTimer = null; }
  // Save battery: only animate while the hero is on screen and the tab is open
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      heroOnScreen = en[0].isIntersecting;
      if (heroOnScreen) tourPlay(); else tourPause();
    }, { threshold: 0.15 }).observe(hero);
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) tourPause(); else tourPlay(); });

  /* =====================================================================
     FACE 2 — one country's hero: flight, "free shortlist" chat button, "Explore" guide link
     ===================================================================== */
  var fly = $('dxFly'), flyPath = $('dxFlyPath'), flyPlane = $('dxFlyPlane');
  var flyNum = $('dxFlyNum'), tick = null, flyJob = null;

  function countUp(text) {               // "~10" counts 0…10; "9–10" counts both numbers together
    if (tick) cancelAnimationFrame(tick);
    var nums = String(text).match(/\d+(\.\d+)?/g);
    if (reduce || !nums) { flyNum.textContent = text; return; }
    var t0 = null;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min((ts - t0) / 1100, 1), e = 1 - Math.pow(1 - p, 3), i = 0;
      flyNum.textContent = String(text).replace(/\d+(\.\d+)?/g, function (n) {
        var v = parseFloat(nums[i++]) * e; return n.indexOf('.') > -1 ? v.toFixed(1) : Math.round(v);
      });
      if (p < 1) tick = requestAnimationFrame(step); else flyNum.textContent = text;
    }
    tick = requestAnimationFrame(step);
  }

  function fillCountry(c) {
    var vals = { name: c.name, in_name: c.in_name || c.name, why0: (c.why || [])[0] || '', year_cost: c.year_cost,
                 duration: c.duration, airport: c.airport, city: c.city, stops: c.stops, fare: c.fare };
    each(faceCountry.querySelectorAll('[data-h]'), function (el) { el.textContent = vals[el.dataset.h] == null ? '' : vals[el.dataset.h]; });
    $('dxFlyUnit').textContent = c.hours_unit == null ? 'hrs' : c.hours_unit;
    $('dxFareLabel').textContent = c.fare_label || 'Lowest fare seen, one-way';
    $('dxFareDate').textContent = c.fare_as_of ? '· ' + c.fare_as_of : '';
    $('dxGuide').href = c.page;
    // "Get my free shortlist": the chat opens with this message, so the team knows which country it is about
    $('dxAsk').href = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent('Hi Mathura Overseas, please send me a free shortlist of universities in ' + (c.in_name || c.name) + '. [from the Countries page]');
  }
  function playCountryFlight(c) {
    fly.classList.remove('is-play'); void fly.offsetWidth; fly.classList.add('is-play');
    countUp(c.hours);
    if (flyJob) flyJob.stop = true;
    flyJob = flyAlong(flyPath, flyPlane, 1500);
  }

  /* =====================================================================
     Steps
     ===================================================================== */
  function render(how) {
    var isCountry = state.view === 'country';
    var c = isCountry ? bySlug[state.country] : null;
    root.classList.toggle('is-step1', !isCountry);
    root.classList.toggle('is-step2', isCountry);
    hero.classList.toggle('is-country', isCountry);
    faceHome.hidden = isCountry;
    faceCountry.hidden = !isCountry;

    back.hidden = !isCountry;
    barTitle.textContent = isCountry ? c.name : 'Choose a country';
    step1.classList.toggle('is-on', !isCountry);
    step1.classList.toggle('is-done', isCountry);
    step2.classList.toggle('is-on', isCountry);
    each(root.querySelectorAll('.dx-country'), function (s) { s.classList.toggle('is-active', s.dataset.country === state.country); });

    if (isCountry) {
      tourPause();
      fillCountry(c);
      document.title = 'MBBS in ' + (c.in_name || c.name) + ': Universities | Mathura Overseas';
      enter(faceCountry); enter(stepUnis);
      // Bring the hero into view so the flight is seen as it plays
      if (how === 'user') window.scrollTo({ top: 0, behavior: smooth() });
      playCountryFlight(c);
    } else {
      document.title = 'MBBS Abroad Countries & Universities | Mathura Overseas';
      if (how !== 'quiet') { enter(faceHome); enter(stepCountries); }
      if (how === 'back' && lastTile) {
        // Back from a country: return to its tile, not the top of the page
        var r = lastTile.getBoundingClientRect();
        window.scrollBy({ top: r.top - window.innerHeight / 3, behavior: 'auto' });
        lastTile.focus({ preventScroll: true });
      }
      tourPlay();
    }
  }

  /* ---------- the address bar decides which step shows ---------- */
  function readHash() {
    var h = decodeURIComponent(location.hash.replace('#', ''));
    return sections[h] && bySlug[h] ? h : null;
  }
  function fromHash(how) {
    var slug = readHash();
    state.country = slug;
    state.view = slug ? 'country' : 'countries';
    render(how);
  }
  window.addEventListener('hashchange', function () {
    fromHash(state.view === 'country' && !readHash() ? 'back' : 'user');
  });

  function openCountry(slug, tile) {
    lastTile = tile || lastTile;
    openedFromTiles = !!tile;
    if (location.hash === '#' + slug) { state.view = 'country'; state.country = slug; render('user'); }
    else location.hash = slug;             // adds a history step, so Back returns to the tiles
  }
  function showCountries() {
    if (openedFromTiles && state.view === 'country') { history.back(); return; }
    openedFromTiles = false;
    state.view = 'countries'; state.country = null;
    if (location.hash) history.pushState(null, '', location.pathname + location.search);
    render('back');
  }

  each(root.querySelectorAll('[data-open]'), function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); openCountry(a.dataset.open, a); });
  });
  back.addEventListener('click', showCountries);

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

  /* ---------- start ---------- */
  var pc = new URLSearchParams(location.search).get('country');      // older links: ?country=georgia
  if (pc && sections[pc] && !readHash()) history.replaceState(null, '', location.pathname + '#' + pc);
  fromHash('quiet');
  if (state.view === 'country') {
    // Arriving on a country link: show its hero. The browser jumps to the #country section by itself once the
    // page has loaded, so scroll back to the top after that jump, and play the flight there.
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    window.addEventListener('load', function () {
      setTimeout(function () { window.scrollTo(0, 0); if (state.view === 'country') playCountryFlight(bySlug[state.country]); }, 0);
    });
  }
  if (location.hash === '#universities') {                      // home page "every university" link: go to the tiles
    var hdr = document.querySelector('.app-header');
    window.scrollTo(0, stepCountries.getBoundingClientRect().top + window.pageYOffset - (hdr ? hdr.getBoundingClientRect().bottom : 0) - 60);
  }
});
