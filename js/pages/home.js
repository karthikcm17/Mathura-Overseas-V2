// home.js — behaviour unique to index.html. Needs js/tools.js loaded first (for the numbers).
document.addEventListener('DOMContentLoaded', function () {
  function $(id) { return document.getElementById(id); }

  /* ================= QUICK PLANNER (hero tool) =================
     Each tab gives an instant answer, then its button carries the visitor's input to
     mbbs-abroad-planner.html (e.g. ?score=250&cat=general#eligibility), where the full tool picks it up.
     Fees are AVERAGES (the middle of each range in tools.js) — the same figures the MBBS Planner shows. */
  var tool = $('heroTool');
  if (tool && typeof MO !== 'undefined') {
    var MOBILE = function () { return window.innerWidth < 768; };

    // ---- tabs (arrow keys move between them; only the selected tab is in the Tab order) ----
    var tabList = $('toolTabs'), tabs = tool.querySelectorAll('.tool__tab'), panels = tool.querySelectorAll('.tool__panel');
    var ORDER = ['toolElig', 'toolCost', 'toolCmp'], KEY = { elig: 'toolElig', cost: 'toolCost', cmp: 'toolCmp' };
    var selectPanel = function (id) {
      tabs.forEach(function (t) {
        var on = t.getAttribute('aria-controls') === id;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
      });
      panels.forEach(function (p) { p.hidden = p.id !== id; });
      tabList.style.setProperty('--i', ORDER.indexOf(id));
      $('toolNote').classList.toggle('is-off', id === 'toolElig');   // the fee note only matters on Budget and Compare
    };
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { selectPanel(tab.getAttribute('aria-controls')); });
      tab.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        var next = tabs[(i + d + tabs.length) % tabs.length]; next.focus(); next.click();
      });
    });
    $('toolNote').textContent = 'Averages as of ' + FEES_AS_OF + ' · a counsellor confirms exact fees';
    selectPanel('toolElig');

    // ---- mobile bottom sheet: opens from the hero button, closes with ×, the backdrop, Esc or a swipe down ----
    var scrim = $('toolScrim'), opener = null;
    var openSheet = function (key, btn) {
      selectPanel(KEY[key] || KEY.elig);
      opener = btn || null;
      tool.style.setProperty('--drag', '0px');
      tool.classList.add('is-open'); scrim.classList.add('is-open'); document.body.classList.add('sheet-open');
      tool.setAttribute('role', 'dialog'); tool.setAttribute('aria-modal', 'true');
      setTimeout(function () { var f = tool.querySelector('.tool__panel:not([hidden]) input, .tool__panel:not([hidden]) select'); if (f) f.focus({ preventScroll: true }); }, 340);
    };
    var closeSheet = function () {
      if (!tool.classList.contains('is-open')) return;
      tool.classList.remove('is-open'); scrim.classList.remove('is-open'); document.body.classList.remove('sheet-open');
      tool.setAttribute('role', 'region'); tool.removeAttribute('aria-modal');
      if (opener && MOBILE()) opener.focus({ preventScroll: true });
    };
    document.querySelectorAll('[data-open-tool]').forEach(function (b) { b.addEventListener('click', function () { openSheet(b.dataset.openTool, b); }); });
    $('toolClose').addEventListener('click', closeSheet);
    scrim.addEventListener('click', closeSheet);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheet(); });
    window.addEventListener('resize', function () { if (!MOBILE()) closeSheet(); });

    // swipe the sheet down by its handle or header to close it
    var grab = $('toolGrab'), head = tool.querySelector('.tool__head'), y0 = null, dy = 0;
    var dragStart = function (e) { if (!MOBILE()) return; y0 = e.touches[0].clientY; dy = 0; tool.classList.add('is-dragging'); };
    var dragMove = function (e) {
      if (y0 === null) return;
      dy = Math.max(0, e.touches[0].clientY - y0);
      tool.style.setProperty('--drag', dy + 'px');
    };
    var dragEnd = function () {
      if (y0 === null) return;
      tool.classList.remove('is-dragging');
      if (dy > 90) closeSheet();
      tool.style.setProperty('--drag', '0px');
      y0 = null;
    };
    [grab, head].forEach(function (el) {
      el.addEventListener('touchstart', dragStart, { passive: true });
      el.addEventListener('touchmove', dragMove, { passive: true });
      el.addEventListener('touchend', dragEnd);
      el.addEventListener('touchcancel', dragEnd);
    });

    // ---- 1. Eligibility: live gauge (score out of 720) with a marker at the cutoff ----
    var gauge = $('qGauge'), fill = $('qGaugeFill'), mark = $('qGaugeMark'), score = $('qScore');
    var pointAt = function (f) { var a = Math.PI * (1 - f); return [60 + 50 * Math.cos(a), 62 - 50 * Math.sin(a)]; };
    var renderElig = function () {
      if (score.value.length > 3) score.value = score.value.slice(0, 3);   // NEET maximum is 720: three digits
      var raw = score.value, n = parseFloat(raw), cat = tool.querySelector('input[name="qCat"]:checked').value;
      var year = MO.latestYear(), r = MO.rules(year, cat);
      var p = pointAt(r.neet / 720);
      mark.setAttribute('cx', p[0].toFixed(1)); mark.setAttribute('cy', p[1].toFixed(1));
      gauge.classList.add('has-mark');
      var go = 'mbbs-abroad-planner.html?cat=' + cat;
      if (raw === '' || isNaN(n) || n < 0 || n > 720) {
        fill.style.setProperty('--off', 100);
        gauge.classList.remove('is-short');
        $('qGaugeNum').textContent = '–';
        $('qEligStatus').innerHTML = raw === '' ? 'Type your score — the marker shows the ' + year + ' ' + r.label + ' cutoff of <strong>' + r.neet + '</strong>.'
          : 'NEET scores run from 0 to 720.';
      } else {
        var gap = Math.round(n - r.neet);
        fill.style.setProperty('--off', (100 - n / 720 * 100).toFixed(1));
        gauge.classList.toggle('is-short', gap < 0);
        $('qGaugeNum').textContent = Math.round(n);
        $('qEligStatus').innerHTML = gap >= 0
          ? '<strong>' + (gap === 0 ? 'Right on' : gap + ' above') + '</strong> the ' + year + ' ' + r.label + ' cutoff of ' + r.neet + '. Next, check your PCB % and age.'
          : '<span class="is-short">' + (-gap) + ' short</span> of the ' + year + ' ' + r.label + ' cutoff (' + r.neet + '). An older valid score or a counsellor may still help.';
        go += '&score=' + Math.round(n);
      }
      $('qEligGo').href = go + '#eligibility';
    };
    score.addEventListener('input', renderElig);
    score.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); location.href = $('qEligGo').href; } });
    tool.querySelectorAll('input[name="qCat"]').forEach(function (el) { el.addEventListener('change', renderElig); });
    renderElig();

    // ---- 2. Budget: slider; a destination lights up when its AVERAGE tuition (full course) fits the budget ----
    var budget = $('qBudget'), fits = $('qFits');
    var budgetKeys = Object.keys(DESTINATIONS).sort(function (a, b) { return MO.avgTuition(DESTINATIONS[a]) - MO.avgTuition(DESTINATIONS[b]); });
    fits.innerHTML = budgetKeys.map(function (k) { return '<span class="qb__pill" data-key="' + k + '">' + MO.icon('check') + DESTINATIONS[k].label + '</span>'; }).join('');
    var renderBudget = function () {
      var v = parseInt(budget.value, 10), max = parseInt(budget.max, 10), min = parseInt(budget.min, 10), any = false, top = v >= max;
      $('qBudgetOut').textContent = '₹' + v + 'L' + (top ? '+' : '');
      budget.style.setProperty('--fill', ((v - min) / (max - min) * 100).toFixed(1) + '%');
      fits.querySelectorAll('.qb__pill').forEach(function (pill) {
        var on = top || MO.avgTuition(DESTINATIONS[pill.dataset.key]) <= v; pill.classList.toggle('is-in', on); if (on) any = true;
      });
      $('qCostStatus').innerHTML = any ? 'Highlighted: average tuition <strong>fits within ₹' + v + 'L' + (top ? '+' : '') + '</strong>. Living costs are extra — see the full plan.'
        : 'Average tuition starts a little higher than this — slide right to see options.';
      $('qCostGo').href = 'mbbs-abroad-planner.html?budget=' + v + '#cost';
    };
    budget.addEventListener('input', renderBudget);
    renderBudget();

    // ---- 3. Compare: every country the MBBS Planner knows, grouped; three averages each ----
    var ALL = MO.allDestinations();
    var selA = $('qCmpA'), selB = $('qCmpB');
    var group = function (label, obj) {
      return '<optgroup label="' + label + '">' + Object.keys(obj).map(function (k) { return '<option value="' + k + '">' + obj[k].label + '</option>'; }).join('') + '</optgroup>';
    };
    var opts = group('Popular', DESTINATIONS) + (typeof MORE_DESTINATIONS !== 'undefined' ? group('More countries', MORE_DESTINATIONS) : '');
    selA.innerHTML = opts; selB.innerHTML = opts; selA.value = 'philippines'; selB.value = 'uzbekistan';
    var renderCompare = function () {
      var a = selA.value, b = selB.value;
      $('qCmpGo').href = 'mbbs-abroad-planner.html?cmp=' + a + (a !== b ? ',' + b : '') + '#compare';
      if (a === b) { $('qCmp').innerHTML = '<p class="qx__same">Pick two different destinations.</p>'; return; }
      var A = ALL[a], B = ALL[b], ta = MO.avgTuition(A), tb = MO.avgTuition(B);
      var cheaper = ta === tb ? null : (ta < tb ? a : b);
      var card = function (k, d) {
        return '<div class="qx__card"><div class="qx__top"><em class="qx__tag' + (k === cheaper ? '' : ' qx__tag--ghost') + '">Lower fees</em><small>' + MO.years(d) + '</small></div>' +
          '<div><b>' + MO.aboutL(MO.avgTuition(d)) + '</b><span>Tuition, course</span></div>' +
          '<div><b>' + MO.aboutK(MO.avgLiving(d)) + '</b><span>Living / month</span></div></div>';
      };
      $('qCmp').innerHTML = card(a, A) + card(b, B);
    };
    selA.addEventListener('change', renderCompare);
    selB.addEventListener('change', renderCompare);
    $('qCmpSwap').addEventListener('click', function () { var t = selA.value; selA.value = selB.value; selB.value = t; renderCompare(); });
    renderCompare();
  }

  /* ================= JOURNEY: the route draws itself and the plane flies stop to stop when it scrolls into view ================= */
  var journey = $('journey');
  if (journey) {
    var steps = journey.querySelectorAll('.journey__step');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var setProgress = function (p) {
      journey.style.setProperty('--p', p);
      steps.forEach(function (s, i) { s.classList.toggle('is-active', p >= i / (steps.length - 1) - 0.001); });
      journey.classList.toggle('is-done', p >= 0.999);
    };
    setProgress(0);
    var run = function () {
      if (reduce) { setProgress(1); return; }
      var t0 = null, DURATION = 3000;
      var tick = function (ts) {
        if (!t0) t0 = ts;
        var t = Math.min((ts - t0) / DURATION, 1);
        setProgress(t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);   // ease in-out
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { io.disconnect(); run(); }
      }, { threshold: 0.3 });
      io.observe(journey);
    } else { setProgress(1); }
  }

  /* ================= "NEET & counselling updates" card: the NEWEST item in assets/data/latest-updates.json =================
     Sorted by date here, so the card is right even if a new update was added lower down in the file. */
  var latest = document.querySelector('[data-latest]');
  if (latest) {
    var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var when = function (s) { var p = String(s || '').trim().split(/\s+/); return new Date(+p[2], MONTHS.indexOf(p[1]), +p[0]).getTime() || 0; };
    fetch('assets/data/latest-updates.json')
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (items) {
        if (!items || !items.length) return;
        var it = items.slice().sort(function (a, b) { return when(b.date) - when(a.date); })[0];
        if (it && /^\d/.test(it.date)) latest.textContent = 'Latest · ' + it.date.replace(/\s+\d{4}$/, '') + ' — ' + it.title;
      })
      .catch(function () { /* keep the static text */ });
  }

  /* ================= CLOSING CTA: "Call me back" (saves to the sheet, or opens WhatsApp until the sheet link is set) ================= */
  var ctaForm = $('ctaForm');
  if (ctaForm && typeof MO !== 'undefined') {
    var ctaPhone = $('ctaPhone');
    ctaPhone.addEventListener('input', function () { ctaPhone.value = ctaPhone.value.replace(/[^\d\s+]/g, ''); });
    ctaForm.addEventListener('submit', function (e) {
      e.preventDefault();
      MO.submitLead(ctaPhone, $('ctaMsg'), { source: 'home-cta', message: 'Hi Mathura Overseas, I would like free counselling for MBBS abroad.' });
    });
  }

  /* ================= AI chat widget (desktop only; CSS hides it on mobile) ================= */
  var WORKER_URL = 'https://mathura-ai-chat.mathuraoverseas.workers.dev/';
  var bubble = $('aiChatBubble');
  if (!bubble) return;
  var panel = $('aiChatPanel'), msgs = $('aiChatMsgs'), form = $('aiChatForm'), input = $('aiChatInput'), chips = $('aiChatChips');
  var waLink = typeof MO !== 'undefined' ? MO.wa('Hi Mathura Overseas, I have a question about MBBS abroad.') : 'https://wa.me/919360859919';
  function toggle() {
    var open = panel.classList.toggle('is-open');
    bubble.classList.toggle('is-hidden', open);
    bubble.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) input.focus(); else bubble.focus();
  }
  function add(text, kind) {
    var d = document.createElement('div');
    d.className = 'ai-msg ai-msg--' + kind;
    d.textContent = text;
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
    return d;
  }
  function addFallback(text) {
    var d = add(text + ' ', 'bot'), a = document.createElement('a');
    a.href = waLink; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'Message us on WhatsApp';
    d.appendChild(a);
  }
  function send(text) {
    if (!text || !text.trim()) return;
    if (chips) chips.hidden = true;
    add(text, 'user');
    input.value = '';
    var typing = add('Typing…', 'bot ai-msg--typing');
    fetch(WORKER_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text }) })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) { typing.remove(); if (d.reply) add(d.reply, 'bot'); else addFallback("Sorry, I couldn't answer that."); })
      .catch(function () { typing.remove(); addFallback('The assistant is not available right now.'); });
  }
  bubble.addEventListener('click', toggle);
  $('aiChatClose').addEventListener('click', toggle);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel.classList.contains('is-open')) toggle(); });
  form.addEventListener('submit', function (e) { e.preventDefault(); send(input.value); });
  if (chips) chips.querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { send(b.textContent); }); });
});
