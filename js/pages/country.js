// country.js — FINAL. Shared by EVERY country page (mbbs-in-{country}.html) and, later, the university pages.
// Used by: Philippines, Uzbekistan, Kyrgyzstan, Kazakhstan, Russia, Georgia, Vietnam, Timor-Leste, Nepal.
//
// ======================= THE ONLY LINES YOU NORMALLY EDIT =======================
// When the dollar rate changes, update these two lines. Every ₹ / $ figure on every
// country page re-calculates from them automatically.
var USD_TO_INR   = 95;             // 1 US dollar = ₹95
var RATE_AS_OF   = '26 Oct 2026';  // the date you checked the rate
// =================================================================================
//
// What this file does (each part only runs on pages that have the matching HTML):
//   1. Money       ₹ / $ switch, and fee bars sized as a share of the yearly total
//   2. Roadmap     to-scale bar widths on the course timeline
//   3. WhatsApp    ready-made messages on WhatsApp links
//   4. Tabs        highlights the sticky section tab for the section on screen
//   5. City filter shows universities in one city (Kazakhstan, Russia)
//
// How to write things in the HTML (no maths needed):
//   <span data-inr="380000"></span>                 → shows ₹3.8 L   (or $4,000 when $ is picked)
//   <span data-inr-range="240000-530000"></span>    → shows ₹2.4–5.3 L
//   <span class="cty-fees__meter"><span data-share-of="feeTotal"></span></span> → bar sized as a share of the total
//      (the bar's row needs data-row-inr="…"; a row that costs nothing uses .cty-fees__row--zero and has no bar)
// WhatsApp buttons:  <a data-wa="Hi, please send the DMSF fee sheet" href="https://wa.me/919360859919">
// Course roadmap:    <li class="cty-path__stage" data-months="54"> (sets the width of that stage)
// City filter:       <button data-uni-filter="almaty">  +  <article class="uni-card" data-city="almaty"> (or class="uni-spot")
//                    A city card's link with data-uni-filter-set="almaty" jumps to the list already filtered.
//
// These blocks need NO script — they are pure CSS: FAQ accordion (<details>), official list board,
// then-vs-now year blocks, syllabus match, fit check, city cards, two admission routes.
// Scroll-in animations (.reveal → .is-in) come from the shared animations.js, not from here.

document.addEventListener('DOMContentLoaded', function () {
  var WA_NUMBER = '919360859919';
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }

  /* ---------- 1. Money: ₹ / $ switch ---------- */
  var currency = 'inr';
  function fmt(inr) {
    if (currency === 'usd') {
      var usd = inr / USD_TO_INR;
      usd = usd >= 1000 ? Math.round(usd / 50) * 50 : Math.round(usd / 10) * 10;
      return '$' + usd.toLocaleString('en-US');
    }
    if (inr >= 100000) return '₹' + (Math.round(inr / 10000) / 10).toString().replace(/\.0$/, '') + ' L';
    return '₹' + Math.round(inr / 1000) + 'k';
  }
  function fmtRange(a, b) {
    if (currency === 'usd') return fmt(a) + '–' + fmt(b).replace('$', '');
    if (a >= 100000 && b >= 100000) return fmt(a).replace(' L', '') + '–' + fmt(b).replace('₹', '');
    return fmt(a) + '–' + fmt(b).replace('₹', '');
  }
  function renderMoney() {
    each(document.querySelectorAll('[data-inr]'), function (el) { el.textContent = fmt(+el.dataset.inr); });
    each(document.querySelectorAll('[data-inr-range]'), function (el) {
      var p = el.dataset.inrRange.split('-'); el.textContent = fmtRange(+p[0], +p[1]);
    });
    each(document.querySelectorAll('[data-rate-label]'), function (el) {
      el.textContent = '1 USD = ₹' + USD_TO_INR + ' (as of ' + RATE_AS_OF + ')';
    });
  }
  each(document.querySelectorAll('[data-currency]'), function (btn) {
    btn.addEventListener('click', function () {
      currency = btn.dataset.currency;
      each(document.querySelectorAll('[data-currency]'), function (b) {
        b.setAttribute('aria-pressed', b.dataset.currency === currency ? 'true' : 'false');
      });
      renderMoney();
    });
  });
  renderMoney();

  // Fee bars: each bar's width = its value as a share of the yearly total
  each(document.querySelectorAll('[data-share-of]'), function (bar) {
    var total = document.getElementById(bar.dataset.shareOf);
    var row = bar.closest('[data-row-inr]');
    if (!total || !row) return;
    var pct = Math.max(3, Math.round(+row.dataset.rowInr / +total.dataset.inr * 100));
    bar.style.setProperty('--w', pct);
  });

  /* ---------- 2. Course roadmap: to-scale bar widths (from each stage's data-months) ---------- */
  each(document.querySelectorAll('.cty-path__wrap'), function (wrap) {
    var stages = wrap.querySelectorAll('.cty-path__stage');
    var segs = wrap.querySelectorAll('.cty-path__seg');
    each(stages, function (st, i) { if (segs[i]) segs[i].style.setProperty('--m', +st.dataset.months || 12); });
  });

  /* ---------- 3. WhatsApp links with a ready-made message ---------- */
  each(document.querySelectorAll('[data-wa]'), function (a) {
    a.href = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(a.dataset.wa);
    a.target = '_blank'; a.rel = 'noopener';
  });

  /* ---------- 4. Sticky section tabs: highlight the section on screen ---------- */
  var tabBar = document.querySelector('.cty-tabs__track');
  if (tabBar && 'IntersectionObserver' in window) {
    var links = tabBar.querySelectorAll('a[href^="#"]');
    var map = {};
    each(links, function (a) { var s = document.getElementById(a.getAttribute('href').slice(1)); if (s) map[s.id] = a; });
    var current = null;
    function setActive(id) {
      if (id === current || !map[id]) return;
      current = id;
      each(links, function (a) { a.classList.toggle('is-active', a === map[id]); });
      // Scroll the tab strip (not the page) so the active tab stays visible on phones
      var a = map[id], left = a.offsetLeft - (tabBar.clientWidth - a.offsetWidth) / 2;
      tabBar.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) setActive(e.target.id); });
    }, { rootMargin: '-35% 0px -60% 0px' });
    Object.keys(map).forEach(function (id) { io.observe(document.getElementById(id)); });
  }

  /* ---------- 5. Universities by city (only runs on pages that have a .uni-filter row) ---------- */
  var filterBtns = document.querySelectorAll('[data-uni-filter]');
  if (filterBtns.length) {
    var uniRow = document.querySelector('.uni-row');
    function showCity(city) {
      each(filterBtns, function (b) { b.setAttribute('aria-pressed', b.dataset.uniFilter === city ? 'true' : 'false'); });
      // The spotlight and cards follow the chip; cards without data-city (the "Considering another university?" card) always stay visible
      each(document.querySelectorAll('.uni-spot[data-city], .uni-card[data-city]'), function (card) {
        card.hidden = !(city === 'all' || card.dataset.city === city);
      });
      if (uniRow) uniRow.scrollTo({ left: 0, behavior: 'smooth' });
    }
    each(filterBtns, function (b) { b.addEventListener('click', function () { showCity(b.dataset.uniFilter); }); });
    each(document.querySelectorAll('[data-uni-filter-set]'), function (a) {
      a.addEventListener('click', function () { showCity(a.dataset.uniFilterSet); });
    });
  }
});
