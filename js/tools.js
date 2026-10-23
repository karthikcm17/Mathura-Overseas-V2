// tools.js — shared calculators. Used by the home hero tool now; the Find University page will reuse the same data.
// KEEP THE NUMBERS BELOW CURRENT: update them here once and every page that uses them updates.

// NEET cutoffs for MBBS-abroad eligibility, by the year NEET was passed.
// A score stays valid for the exam year plus the following two years (different from admission inside India).
// TO ADD A YEAR: add one line (e.g. 2027: { general: 000, other: 000 }) and one <option> in the HTML select.
var NEET_CUTOFFS = {
  2026: { general: 213, other: 177 },
  2025: { general: 144, other: 113 },
  2024: { general: 162, other: 127 }
};
var PCB_REQUIREMENT = { general: 50, other: 40 };   // Class 12 PCB % required
var MIN_AGE = 17;                                    // by 31 Dec of the admission year

// Approx. tuition for the full course, in lakhs of rupees (excludes living costs). Source: MBBS Abroad Handbook 2026-27.
var COST_ESTIMATES = {
  philippines: { label: 'Philippines', low: 18, high: 35 },
  uzbekistan:  { label: 'Uzbekistan',  low: 15, high: 25 },
  russia:      { label: 'Russia',      low: 18, high: 32 },
  kyrgyzstan:  { label: 'Kyrgyzstan',  low: 18, high: 33 },
  vietnam:     { label: 'Vietnam',     low: 28, high: 45 },
  timor:       { label: 'Timor-Leste', low: 15, high: 20 }
};
var DESTINATION_DATA = {
  philippines: { label: 'Philippines', duration: '5.5\u20136.5 yrs', tuition: '\u20B918L\u201335L', living: '\u20B920k\u201335k/mo', climate: 'Tropical' },
  uzbekistan:  { label: 'Uzbekistan',  duration: '6 yrs',            tuition: '\u20B915L\u201325L', living: '\u20B912k\u201320k/mo', climate: 'Moderate' },
  russia:      { label: 'Russia',      duration: '6 yrs',            tuition: '\u20B918L\u201332L', living: '\u20B915k\u201325k/mo', climate: 'Cold' },
  kyrgyzstan:  { label: 'Kyrgyzstan',  duration: '6 yrs',            tuition: '\u20B918L\u201333L', living: '\u20B912k\u201320k/mo', climate: 'Cold winters' },
  vietnam:     { label: 'Vietnam',     duration: '6 yrs',            tuition: '\u20B928L\u201345L', living: '\u20B918k\u201330k/mo', climate: 'Tropical' },
  timor:       { label: 'Timor-Leste', duration: '5.5 yrs',          tuition: '\u20B915L\u201320L', living: '\u20B915k\u201325k/mo', climate: 'Tropical' }
};

// ---- Lead capture settings ----
var WHATSAPP_NUMBER = '919360859919';
// Paste your Google Apps Script web-app URL here (the same one your apply form posts to) and call-back requests are saved to your sheet.
// While this is empty, "Call me" opens WhatsApp with the visitor's details instead, so no lead is lost.
var LEAD_ENDPOINT = '';

// Budget bands (in lakhs of rupees) used by the Cost tab. Edit the labels/values here.
var BUDGET_BANDS = {
  b1: { min: 0,  max: 15 },
  b2: { min: 15, max: 25 },
  b3: { min: 25, max: 35 },
  b4: { min: 35, max: 999 }
};

function toolIcon(name) { return '<svg class="icon" aria-hidden="true"><use href="#i-' + name + '"></use></svg>'; }
function waLink(message) { return 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(message); }
function badgeIcon(pass, name) { return '<span class="icon-badge icon-badge--sm icon-badge--' + (pass ? 'teal' : 'pink') + '">' + toolIcon(name) + '</span>'; }
function checkTile(pass, label, detail) {
  return '<div class="check-tile">' + badgeIcon(pass, pass ? 'check' : 'close') + '<strong>' + label + '</strong><span>' + detail + '</span></div>';
}
function emptyState(icon, text) { return '<div class="tool__empty">' + toolIcon(icon) + '<p>' + text + '</p></div>'; }

