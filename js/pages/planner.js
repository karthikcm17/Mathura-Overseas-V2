// planner.js — the MBBS Planner page (mbbs-abroad-planner.html). Needs js/tools.js loaded first: ALL numbers live there.
// This file only does the maths and the drawing.
// The home-page quick planner links here with what the visitor already typed, e.g.
//   ?score=250&cat=general#eligibility   ?budget=25#cost   ?cmp=philippines,uzbekistan#compare
document.addEventListener('DOMContentLoaded', function () {
  if (typeof MO === 'undefined') return;
  function $(id) { return document.getElementById(id); }
  function all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function setVar(el, name, value) { el.style.setProperty(name, value); }
  var params = new URLSearchParams(location.search);
  var keys = Object.keys(DESTINATIONS);
  var profile = null;   // set once eligibility is complete; reused in WhatsApp messages

  /* ================= TABS (deep-linkable: #eligibility, #cost, #compare) ================= */
  var tabs = all('.pl-switch__tab'), panels = all('.pl-panel'), IDS = ['eligibility', 'cost', 'compare'];
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
  window.addEventListener('hashchange', function () { selectTab(location.hash.slice(1), true); });
  var startTab = location.hash.slice(1);
  if (IDS.indexOf(startTab) !== -1) { selectTab(startTab); setTimeout(function () { $('tools').scrollIntoView({ block: 'start' }); }, 60); }

  /* ================= NUMBERS FROM tools.js (rules, facts, FAQ) ================= */
  var latest = MO.latestYear();
  var WORDS = ['zero', 'one', 'two', 'three', 'four', 'five'];
  var fills = {
    pcb: PCB_REQUIREMENT.general + '% General · ' + PCB_REQUIREMENT.other + '% OBC / SC / ST',
    age: MIN_AGE + ' by 31 December',
    valid: (NEET_VALID_EXTRA_YEARS + 1) + ' admission years',
    extra: WORDS[NEET_VALID_EXTRA_YEARS] || NEET_VALID_EXTRA_YEARS,
    year: latest, 'cut-general': NEET_CUTOFFS[latest].general, 'cut-other': NEET_CUTOFFS[latest].other,
    'pcb-general': PCB_REQUIREMENT.general + '%', 'pcb-other': PCB_REQUIREMENT.other + '%', 'age-num': MIN_AGE, asof: TRAVEL_AS_OF
  };
  all('[data-fill]').forEach(function (el) { if (fills[el.dataset.fill] !== undefined) el.textContent = fills[el.dataset.fill]; });
  $('cutoffRows').innerHTML = Object.keys(NEET_CUTOFFS).sort().reverse().map(function (y, i) {
    return '<div class="pl-cutoff' + (i === 0 ? ' is-latest' : '') + '">' +
      '<div class="pl-cutoff__year"><b>NEET ' + y + '</b>' + (i === 0 ? '<em>Latest</em>' : '') + '</div>' +
      '<dl><div><dt>General</dt><dd>' + NEET_CUTOFFS[y].general + '</dd></div><div><dt>OBC / SC / ST</dt><dd>' + NEET_CUTOFFS[y].other + '</dd></div></dl>' +
      '<span class="pl-cutoff__until">Valid up to the ' + (+y + NEET_VALID_EXTRA_YEARS) + ' intake</span></div>';
  }).join('');

  /* ================= 1. ELIGIBILITY (live) ================= */
  var form = $('eligForm');
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  function cat() { return form.querySelector('input[name="category"]:checked').value; }
  function val(id) { var v = $(id).value; return v === '' ? NaN : parseFloat(v); }

  // Hand-off from the home page
  if (params.get('cat') && CATEGORIES[params.get('cat')]) { var c = form.querySelector('input[name="category"][value="' + params.get('cat') + '"]'); if (c) c.checked = true; }
  if (params.get('score') && !isNaN(parseFloat(params.get('score')))) {
    $('inNeetScore').value = parseFloat(params.get('score'));
    $('eligHandoff').hidden = false;
    if (startTab === 'eligibility') setTimeout(function () { $('inPcb').focus({ preventScroll: true }); }, 400);
  }

  function checkRow(label, v, min, unit, max) {
    var state = isNaN(v) ? 'is-pending' : (v >= min ? 'is-ok' : 'is-short');
    var gap = MO.num(v - min);
    var note = isNaN(v) ? 'Minimum ' + min + unit
      : v >= min ? (gap > 0 ? gap + unit + ' above minimum' : 'Meets the minimum') : (-gap) + unit + ' short of ' + min + unit;
    return '<li class="pl-check ' + state + '">' +
      '<span class="pl-check__dot">' + MO.icon(state === 'is-short' ? 'close' : 'check') + '</span>' +
      '<div class="pl-check__body">' +
        '<div class="pl-check__top"><b>' + label + '</b><span>' + (isNaN(v) ? '–' : v + unit) + '</span></div>' +
        '<div class="pl-check__track"><i class="pl-check__fill" data-s="' + (isNaN(v) ? 0 : Math.min(v / max, 1)).toFixed(3) + '"></i><i class="pl-check__min" data-l="' + Math.min(min / max * 100, 100).toFixed(1) + '%"></i></div>' +
        '<small>' + note + '</small>' +
      '</div></li>';
  }

  function renderElig() {
    var score = val('inNeetScore'), pcb = val('inPcb'), age = val('inAge');
    var y = $('inNeetYear').value, r = MO.rules(y, cat());
    $('eligChecks').innerHTML =
      checkRow('NEET score', score, r.neet, '', 720) +
      checkRow('Class 12 PCB', pcb, r.pcb, '%', 100) +
      checkRow('Age', age, r.age, '', 25);
    all('.pl-check__fill', $('eligChecks')).forEach(function (b) { setVar(b, '--s', b.dataset.s); });
    all('.pl-check__min', $('eligChecks')).forEach(function (m) { setVar(m, '--l', m.dataset.l); });

    var vals = [score >= r.neet, pcb >= r.pcb, age >= r.age], filled = [score, pcb, age].filter(function (v) { return !isNaN(v); }).length;
    var passed = vals.filter(Boolean).length, done = filled === 3, eligible = done && passed === 3;
    var verdict = $('eligVerdict');
    verdict.className = 'pl-verdict' + (done ? (eligible ? ' is-ok' : ' is-short') : '');
    setVar($('eligRing'), '--off', (100 - passed / 3 * 100).toFixed(1));
    $('eligCount').textContent = passed + '/3';
    $('eligTitle').textContent = !done ? (filled ? 'Keep going…' : 'Your result') : eligible ? 'You’re eligible for MBBS abroad' : 'Not eligible yet';
    $('eligSub').textContent = !done ? (3 - filled) + ' detail' + (3 - filled === 1 ? '' : 's') + ' left · ' + r.label + ' · NEET ' + y
      : eligible ? 'You meet every rule for ' + r.label + ', NEET ' + y + '.' : (3 - passed) + ' of 3 rules not met yet.';

    var after = $('eligAfter');
    if (!done) { after.hidden = true; profile = null; updateCta(); return; }
    profile = 'NEET ' + score + ' (' + y + '), ' + r.label + ', PCB ' + pcb + '%, age ' + age;
    var msg = 'Hi Mathura Overseas, I checked my eligibility on your website: ' + profile + '. ' +
      (eligible ? 'I meet the criteria — please suggest suitable universities.' : 'I don’t meet every criterion yet — can a counsellor check my options?');
    var keep = { phone: $('eligPhone') ? $('eligPhone').value : '' };
    after.innerHTML =
      '<p class="pl-valid">' + MO.icon('clock') + '<span>Your NEET ' + y + ' score counts for admissions up to the <b>' + (+y + NEET_VALID_EXTRA_YEARS) + ' intake</b>.</span></p>' +
      (eligible
        ? '<div class="pl-next"><button type="button" data-tab="cost">' + MO.icon('wallet') + 'Plan the cost' + MO.icon('arrow-right') + '</button><button type="button" data-tab="compare">' + MO.icon('columns') + 'Compare' + MO.icon('arrow-right') + '</button></div>'
        : (!vals[0] ? '<p class="pl-tip">' + MO.icon('info') + '<span>Have a higher score from an earlier year? Scores from NEET ' + (+latest - NEET_VALID_EXTRA_YEARS) + ' onwards still count &mdash; change the year.</span></p>' : '')) +
      '<div class="pl-lead"><b>' + (eligible ? 'Get your free university shortlist' : 'A counsellor can explain your options &mdash; free') + '</b>' +
        '<a class="btn btn--primary btn--block" href="' + MO.wa(msg) + '" target="_blank" rel="noopener">' + MO.icon('whatsapp', true) + (eligible ? 'Get my shortlist on WhatsApp' : 'Ask on WhatsApp') + '</a>' +
        '<form class="pl-callback" id="eligLead" novalidate><label class="sr-only" for="eligPhone">Mobile number</label><input type="tel" id="eligPhone" placeholder="Mobile for a call-back" inputmode="tel" autocomplete="tel"><button type="submit" class="btn btn--outline btn--sm">Call me</button></form>' +
        '<p class="pl-callback__msg" id="eligMsg" role="status"></p></div>';
    $('eligPhone').value = keep.phone;
    after.hidden = false;
    all('[data-tab]', after).forEach(function (b) { b.addEventListener('click', function () { selectTab(b.dataset.tab, true); }); });
    $('eligLead').addEventListener('submit', function (ev) {
      ev.preventDefault();
      MO.submitLead($('eligPhone'), $('eligMsg'), { source: 'planner-eligibility', result: eligible ? 'eligible' : 'not-eligible', profile: profile, message: msg });
    });
    updateCta();
  }
  ['inNeetScore', 'inPcb', 'inAge', 'inNeetYear'].forEach(function (id) { $(id).addEventListener('input', renderElig); });
  all('input[name="category"]', form).forEach(function (r) { r.addEventListener('change', renderElig); });

  /* ================= 2. COST ================= */
  // Destination picker cards (shared look with Compare): name + tuition range
  function destCard(type, name, k, checked) {
    var d = DESTINATIONS[k];
    return '<label class="pl-dest"><input type="' + type + '" name="' + name + '" value="' + k + '"' + (checked ? ' checked' : '') + '>' +
      '<span class="pl-dest__box"><span class="pl-dest__tick" aria-hidden="true">' + MO.icon('check') + '</span>' +
      '<b>' + d.label + '</b><small>' + MO.range(d.tuition[0], d.tuition[1]) + ' tuition</small></span></label>';
  }
  var costPick = $('costPick'), budget = $('costBudget'), costOut = $('costOut'), chart = $('costChart');
  costPick.insertAdjacentHTML('beforeend', '<div class="pl-dests__grid">' + keys.map(function (k) { return destCard('radio', 'costDest', k, k === 'philippines'); }).join('') + '</div>');
  var maxTotal = Math.max.apply(null, keys.map(function (k) { return MO.total(DESTINATIONS[k])[1]; }));
  var SCALE = Math.ceil(maxTotal / 10) * 10;     // chart right edge, rounded up to the next ₹10L
  budget.max = SCALE;
  $('costBudgetMax').textContent = '₹' + SCALE + 'L+';
  if (params.get('budget')) {
    // the home page sends a TUITION budget; here the budget covers tuition + living, so start a little higher
    var b = parseInt(params.get('budget'), 10);
    if (!isNaN(b)) budget.value = Math.min(SCALE, Math.max(10, Math.round(b * 1.5)));
  }

  chart.innerHTML = keys.map(function (k) {
    var d = DESTINATIONS[k], t = MO.total(d);
    return '<button type="button" class="pl-bar" data-key="' + k + '" aria-pressed="false">' +
      '<span class="pl-bar__name">' + d.label + '</span>' +
      '<span class="pl-bar__track">' +
        '<i class="pl-bar__total" data-l="' + MO.pct(t[0], SCALE) + '" data-w="' + MO.pct(t[1] - t[0], SCALE) + '"></i>' +
        '<i class="pl-bar__tuition" data-l="' + MO.pct(d.tuition[0], SCALE) + '" data-w="' + MO.pct(d.tuition[1] - d.tuition[0], SCALE) + '"></i>' +
      '</span>' +
      '<span class="pl-bar__val">' + MO.range(t[0], t[1]) + '</span></button>';
  }).join('') +
    '<div class="pl-bar pl-bar--axis" aria-hidden="true"><span></span><span class="pl-bar__ticks">' +
      [0, 1, 2, 3, 4, 5].map(function (i) { var v = Math.round(SCALE / 5 * i); return '<i>' + (v === 0 ? '₹0' : v + 'L') + '</i>'; }).join('') +
    '</span><span></span></div>';
  all('.pl-bar__track i', chart).forEach(function (i) { setVar(i, '--l', i.dataset.l); setVar(i, '--w', i.dataset.w); });

  function renderCost() {
    var k = costPick.querySelector('input:checked').value, d = DESTINATIONS[k];
    var v = parseInt(budget.value, 10), max = parseInt(budget.max, 10);
    var liv = MO.livingTotal(d), tot = MO.total(d);
    $('costBudgetOut').textContent = '₹' + v + 'L' + (v >= max ? '+' : '');
    setVar(budget, '--fill', ((v - 10) / (max - 10) * 100).toFixed(1) + '%');
    setVar(chart, '--b', MO.pct(v, SCALE));
    all('.pl-bar[data-key]', chart).forEach(function (row) {
      var on = row.dataset.key === k; row.classList.toggle('is-selected', on); row.setAttribute('aria-pressed', on ? 'true' : 'false');
      row.classList.toggle('is-out', MO.total(DESTINATIONS[row.dataset.key])[0] > v);
    });
    var verdict = v >= tot[1] ? ['is-ok', 'check', 'Your ₹' + v + 'L budget covers even the higher estimate.']
      : v >= tot[0] ? ['is-mid', 'info', 'Your ₹' + v + 'L budget covers the lower end — university choice will matter.']
      : ['is-short', 'info', 'About ₹' + MO.num(tot[0] - v) + 'L below the lowest estimate here.'];
    var midT = (d.tuition[0] + d.tuition[1]) / 2, midL = (liv[0] + liv[1]) / 2, share = Math.round(midT / (midT + midL) * 100);
    var msg = 'Hi Mathura Overseas, please share the exact fee structure for MBBS in ' + d.label + '. My total budget is about ₹' + v + 'L' + (profile ? ' (' + profile + ')' : '') + '.';
    costOut.innerHTML =
      '<div class="pl-total">' +
        '<span class="pl-label">Estimated full course &middot; <a href="' + d.page + '">' + d.label + MO.icon('arrow-right') + '</a></span>' +
        '<b>' + MO.range(tot[0], tot[1]) + '</b>' +
        '<div class="pl-split" aria-hidden="true"><i data-w="' + share + '%"></i></div>' +
        '<div class="pl-split__key"><span><i class="pl-legend__t"></i>Tuition ' + share + '%</span><span><i class="pl-legend__l"></i>Living ' + (100 - share) + '%</span></div>' +
      '</div>' +
      '<dl class="pl-rows">' +
        '<div><dt>' + MO.icon('cap') + 'Tuition, full course</dt><dd>' + MO.range(d.tuition[0], d.tuition[1]) + '</dd></div>' +
        '<div><dt>' + MO.icon('home') + 'Living <small>' + MO.living(d).replace(' / month', '/mo') + ' &times; ' + MO.years(d) + '</small></dt><dd>' + MO.range(liv[0], liv[1]) + '</dd></div>' +
        '<div><dt>' + MO.icon('airplane', true) + 'Flight from Chennai <small>' + MO.hours(d) + ', ' + d.stops + '</small></dt><dd>' + MO.fare(d).replace(' one-way', '') + '<small>one-way</small></dd></div>' +
        '<div><dt>' + MO.icon('globe') + 'Currency <small>' + d.currency + '</small></dt><dd>' + d.rate.replace('1 INR ≈ ', '') + '<small>per ₹1</small></dd></div>' +
      '</dl>' +
      '<p class="pl-status ' + verdict[0] + '">' + MO.icon(verdict[1]) + '<span>' + verdict[2] + '</span></p>' +
      '<a class="btn btn--primary btn--block" href="' + MO.wa(msg) + '" target="_blank" rel="noopener">' + MO.icon('whatsapp', true) + 'Get exact fees for ' + d.label + '</a>' +
      '<p class="pl-note">Tuition + monthly living &times; course length. Fares and rates as of ' + TRAVEL_AS_OF + '.</p>';
    var split = costOut.querySelector('.pl-split i'); setVar(split, '--w', split.dataset.w);
  }
  costPick.addEventListener('change', renderCost);
  budget.addEventListener('input', renderCost);
  chart.addEventListener('click', function (e) {
    var row = e.target.closest('.pl-bar[data-key]'); if (!row) return;
    costPick.querySelector('input[value="' + row.dataset.key + '"]').checked = true;
    renderCost();
    costOut.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  /* ================= 3. COMPARE (2 or 3 destinations) ================= */
  var MAX = 3, cmpPick = $('cmpPick'), table = $('cmpTable');
  var start = (params.get('cmp') || 'philippines,uzbekistan').split(',').filter(function (k) { return DESTINATIONS[k]; }).slice(0, MAX);
  if (start.length < 2) start = ['philippines', 'uzbekistan'];
  cmpPick.insertAdjacentHTML('beforeend', '<div class="pl-dests__grid">' + keys.map(function (k) { return destCard('checkbox', 'cmpDest', k, start.indexOf(k) !== -1); }).join('') + '</div>');

  // [label, value, number used to find the best (lowest), badge text]
  var GROUPS = [
    ['Money', [
      ['Tuition, full course', function (d) { return MO.range(d.tuition[0], d.tuition[1]); }, function (d) { return d.tuition[0]; }, 'Lowest'],
      ['Living cost', function (d) { return MO.living(d).replace(' / month', '<small>per month</small>'); }, function (d) { return d.living[0]; }, 'Lowest'],
      ['Estimated total', function (d) { var t = MO.total(d); return MO.range(t[0], t[1]); }, function (d) { return MO.total(d)[0]; }, 'Lowest']
    ]],
    ['Study', [
      ['Course length', function (d) { return MO.years(d); }],
      ['Local language', function (d) { return d.lang; }]
    ]],
    ['Travel & life', [
      ['Flight from Chennai', function (d) { return MO.hours(d) + '<small>' + d.stops + '</small>'; }, function (d) { return (d.flight[0] + d.flight[1]) / 2; }, 'Shortest'],
      ['Airfare', function (d) { return d.fare ? MO.fare(d).replace(' one-way', '') + '<small>one-way</small>' : d.fareText; }],
      ['Time vs India', function (d) { return d.tz; }],
      ['Climate', function (d) { return d.climate; }],
      ['Currency', function (d) { return d.currency + '<small>' + d.rate + '</small>'; }]
    ]]
  ];
  function renderCompare() {
    var chosen = all('input:checked', cmpPick).map(function (i) { return i.value; });
    all('input', cmpPick).forEach(function (i) { i.disabled = !i.checked && chosen.length >= MAX; i.closest('.pl-dest').classList.toggle('is-locked', i.disabled); });
    $('cmpHint').textContent = chosen.length < 2 ? 'Pick at least two destinations.'
      : chosen.length >= MAX ? 'Comparing three — untick one to swap.' : chosen.length + ' selected · add one more if you like.';
    if (chosen.length < 2) {
      table.innerHTML = '<tbody><tr><td class="pl-cmp__empty">' + MO.icon('columns') + 'Pick at least two destinations to see them side by side.</td></tr></tbody>';
      table.classList.add('is-empty'); return;
    }
    table.classList.remove('is-empty');
    setVar(table, '--n', chosen.length);
    var D = chosen.map(function (k) { return DESTINATIONS[k]; });
    var html = '<thead><tr><td></td>' + D.map(function (d) { return '<th scope="col"><a href="' + d.page + '">' + d.label + MO.icon('arrow-right') + '</a></th>'; }).join('') + '</tr></thead><tbody>';
    GROUPS.forEach(function (g) {
      html += '<tr class="pl-cmp__group"><th scope="rowgroup" colspan="' + (D.length + 1) + '">' + g[0] + '</th></tr>';
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
    html += '<tr class="pl-cmp__group"><th scope="rowgroup" colspan="' + (D.length + 1) + '">Why students choose it</th></tr>' +
      '<tr class="pl-cmp__why"><th scope="row">Highlights</th>' + D.map(function (d) { return '<td><ul>' + d.why.map(function (w) { return '<li>' + w + '</li>'; }).join('') + '</ul></td>'; }).join('') + '</tr></tbody>';
    table.innerHTML = html;
    var names = D.map(function (d) { return d.label; });
    $('cmpAsk').href = MO.wa('Hi Mathura Overseas, I’m comparing ' + names.join(', ').replace(/, ([^,]*)$/, ' and $1') + (profile ? ' (' + profile + ')' : '') + '. Which would suit me?');
  }
  $('cmpAsOf').textContent = 'Tuition and living: MBBS Abroad Handbook 2026–27. Flights, fares and exchange rates as of ' + TRAVEL_AS_OF + '.';
  cmpPick.addEventListener('change', renderCompare);

  /* ================= NMC CHECKLIST ================= */
  var ticks = all('#nmcTicks input'), bar = $('nmcBar');
  function renderTicks() {
    var n = ticks.filter(function (t) { return t.checked; }).length;
    $('nmcCount').textContent = n + ' of ' + ticks.length;
    $('nmcText').textContent = n === ticks.length ? 'all confirmed — ask us to double-check before you pay' : 'conditions confirmed';
    setVar(bar, '--off', (100 - n / ticks.length * 100).toFixed(1));
    bar.parentNode.parentNode.classList.toggle('is-done', n === ticks.length);
  }
  ticks.forEach(function (t) { t.addEventListener('change', renderTicks); });

  /* ================= CLOSING CTA ================= */
  function updateCta() {
    $('ctaWa').href = MO.wa('Hi Mathura Overseas, please make me a university shortlist' + (profile ? ' — ' + profile : '') + '.');
  }
  $('ctaForm').addEventListener('submit', function (e) {
    e.preventDefault();
    MO.submitLead($('ctaPhone'), $('ctaMsg'), { source: 'planner-cta', profile: profile || '', message: 'Hi Mathura Overseas, please make me a university shortlist' + (profile ? ' (' + profile + ')' : '') + '.' });
  });

  renderElig(); renderCost(); renderCompare(); renderTicks(); updateCta();
});
