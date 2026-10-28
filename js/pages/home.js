// home.js — behaviour unique to index.html. Needs js/tools.js loaded first (for the numbers).
document.addEventListener('DOMContentLoaded', function () {
  function $(id) { return document.getElementById(id); }

  /* ================= QUICK PLANNER (hero tool) =================
     Each tab gives an instant answer, then its button carries the visitor's input to
     find-your-university.html (e.g. ?score=250&cat=general#eligibility), where the full tool picks it up. */
  var tool = $('heroTool');
  if (tool && typeof MO !== 'undefined') {
    // ---- tabs + mobile bottom sheet ----
    var tabList = $('toolTabs'), tabs = tool.querySelectorAll('.tool__tab'), panels = tool.querySelectorAll('.tool__panel');
    var ORDER = ['toolElig', 'toolCost', 'toolCmp'], KEY = { elig: 'toolElig', cost: 'toolCost', cmp: 'toolCmp' };
    var selectPanel = function (id) {
      tabs.forEach(function (t) { t.setAttribute('aria-selected', t.getAttribute('aria-controls') === id ? 'true' : 'false'); });
      panels.forEach(function (p) { p.hidden = p.id !== id; });
      tabList.style.setProperty('--i', ORDER.indexOf(id));
    };
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { selectPanel(tab.getAttribute('aria-controls')); });
      tab.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        var next = tabs[(i + d + tabs.length) % tabs.length]; next.focus(); next.click();
      });
    });
    var scrim = $('toolScrim');
    var openSheet = function (key) { selectPanel(KEY[key] || KEY.elig); tool.classList.add('is-open'); scrim.classList.add('is-open'); document.body.classList.add('sheet-open'); };
    var closeSheet = function () { tool.classList.remove('is-open'); scrim.classList.remove('is-open'); document.body.classList.remove('sheet-open'); };
    document.querySelectorAll('[data-open-tool]').forEach(function (b) { b.addEventListener('click', function () { openSheet(b.dataset.openTool); }); });
    $('toolClose').addEventListener('click', closeSheet);
    scrim.addEventListener('click', closeSheet);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheet(); });
    window.addEventListener('resize', function () { if (window.innerWidth >= 768) closeSheet(); });

    // ---- 1. Eligibility: live gauge (score out of 720) with a marker at the cutoff ----
    var gauge = $('qGauge'), fill = $('qGaugeFill'), mark = $('qGaugeMark');
    var pointAt = function (f) { var a = Math.PI * (1 - f); return [60 + 50 * Math.cos(a), 62 - 50 * Math.sin(a)]; };
    var renderElig = function () {
      var raw = $('qScore').value, score = parseFloat(raw), cat = tool.querySelector('input[name="qCat"]:checked').value;
      var year = MO.latestYear(), r = MO.rules(year, cat);
      var p = pointAt(r.neet / 720);
      mark.setAttribute('cx', p[0].toFixed(1)); mark.setAttribute('cy', p[1].toFixed(1));
      gauge.classList.add('has-mark');
      var go = 'find-your-university.html?cat=' + cat;
      if (raw === '' || isNaN(score) || score < 0 || score > 720) {
        fill.style.setProperty('--off', 100);
        gauge.classList.remove('is-short');
        $('qGaugeNum').textContent = '–';
        $('qEligStatus').innerHTML = raw === '' ? 'Type your score — the marker shows the ' + year + ' ' + r.label + ' cutoff of <strong>' + r.neet + '</strong>.'
          : 'NEET scores run from 0 to 720.';
      } else {
        var gap = score - r.neet;
        fill.style.setProperty('--off', (100 - score / 720 * 100).toFixed(1));
        gauge.classList.toggle('is-short', gap < 0);
        $('qGaugeNum').textContent = score;
        $('qEligStatus').innerHTML = gap >= 0
          ? '<strong>' + (gap === 0 ? 'Right on' : gap + ' above') + '</strong> the ' + year + ' ' + r.label + ' cutoff of ' + r.neet + '. Next, check your PCB % and age.'
          : '<span class="is-short">' + (-gap) + ' short</span> of the ' + year + ' ' + r.label + ' cutoff (' + r.neet + '). An older valid score or a counsellor may still help.';
        go += '&score=' + score;
      }
      $('qEligGo').href = go + '#eligibility';
    };
    $('qScore').addEventListener('input', renderElig);
    tool.querySelectorAll('input[name="qCat"]').forEach(function (el) { el.addEventListener('change', renderElig); });
    renderElig();

    // ---- 2. Budget: slider; a destination lights up when its tuition starts within the budget ----
    var budget = $('qBudget'), fits = $('qFits'), keys = Object.keys(DESTINATIONS);
    fits.innerHTML = keys.map(function (k) { return '<span class="qb__pill" data-key="' + k + '">' + MO.icon('check') + DESTINATIONS[k].label + '</span>'; }).join('');
    var renderBudget = function () {
      var v = parseInt(budget.value, 10), max = parseInt(budget.max, 10), min = parseInt(budget.min, 10), any = false;
      $('qBudgetOut').textContent = '₹' + v + 'L' + (v >= max ? '+' : '');
      budget.style.setProperty('--fill', ((v - min) / (max - min) * 100).toFixed(1) + '%');
      fits.querySelectorAll('.qb__pill').forEach(function (pill) {
        var on = DESTINATIONS[pill.dataset.key].tuition[0] <= v; pill.classList.toggle('is-in', on); if (on) any = true;
      });
      $('qCostStatus').innerHTML = any ? 'Highlighted: tuition <strong>starts within ₹' + v + 'L</strong>. Living costs are extra — see the full plan.'
        : 'Tuition starts a little higher than this — slide right to see options.';
      $('qCostGo').href = 'find-your-university.html?budget=' + v + '#cost';
    };
    budget.addEventListener('input', renderBudget);
    renderBudget();

    // ---- 3. Compare: two dropdowns, two key numbers each ----
    var selA = $('qCmpA'), selB = $('qCmpB');
    var opts = keys.map(function (k) { return '<option value="' + k + '">' + DESTINATIONS[k].label + '</option>'; }).join('');
    selA.innerHTML = opts; selB.innerHTML = opts; selA.value = 'philippines'; selB.value = 'uzbekistan';
    var renderCompare = function () {
      var a = selA.value, b = selB.value;
      $('qCmpGo').href = 'find-your-university.html?cmp=' + a + (a !== b ? ',' + b : '') + '#compare';
      if (a === b) { $('qCmp').innerHTML = '<p class="qx__same">Pick two different destinations.</p>'; return; }
      var A = DESTINATIONS[a], B = DESTINATIONS[b];
      var cheaper = A.tuition[0] === B.tuition[0] ? (A.tuition[1] <= B.tuition[1] ? a : b) : (A.tuition[0] < B.tuition[0] ? a : b);
      var card = function (k, d) {
        return '<div class="qx__card"><em class="qx__tag' + (k === cheaper ? '' : ' qx__tag--ghost') + '">Lower fees</em>' +
          '<div><b>' + MO.range(d.tuition[0], d.tuition[1]) + '</b><span>Tuition</span></div>' +
          '<div><b>' + MO.years(d) + '</b><span>Course length</span></div></div>';
      };
      $('qCmp').innerHTML = card(a, A) + card(b, B);
    };
    selA.addEventListener('change', renderCompare);
    selB.addEventListener('change', renderCompare);
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

  /* ================= "NEET & counselling updates" card: newest item from assets/data/latest-updates.json ================= */
  var latest = document.querySelector('[data-latest]');
  if (latest) {
    fetch('assets/data/latest-updates.json')
      .then(function (r) { return r.json(); })
      .then(function (items) {
        var it = items && items[0];
        if (it && /^\d/.test(it.date)) latest.textContent = 'Latest · ' + it.date.replace(/\s+\d{4}$/, '') + ' — ' + it.title;
      })
      .catch(function () { /* keep the static text */ });
  }

  /* ================= AI chat widget (desktop only; CSS hides it on mobile) ================= */
  var WORKER_URL = 'https://mathura-ai-chat.mathuraoverseas.workers.dev/';
  var bubble = $('aiChatBubble');
  if (!bubble) return;
  var panel = $('aiChatPanel'), msgs = $('aiChatMsgs'), form = $('aiChatForm'), input = $('aiChatInput'), chips = $('aiChatChips');
  function toggle() {
    var open = panel.classList.toggle('is-open');
    bubble.classList.toggle('is-hidden', open);
    if (open) input.focus();
  }
  function add(text, kind) {
    var d = document.createElement('div');
    d.className = 'ai-msg ai-msg--' + kind;
    d.textContent = text;
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
  }
  function send(text) {
    if (!text || !text.trim()) return;
    if (chips) chips.hidden = true;
    add(text, 'user');
    input.value = '';
    fetch(WORKER_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text }) })
      .then(function (r) { return r.json(); })
      .then(function (d) { add(d.reply || "Sorry, I couldn't process that. Please try again or message us on WhatsApp.", 'bot'); })
      .catch(function () { add('Could not reach the assistant. Please try again or message us on WhatsApp.', 'bot'); });
  }
  bubble.addEventListener('click', toggle);
  $('aiChatClose').addEventListener('click', toggle);
  form.addEventListener('submit', function (e) { e.preventDefault(); send(input.value); });
  if (chips) chips.querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { send(b.textContent); }); });
});