document.addEventListener('DOMContentLoaded', function () {
  var tool = document.getElementById('heroTool');
  if (!tool) return;
  function $(id) { return document.getElementById(id); }

  // ---- Tabs + mobile bottom sheet. The body keeps one fixed height, so switching tabs never changes the card size. ----
  var tabs = tool.querySelectorAll('.tool__tab');
  var panels = tool.querySelectorAll('.tool__panel');
  var PANEL_FOR = { elig: 'toolElig', cost: 'toolCost', cmp: 'toolCmp' };
  function selectTab(key) {
    var id = PANEL_FOR[key] || PANEL_FOR.elig;
    tabs.forEach(function (t) { t.setAttribute('aria-selected', t.getAttribute('aria-controls') === id ? 'true' : 'false'); });
    panels.forEach(function (p) { p.hidden = p.id !== id; });
  }
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var id = tab.getAttribute('aria-controls');
      selectTab(Object.keys(PANEL_FOR).filter(function (k) { return PANEL_FOR[k] === id; })[0]);
    });
  });
  var scrim = $('toolScrim');
  function openSheet(key) { selectTab(key); tool.classList.add('is-open'); scrim.classList.add('is-open'); document.body.classList.add('sheet-open'); }
  function closeSheet() { tool.classList.remove('is-open'); scrim.classList.remove('is-open'); document.body.classList.remove('sheet-open'); }
  document.querySelectorAll('[data-open-tool]').forEach(function (b) { b.addEventListener('click', function () { openSheet(b.dataset.openTool); }); });
  $('toolClose').addEventListener('click', closeSheet);
  scrim.addEventListener('click', closeSheet);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheet(); });
  window.addEventListener('resize', function () { if (window.innerWidth >= 768) closeSheet(); });

  // ---- Eligibility: the result replaces the form (same space) and ends with a lead-capture step ----
  var formView = $('eligFormView'), resultView = $('eligResultView'), eligResult = $('eligResult');

  function leadBlock(eligible, message) {
    return '<div class="lead-cta">' +
      '<p class="lead-cta__title">' + (eligible
        ? 'You\u2019re on track \u2014 get a free university shortlist.'
        : 'Not a match yet? A counsellor can check for exceptions \u2014 free.') + '</p>' +
      '<a class="btn btn--primary btn--block" href="' + waLink(message) + '" target="_blank" rel="noopener">' + toolIcon('whatsapp').replace('class="icon"', 'class="icon icon--fill"') + (eligible ? 'Get my shortlist on WhatsApp' : 'Ask a counsellor on WhatsApp') + '</a>' +
      '<form class="lead-cta__form" id="leadForm" novalidate>' +
        '<input type="tel" id="leadPhone" placeholder="Your mobile number" inputmode="tel" autocomplete="tel" aria-label="Mobile number">' +
        '<button type="submit" class="btn btn--outline btn--sm">Call me back</button>' +
      '</form>' +
      '<p class="lead-cta__msg" id="leadMsg" role="status"></p>' +
    '</div>';
  }

  function submitLead(context) {
    var msg = $('leadMsg');
    var phone = $('leadPhone').value.replace(/[\s\-()]/g, '').replace(/^\+?91/, '');
    if (!/^[6-9]\d{9}$/.test(phone)) { msg.textContent = 'Please enter a valid 10-digit mobile number.'; return; }
    var payload = Object.assign({ phone: phone, source: 'home-hero-tool', page: location.pathname }, context);
    if (LEAD_ENDPOINT) {
      msg.textContent = 'Sending\u2026';
      fetch(LEAD_ENDPOINT, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(payload) })
        .then(function () { msg.textContent = 'Thank you! A counsellor will call you soon.'; })
        .catch(function () { msg.textContent = 'Could not send. Please use the WhatsApp button above.'; });
    } else {
      window.open(waLink(context.message + ' Please call me on ' + phone + '.'), '_blank');
      msg.textContent = 'Opening WhatsApp so we get your details\u2026';
    }
  }

  $('eligForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var score = parseFloat($('inNeetScore').value), pcb = parseFloat($('inPcb').value), age = parseFloat($('inAge').value);
    var year = $('inPassedYear').value, community = $('inCommunity').value;
    if (isNaN(score) || isNaN(pcb) || isNaN(age)) {
      eligResult.innerHTML = '<div class="verdict">' + badgeIcon(false, 'close') + '<span>Please fill in every field to check your eligibility.</span></div>';
    } else {
      var cutoff = NEET_CUTOFFS[year][community], pcbNeeded = PCB_REQUIREMENT[community];
      var label = community === 'general' ? 'General' : 'OBC / SC / ST';
      var scoreOk = score >= cutoff, pcbOk = pcb >= pcbNeeded, ageOk = age >= MIN_AGE;
      var eligible = scoreOk && pcbOk && ageOk;
      var profile = 'NEET ' + score + ' (' + year + '), ' + label + ', PCB ' + pcb + '%, age ' + age;
      var message = 'Hi Mathura Overseas, I checked my eligibility on your website: ' + profile + '. ' +
        (eligible ? 'I meet the criteria. Please suggest suitable universities for me.' : 'I don\u2019t meet all criteria yet. Can a counsellor check if any exceptions apply?');
      eligResult.innerHTML =
        '<div class="verdict">' + badgeIcon(eligible, eligible ? 'check' : 'close') + '<span>' + (eligible
          ? 'You meet the baseline eligibility criteria for MBBS abroad.'
          : 'You don\u2019t meet all criteria yet \u2014 but exceptions may apply.') + '</span></div>' +
        '<div class="check-tiles">' +
          checkTile(scoreOk, 'NEET', score + ' / min ' + cutoff) +
          checkTile(pcbOk, 'PCB', pcb + '% / min ' + pcbNeeded + '%') +
          checkTile(ageOk, 'Age', age + ' / min ' + MIN_AGE) +
        '</div>' + leadBlock(eligible, message);
      $('leadForm').addEventListener('submit', function (ev) {
        ev.preventDefault();
        submitLead({ result: eligible ? 'eligible' : 'not-eligible', neetScore: score, neetYear: year, community: label, pcb: pcb, age: age, message: message });
      });
    }
    formView.hidden = true; resultView.hidden = false;
  });
  $('eligEdit').addEventListener('click', function () { resultView.hidden = true; formView.hidden = false; });

  // ---- Cost: result appears once a destination is chosen; an optional budget adds a fit message ----
  function renderCost() {
    var est = COST_ESTIMATES[$('inCostCountry').value];
    if (!est) { $('costResult').innerHTML = emptyState('briefcase', 'Select a destination to see the estimated cost.'); return; }
    var band = BUDGET_BANDS[$('inCostBudget').value], fit = '';
    if (band) {
      fit = band.min >= est.high ? 'Your budget is above the typical range here \u2014 you have room to spare.'
          : band.max <= est.low ? 'Your budget is below the typical range here \u2014 ask us about lower-cost options.'
          : 'Your budget is within the typical range here.';
    }
    $('costResult').innerHTML =
      '<div class="cost-figure">\u20B9' + est.low + 'L \u2013 \u20B9' + est.high + 'L</div>' +
      '<p class="cost-note">Approx. tuition for the full course in ' + est.label + ' (excludes living costs).</p>' +
      (fit ? '<p class="cost-fit">' + fit + '</p>' : '') +
      '<a class="btn btn--link" href="' + waLink('Hi Mathura Overseas, I\u2019d like to know more about MBBS in ' + est.label + '.') + '" target="_blank" rel="noopener">Ask a counsellor about ' + est.label + ' ' + toolIcon('arrow-right') + '</a>';
  }
  $('inCostCountry').addEventListener('change', renderCost);
  $('inCostBudget').addEventListener('change', renderCost);
  renderCost();

  // ---- Compare: result appears once two different destinations are chosen ----
  function renderCompare() {
    var a = $('inCmpA').value, b = $('inCmpB').value;
    if (!a || !b) { $('cmpResult').innerHTML = emptyState('users', 'Select two destinations to compare them.'); return; }
    if (a === b) { $('cmpResult').innerHTML = emptyState('users', 'Pick two different destinations to compare.'); return; }
    var A = DESTINATION_DATA[a], B = DESTINATION_DATA[b];
    $('cmpResult').innerHTML = '<table class="mini-table"><thead><tr><th></th><th>' + A.label + '</th><th>' + B.label + '</th></tr></thead><tbody>' +
      '<tr><th>Duration</th><td>' + A.duration + '</td><td>' + B.duration + '</td></tr>' +
      '<tr><th>Tuition</th><td>' + A.tuition + '</td><td>' + B.tuition + '</td></tr>' +
      '<tr><th>Living</th><td>' + A.living + '</td><td>' + B.living + '</td></tr>' +
      '<tr><th>Climate</th><td>' + A.climate + '</td><td>' + B.climate + '</td></tr></tbody></table>' +
      '<a class="btn btn--link" href="' + waLink('Hi Mathura Overseas, I\u2019m comparing ' + A.label + ' and ' + B.label + '. Can you guide me?') + '" target="_blank" rel="noopener">Get a counsellor\u2019s opinion ' + toolIcon('arrow-right') + '</a>';
  }
  $('inCmpA').addEventListener('change', renderCompare);
  $('inCmpB').addEventListener('change', renderCompare);
  renderCompare();
});
