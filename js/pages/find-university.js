// find-university.js — the full planning tools on find-your-university.html.
// Needs js/tools.js loaded first: ALL numbers live there. This file only does the maths and the drawing.
// The home-page quick planner links here with what the visitor already typed, e.g.
//   ?score=250&cat=general#eligibility   ?budget=25#cost   ?cmp=philippines,uzbekistan#compare
document.addEventListener('DOMContentLoaded', function () {
  if (typeof MO === 'undefined') return;
  function $(id) { return document.getElementById(id); }
  function all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  var params = new URLSearchParams(location.search);
  var keys = Object.keys(DESTINATIONS);
  var profile = null;   // filled once the visitor checks eligibility; reused in WhatsApp messages

  /* ================= TABS (deep-linkable: #eligibility, #cost, #compare) ================= */
  var tabs = all('.fyu-tab'), panels = all('.fyu-panel'), IDS = ['eligibility', 'cost', 'compare'];
  function selectTab(id, scroll) {
    if (IDS.indexOf(id) === -1) return;
    tabs.forEach(function (t) { t.setAttribute('aria-selected', t.getAttribute('aria-controls') === id ? 'true' : 'false'); });
    panels.forEach(function (p) { p.hidden = p.id !== id; });
    if (history.replaceState) history.replaceState(null, '', location.pathname + location.search + '#' + id);
    if (scroll) $('tools').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t.getAttribute('aria-controls')); });
    t.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      var n = tabs[(i + d + tabs.length) % tabs.length]; n.focus(); n.click();
    });
  });
  all('[data-go]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); selectTab(a.dataset.go, true); }); });
  window.addEventListener('hashchange', function () { selectTab(location.hash.slice(1), true); });
  var startTab = location.hash.slice(1);
  if (IDS.indexOf(startTab) !== -1) { selectTab(startTab); setTimeout(function () { $('tools').scrollIntoView({ block: 'start' }); }, 60); }

  /* ================= FILL NUMBERS FROM tools.js (rules table, facts, FAQ) ================= */
  var latest = MO.latestYear();
  var WORDS = ['zero', 'one', 'two', 'three', 'four', 'five'];
  var fills = {
    pcb: PCB_REQUIREMENT.general + '% / ' + PCB_REQUIREMENT.other + '%',
    age: MIN_AGE + ' years',
    valid: (NEET_VALID_EXTRA_YEARS + 1) + ' admission years',
    extra: WORDS[NEET_VALID_EXTRA_YEARS] || NEET_VALID_EXTRA_YEARS,
    year: latest, 'cut-general': NEET_CUTOFFS[latest].general, 'cut-other': NEET_CUTOFFS[latest].other,
    'pcb-general': PCB_REQUIREMENT.general + '%', 'pcb-other': PCB_REQUIREMENT.other + '%', 'age-num': MIN_AGE, asof: TRAVEL_AS_OF
  };
  all('[data-fill]').forEach(function (el) { if (fills[el.dataset.fill] !== undefined) el.textContent = fills[el.dataset.fill]; });
  $('cutoffRows').innerHTML = Object.keys(NEET_CUTOFFS).sort().reverse().map(function (y) {
    return '<tr><th scope="row">NEET ' + y + '</th><td>' + NEET_CUTOFFS[y].general + '</td><td>' + NEET_CUTOFFS[y].other + '</td><td>' + (+y + NEET_VALID_EXTRA_YEARS) + ' intake</td></tr>';
  }).join('');

  /* ================= 1. ELIGIBILITY ================= */
  var form = $('eligForm'), result = $('eligResult'), need = $('eligNeed');
  function cat() { return form.querySelector('input[name="category"]:checked').value; }
  function val(id) { var v = $(id).value; return v === '' ? NaN : parseFloat(v); }

  // Live "what you need" strip; each item ticks itself as the matching field is filled in.
  function renderNeed() {
    var y = $('inNeetYear').value, r = MO.rules(y, cat());
    var item = function (label, v, min) {
      var cls = isNaN(v) ? '' : (v >= min ? ' is-ok' : ' is-short');
      return '<span class="fyu-need__item' + cls + '">' + MO.icon('check') + label + '</span>';
    };
    need.innerHTML = '<span class="fyu-need__label">Needed &middot; ' + r.label + ' &middot; NEET ' + y + '</span>' +
      item('NEET ' + r.neet + '+', val('inNeetScore'), r.neet) +
      item('PCB ' + r.pcb + '%+', val('inPcb'), r.pcb) +
      item('Age ' + r.age + '+', val('inAge'), r.age);
  }
  ['inNeetScore', 'inPcb', 'inAge', 'inNeetYear'].forEach(function (id) { $(id).addEventListener('input', renderNeed); });
  all('input[name="category"]', form).forEach(function (r) { r.addEventListener('change', renderNeed); });

  // Hand-off from the home page
  if (params.get('cat') && CATEGORIES[params.get('cat')]) { var c = form.querySelector('input[name="category"][value="' + params.get('cat') + '"]'); if (c) c.checked = true; }
  if (params.get('score') && !isNaN(parseFloat(params.get('score')))) {
    $('inNeetScore').value = parseFloat(params.get('score'));
    $('eligHandoff').hidden = false;
    if (startTab === 'eligibility') setTimeout(function () { $('inPcb').focus({ preventScroll: true }); }, 400);
  }
  renderNeed();

  function meter(pass, label, v, min, unit, max) {
    var gap = MO.num(v - min);
    return '<div class="fyu-meter-row' + (pass ? ' is-ok' : ' is-short') + '">' +
      '<div class="fyu-meter-row__top"><b>' + label + '</b><span>' + v + unit + '<em>' + (pass ? (gap > 0 ? gap + unit + ' above minimum' : 'meets minimum') : (-gap) + unit + ' short') + '</em></span></div>' +
      '<div class="fyu-meter-row__track"><i class="fyu-meter-row__fill" data-s="' + Math.min(v / max, 1).toFixed(3) + '"></i><i class="fyu-meter-row__min" data-l="' + Math.min(min / max * 100, 100).toFixed(1) + '%"></i></div>' +
    '</div>';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var score = val('inNeetScore'), pcb = val('inPcb'), age = val('inAge');
    var missing = [['inNeetScore', score], ['inPcb', pcb], ['inAge', age]].filter(function (f) { return isNaN(f[1]); });
    all('.field input', form).forEach(function (i) { i.classList.remove('is-invalid'); });
    if (missing.length) { missing.forEach(function (f) { $(f[0]).classList.add('is-invalid'); }); $(missing[0][0]).focus(); return; }

    var y = $('inNeetYear').value, k = cat(), r = MO.rules(y, k);
    var ok = { neet: score >= r.neet, pcb: pcb >= r.pcb, age: age >= r.age };
    var eligible = ok.neet && ok.pcb && ok.age;
    var until = +y + NEET_VALID_EXTRA_YEARS;
    profile = 'NEET ' + score + ' (' + y + '), ' + r.label + ', PCB ' + pcb + '%, age ' + age;
    var msg = 'Hi Mathura Overseas, I checked my eligibility on your website: ' + profile + '. ' +
      (eligible ? 'I meet the criteria — please suggest suitable universities.' : 'I don’t meet every criterion yet — can a counsellor check my options?');

    var steps = eligible
      ? '<li><button type="button" class="fyu-next" data-tab="cost"><b>Plan your full cost</b><span>Tuition, living and travel for the whole course.</span>' + MO.icon('arrow-right') + '</button></li>' +
        '<li><button type="button" class="fyu-next" data-tab="compare"><b>Compare destinations</b><span>Money, study and life, side by side.</span>' + MO.icon('arrow-right') + '</button></li>'
      : (!ok.neet ? '<li><div class="fyu-next fyu-next--static"><b>Check another valid NEET year</b><span>Scores from ' + (+latest - NEET_VALID_EXTRA_YEARS) + ' onwards still count — change the year above if you have a higher one.</span></div></li>' : '') +
        '<li><div class="fyu-next fyu-next--static"><b>Talk it through with a counsellor</b><span>We’ll explain exactly what would make you eligible.</span></div></li>';

    result.innerHTML =
      '<div class="fyu-verdict' + (eligible ? ' is-ok' : ' is-short') + '">' +
        '<span class="icon-badge icon-badge--' + (eligible ? 'teal' : 'pink') + '">' + MO.icon(eligible ? 'check' : 'info') + '</span>' +
        '<div><b>' + (eligible ? 'You’re eligible for MBBS abroad' : 'Not eligible yet') + '</b><span>' + profile.replace(/, /g, ' · ') + '</span></div></div>' +
      '<div class="fyu-meters">' +
        meter(ok.neet, 'NEET score', score, r.neet, '', 720) +
        meter(ok.pcb, 'Class 12 PCB', pcb, r.pcb, '%', 100) +
        meter(ok.age, 'Age', age, r.age, '', 25) +
      '</div>' +
      '<p class="fyu-valid">' + MO.icon('clock') + '<span>Your NEET ' + y + ' score can be used for admissions up to the <b>' + until + ' intake</b>.</span></p>' +
      '<h4 class="fyu-result__h">Your next steps</h4><ol class="fyu-steps">' + steps +
        '<li><div class="fyu-lead"><b>' + (eligible ? 'Get your free university shortlist' : 'Ask a counsellor — free') + '</b>' +
          '<a class="btn btn--primary btn--block" href="' + MO.wa(msg) + '" target="_blank" rel="noopener">' + MO.icon('whatsapp', true) + (eligible ? 'Get my shortlist on WhatsApp' : 'Ask on WhatsApp') + '</a>' +
          '<form class="fyu-callback fyu-callback--light" id="eligLead" novalidate><label class="sr-only" for="eligPhone">Mobile number</label><input type="tel" id="eligPhone" placeholder="Mobile for a call-back" inputmode="tel" autocomplete="tel"><button type="submit" class="btn btn--outline btn--sm">Call me</button></form>' +
          '<p class="fyu-callback__msg" id="eligMsg" role="status"></p></div></li>' +
      '</ol>';
    result.classList.add('has-result');
    requestAnimationFrame(function () {
      all('.fyu-meter-row__fill', result).forEach(function (b) { b.style.setProperty('--s', b.dataset.s); });
      all('.fyu-meter-row__min', result).forEach(function (m) { m.style.setProperty('--l', m.dataset.l); });
    });
    all('[data-tab]', result).forEach(function (b) { b.addEventListener('click', function () { selectTab(b.dataset.tab, true); }); });
    $('eligLead').addEventListener('submit', function (ev) {
      ev.preventDefault();
      MO.submitLead($('eligPhone'), $('eligMsg'), { source: 'find-university-eligibility', result: eligible ? 'eligible' : 'not-eligible', profile: profile, message: msg });
    });
    updateCta();
    if (window.innerWidth < 900) result.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* ================= 2. COST PLANNER ================= */
  var costPick = $('costPick'), budget = $('costBudget'), costOut = $('costOut'), chart = $('costChart');
  costPick.insertAdjacentHTML('beforeend', keys.map(function (k) {
    return '<label class="fyu-pick"><input type="radio" name="costDest" value="' + k + '"' + (k === 'philippines' ? ' checked' : '') + '><span>' + DESTINATIONS[k].label + '</span></label>';
  }).join(''));
  var maxTotal = Math.max.apply(null, keys.map(function (k) { return MO.total(DESTINATIONS[k])[1]; }));
  var SCALE = Math.ceil(maxTotal / 10) * 10;     // chart right edge, rounded up to the next ₹10L
  budget.max = SCALE;
  $('costBudget').nextElementSibling.lastElementChild.textContent = '₹' + SCALE + 'L+';
  if (params.get('budget')) {
    // home page sends a TUITION budget; here the budget covers tuition + living, so start a little higher
    var b = parseInt(params.get('budget'), 10);
    if (!isNaN(b)) budget.value = Math.min(SCALE, Math.max(10, Math.round(b * 1.5)));
  }

  chart.innerHTML = keys.map(function (k) {
    var d = DESTINATIONS[k], t = MO.total(d);
    return '<button type="button" class="fyu-bar" data-key="' + k + '" aria-pressed="false">' +
      '<span class="fyu-bar__name">' + d.label + '</span>' +
      '<span class="fyu-bar__track">' +
        '<i class="fyu-bar__total" data-l="' + MO.pct(t[0], SCALE) + '" data-w="' + MO.pct(t[1] - t[0], SCALE) + '"></i>' +
        '<i class="fyu-bar__tuition" data-l="' + MO.pct(d.tuition[0], SCALE) + '" data-w="' + MO.pct(d.tuition[1] - d.tuition[0], SCALE) + '"></i>' +
      '</span>' +
      '<span class="fyu-bar__val">' + MO.range(t[0], t[1]) + '</span></button>';
  }).join('') +
    '<div class="fyu-bar fyu-bar--axis" aria-hidden="true"><span></span><span class="fyu-bar__ticks">' +
      [0, 1, 2, 3, 4, 5].map(function (i) { var v = Math.round(SCALE / 5 * i); return '<i>' + (v === 0 ? '₹0' : v + 'L') + '</i>'; }).join('') +
    '</span><span></span></div>';
  all('.fyu-bar__track i', chart).forEach(function (i) { i.style.setProperty('--l', i.dataset.l); i.style.setProperty('--w', i.dataset.w); });

  function renderCost() {
    var k = costPick.querySelector('input:checked').value, d = DESTINATIONS[k];
    var v = parseInt(budget.value, 10), max = parseInt(budget.max, 10);
    var liv = MO.livingTotal(d), tot = MO.total(d);
    $('costBudgetOut').textContent = '₹' + v + 'L' + (v >= max ? '+' : '');
    budget.style.setProperty('--fill', ((v - 10) / (max - 10) * 100).toFixed(1) + '%');
    chart.style.setProperty('--b', MO.pct(v, SCALE));
    all('.fyu-bar[data-key]', chart).forEach(function (row) {
      var on = row.dataset.key === k; row.classList.toggle('is-selected', on); row.setAttribute('aria-pressed', on ? 'true' : 'false');
      row.classList.toggle('is-out', MO.total(DESTINATIONS[row.dataset.key])[0] > v);
    });
    var verdict = v >= tot[1] ? ['is-ok', 'Your budget of ₹' + v + 'L covers even the higher estimate.']
      : v >= tot[0] ? ['is-mid', 'Your budget of ₹' + v + 'L covers the lower end — university choice will matter.']
      : ['is-short', 'Your budget is about ₹' + MO.num(tot[0] - v) + 'L below the lowest estimate here.'];
    var midT = (d.tuition[0] + d.tuition[1]) / 2, midL = (liv[0] + liv[1]) / 2, share = (midT / (midT + midL) * 100).toFixed(1);
    var msg = 'Hi Mathura Overseas, please share the exact fee structure for MBBS in ' + d.label + '. My total budget is about ₹' + v + 'L' + (profile ? ' (' + profile + ')' : '') + '.';
    costOut.innerHTML =
      '<div class="fyu-bd__head"><span>Estimated full-course cost</span><a href="' + d.page + '">' + d.label + ' ' + MO.icon('arrow-right') + '</a></div>' +
      '<div class="fyu-bd__total">' + MO.range(tot[0], tot[1]) + '</div>' +
      '<div class="fyu-bd__split" aria-hidden="true"><i class="fyu-bd__split-t" data-w="' + share + '%"></i></div>' +
      '<div class="fyu-bd__key"><span><i class="fyu-legend__t"></i>Tuition ' + Math.round(share) + '%</span><span><i class="fyu-legend__l"></i>Living ' + (100 - Math.round(share)) + '%</span></div>' +
      '<dl class="fyu-bd__rows">' +
        '<div><dt>' + MO.icon('cap') + 'Tuition, full course</dt><dd>' + MO.range(d.tuition[0], d.tuition[1]) + '</dd></div>' +
        '<div><dt>' + MO.icon('home') + 'Living, ' + MO.living(d).replace(' / month', '/mo') + ' &times; ' + MO.years(d) + '</dt><dd>' + MO.range(liv[0], liv[1]) + '</dd></div>' +
        '<div><dt>' + MO.icon('airplane', true) + 'Flight from Chennai</dt><dd>' + MO.fare(d) + '<small>' + MO.hours(d) + ', ' + d.stops + '</small></dd></div>' +
        '<div><dt>' + MO.icon('globe') + 'Currency</dt><dd>' + d.currency + '<small>' + d.rate + '</small></dd></div>' +
      '</dl>' +
      '<p class="fyu-bd__verdict ' + verdict[0] + '">' + verdict[1] + '</p>' +
      '<p class="fyu-note">Estimate = tuition + monthly living &times; course length. Fares and rates as of ' + TRAVEL_AS_OF + '.</p>' +
      '<a class="btn btn--primary btn--block" href="' + MO.wa(msg) + '" target="_blank" rel="noopener">' + MO.icon('whatsapp', true) + 'Get the exact fees for ' + d.label + '</a>';
    var split = costOut.querySelector('.fyu-bd__split-t'); split.style.setProperty('--w', split.dataset.w);
  }
  costPick.addEventListener('change', renderCost);
  budget.addEventListener('input', renderCost);
  chart.addEventListener('click', function (e) {
    var row = e.target.closest('.fyu-bar[data-key]'); if (!row) return;
    costPick.querySelector('input[value="' + row.dataset.key + '"]').checked = true;
    renderCost();
    if (window.innerWidth < 900) costOut.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  renderCost();

  /* ================= 3. COMPARE (2 or 3 destinations) ================= */
  var MAX = 3, cmpPick = $('cmpPick'), table = $('cmpTable');
  var start = (params.get('cmp') || 'philippines,uzbekistan').split(',').filter(function (k) { return DESTINATIONS[k]; }).slice(0, MAX);
  if (start.length < 2) start = ['philippines', 'uzbekistan'];
  cmpPick.insertAdjacentHTML('beforeend', keys.map(function (k) {
    return '<label class="fyu-pick fyu-pick--check"><input type="checkbox" value="' + k + '"' + (start.indexOf(k) !== -1 ? ' checked' : '') + '><span>' + MO.icon('check') + DESTINATIONS[k].label + '</span></label>';
  }).join(''));

  // [label, value, number used to find the best (lowest), badge text]
  var GROUPS = [
    ['Money', [
      ['Tuition, full course', function (d) { return MO.range(d.tuition[0], d.tuition[1]); }, function (d) { return d.tuition[0]; }, 'Lowest'],
      ['Living cost', function (d) { return MO.living(d); }, function (d) { return d.living[0]; }, 'Lowest'],
      ['Estimated total', function (d) { var t = MO.total(d); return MO.range(t[0], t[1]); }, function (d) { return MO.total(d)[0]; }, 'Lowest']
    ]],
    ['Study', [
      ['Course length', function (d) { return MO.years(d); }],
      ['Local language', function (d) { return d.lang; }]
    ]],
    ['Travel & life', [
      ['Flight from Chennai', function (d) { return MO.hours(d) + ', ' + d.stops; }, function (d) { return (d.flight[0] + d.flight[1]) / 2; }, 'Shortest'],
      ['Airfare', function (d) { return MO.fare(d); }],
      ['Time vs India', function (d) { return d.tz; }],
      ['Climate', function (d) { return d.climate; }],
      ['Currency', function (d) { return d.currency + '<small>' + d.rate + '</small>'; }]
    ]]
  ];
  function renderCompare() {
    var chosen = all('input:checked', cmpPick).map(function (i) { return i.value; });
    all('input', cmpPick).forEach(function (i) { i.disabled = !i.checked && chosen.length >= MAX; i.parentNode.classList.toggle('is-locked', i.disabled); });
    $('cmpHint').textContent = chosen.length < 2 ? 'Pick at least two destinations to compare.'
      : chosen.length >= MAX ? 'Comparing the maximum of three — untick one to swap.' : 'Add one more if you like.';
    if (chosen.length < 2) { table.innerHTML = ''; table.parentNode.hidden = true; return; }
    table.parentNode.hidden = false;
    table.style.setProperty('--n', chosen.length);
    var D = chosen.map(function (k) { return DESTINATIONS[k]; });
    var html = '<thead><tr><td></td>' + D.map(function (d) { return '<th scope="col"><a href="' + d.page + '">' + d.label + MO.icon('arrow-right') + '</a></th>'; }).join('') + '</tr></thead><tbody>';
    GROUPS.forEach(function (g) {
      html += '<tr class="fyu-cmp-table__group"><th scope="rowgroup" colspan="' + (D.length + 1) + '">' + g[0] + '</th></tr>';
      g[1].forEach(function (row) {
        var best = null;
        if (row[2]) {
          var nums = D.map(row[2]), m = Math.min.apply(null, nums);
          if (nums.filter(function (n) { return n === m; }).length === 1) best = m;
        }
        html += '<tr><th scope="row">' + row[0] + '</th>' + D.map(function (d) {
          var isBest = best !== null && row[2](d) === best;
          return '<td' + (isBest ? ' class="is-best"' : '') + '>' + row[1](d) + (isBest ? '<em>' + row[3] + '</em>' : '') + '</td>';
        }).join('') + '</tr>';
      });
    });
    html += '<tr class="fyu-cmp-table__group"><th scope="rowgroup" colspan="' + (D.length + 1) + '">Why students choose it</th></tr>' +
      '<tr class="fyu-cmp-table__why"><th scope="row">Highlights</th>' + D.map(function (d) { return '<td><ul>' + d.why.map(function (w) { return '<li>' + w + '</li>'; }).join('') + '</ul></td>'; }).join('') + '</tr></tbody>';
    table.innerHTML = html;
    var names = D.map(function (d) { return d.label; });
    $('cmpAsk').href = MO.wa('Hi Mathura Overseas, I’m comparing ' + names.join(', ').replace(/, ([^,]*)$/, ' and $1') + (profile ? ' (' + profile + ')' : '') + '. Which would suit me?');
  }
  $('cmpAsOf').textContent = 'Tuition and living: MBBS Abroad Handbook 2026–27. Flights, fares and exchange rates: as of ' + TRAVEL_AS_OF + '. Estimated total = tuition + living for the course length.';
  cmpPick.addEventListener('change', renderCompare);
  renderCompare();

  /* ================= NMC CHECKLIST ================= */
  var ticks = all('#nmcTicks input'), bar = $('nmcBar');
  function renderTicks() {
    var n = ticks.filter(function (t) { return t.checked; }).length;
    $('nmcCount').textContent = n + ' of ' + ticks.length;
    $('nmcText').textContent = n === ticks.length ? 'all confirmed — ask us to double-check before you pay' : 'conditions confirmed';
    bar.style.setProperty('--off', (100 - n / ticks.length * 100).toFixed(1));
    bar.parentNode.parentNode.classList.toggle('is-done', n === ticks.length);
  }
  ticks.forEach(function (t) { t.addEventListener('change', renderTicks); });
  renderTicks();

  /* ================= CLOSING CTA ================= */
  function updateCta() {
    $('ctaWa').href = MO.wa('Hi Mathura Overseas, please make me a university shortlist' + (profile ? ' — ' + profile : '') + '.');
  }
  updateCta();
  $('ctaForm').addEventListener('submit', function (e) {
    e.preventDefault();
    MO.submitLead($('ctaPhone'), $('ctaMsg'), { source: 'find-university-cta', profile: profile || '', message: 'Hi Mathura Overseas, please make me a university shortlist' + (profile ? ' (' + profile + ')' : '') + '.' });
  });
});
