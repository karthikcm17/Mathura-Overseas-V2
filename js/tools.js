// tools.js — THE NUMBERS FILE. Every figure used by the planning tools lives here, and only here.
// Used by: index.html (quick planner in the hero) and mbbs-abroad-planner.html (full tools).
// Update a number once and both pages change. Nothing below the "helpers" line needs editing.

/* ======================= ELIGIBILITY ======================= */
// NEET qualifying score for MBBS abroad, by the year NEET was passed.
// TO ADD A YEAR: add one line (e.g. 2027: { general: 000, other: 000 }) and one <option> in each page's NEET-year select.
var NEET_CUTOFFS = {
  2026: { general: 213, other: 177 },
  2025: { general: 144, other: 113 },
  2024: { general: 162, other: 127 }
};
// A NEET score stays valid for MBBS abroad for the exam year plus this many following years.
var NEET_VALID_EXTRA_YEARS = 2;
var PCB_REQUIREMENT = { general: 50, other: 40 };   // Class 12 Physics-Chemistry-Biology %, minimum
var MIN_AGE = 17;                                    // by 31 December of the admission year
// Categories shown as buttons. "group" says which cutoff column applies.
var CATEGORIES = {
  general: { label: 'General', group: 'general' },
  obc:     { label: 'OBC',     group: 'other' },
  scst:    { label: 'SC / ST', group: 'other' }
};

/* ======================= COUNTRIES (home page + MBBS Planner) ======================= */
// ONLY countries where we list universities with a confirmed fee (_data/universities.yml). Every figure is a
// STARTING figure: the LOWEST fee among the universities we list, so families see "from ₹…" and ask us for the rest.
//
//   fee       lowest yearly tuition we list, in lakhs (the university it comes from is in the comment)
//   feeYears  how many years that tuition is paid for (Timor-Leste charges 4.5 study years; Mauritius 5)
//   course    OPTIONAL. Use instead of fee × feeYears when a country charges ONE full-course fee (Nepal)
//   years     course length in the country, internship included (living is counted for these years)
//   length    the course length as shown
//   living    hostel & meals, per month, in thousands — the LOW end on that country's page
//   why       one short reason, from the country page (_data/countries.yml)
// Kazakhstan (no universities listed since the 7-year course) and the Caribbean (a US-licensing route, not for
// practice in India) are left out on purpose. To add a country, copy one line and change the values.
// Fees: universities.yml, checked Nov 2026 · living: each country page, Sep–Nov 2026 · US$1 = ₹95 (26 Oct 2026).
var DESTINATIONS = {
  philippines: { label: 'Philippines', page: 'mbbs-in-philippines.html',    fee: 2.8, feeYears: 6,   years: 6,   length: '~6–7 yrs incl. pre-med', living: 18,
    why: 'English in class, on the ward and at the corner shop' },                       // Lyceum-Northwestern
  uzbekistan:  { label: 'Uzbekistan',  page: 'mbbs-in-uzbekistan.html',     fee: 3.3, feeYears: 6,   years: 6,   length: '6 yrs', living: 11,
    why: 'Government universities with decades of teaching' },                          // Tashkent, Bukhara, Andijan, Fergana
  russia:      { label: 'Russia',      page: 'mbbs-in-russia.html',         fee: 4.4, feeYears: 6,   years: 6,   length: '6 yrs', living: 12,
    why: 'Large university teaching hospitals' },                                       // Rostov State Medical University
  kyrgyzstan:  { label: 'Kyrgyzstan',  page: 'mbbs-in-kyrgyzstan.html',     fee: 3.3, feeYears: 6,   years: 6,   length: '6 yrs', living: 10,
    why: 'Only universities that passed the 2026 accreditation' },                      // Asian International University
  vietnam:     { label: 'Vietnam',     page: 'mbbs-in-vietnam.html',        fee: 3.9, feeYears: 6,   years: 6,   length: '6 yrs', living: 10,
    why: 'English programmes built for Indian students' },                              // Dai Nam University
  timor:       { label: 'Timor-Leste', page: 'mbbs-in-timor-uct-timor.html', fee: 2.5, feeYears: 4.5, years: 5.5, length: '5.5 yrs', living: 12.5,
    why: 'Taught on India’s own CBME framework' }                                       // UCT (hostel & meals ₹1.5 L a year)
};

/* ======================= MORE COUNTRIES (MBBS Planner, and the home page's Compare tab) ======================= */
// Same fields as above.
var MORE_DESTINATIONS = {
  georgia:    { label: 'Georgia',    page: 'mbbs-in-georgia.html',    fee: 5.7, feeYears: 6, years: 6,   length: '6 yrs', living: 23,
    why: 'A European-style six-year MD' },                                              // David Tvildiani Medical University
  nepal:      { label: 'Nepal',      page: 'mbbs-in-nepal.html',      course: 55,            years: 5.5, length: '5.5 yrs', living: 17,
    why: 'No visa needed for Indian citizens' },                                        // UCMS: one full-course fee
  bangladesh: { label: 'Bangladesh', page: 'mbbs-in-bangladesh.html', fee: 8,   feeYears: 5, years: 6,   length: '6 yrs incl. internship', living: 10,
    why: 'A course built much like India’s' },                                          // Jahurul Islam: package ÷ 5 study years
  mauritius:  { label: 'Mauritius',  page: 'mbbs-in-mauritius.html',  fee: 7.6, feeYears: 5, years: 6,   length: '6 yrs incl. internship', living: 17,
    why: 'FMGE pass rates well above the national average' }                            // SSR and Anna, US$8,000 a year
};
var FEES_AS_OF = 'Nov 2026';

/* ======================= LEADS ======================= */
var WHATSAPP_NUMBER = '919360859919';
// GOOGLE SHEET LINK — ONE place for the whole website: the Apply page, the Guide's PDF download, and the
// "Call me back" boxes on the home page and the MBBS Planner all save to the sheet through this link.
// Paste your Apps Script "Web app" link between the quotes. It must END IN /exec
// (set-up steps: google-sheets-lead-script.gs). While it is empty, every form falls back to WhatsApp, so no lead is lost.
var LEAD_ENDPOINT = 'https://script.google.com/macros/s/AKfycbz7j9y2ZN7-7iMd4fkVMFB5XU6gUl_OIi-qj7plUjvUDxU7FMPALdUSWphp5ldNwOSwCA/exec';
// Safety check: a link ending in /dev only works for the script's owner while signed in to Google, so every
// visitor's lead would be lost without any error. Such a link is ignored (WhatsApp fallback) until the /exec link is pasted.
if (/\/dev\/?$/.test(LEAD_ENDPOINT)) {
  if (window.console) console.warn('LEAD_ENDPOINT ends in /dev and is ignored. Paste the Web app link that ends in /exec.');
  LEAD_ENDPOINT = '';
}

/* ======================= ASK MATHURA (the website assistant) ======================= */
// AI ANSWERS LINK — paste your Cloudflare Worker link between the quotes (set-up: ASK_MATHURA_SETUP.md),
// e.g. 'https://ask-mathura.yourname.workers.dev'. While it is empty, the assistant still gives every instant answer
// (eligibility, fees, countries, universities, news) and hands other questions to a counsellor on WhatsApp.
var ASSISTANT_URL = 'https://ask-mathura.mathuraoverseas.workers.dev/';

/* ======================= helpers (no need to edit below this line) ======================= */
var MO = {
  icon: function (name, fill) { return '<svg class="icon' + (fill ? ' icon--fill' : '') + '" aria-hidden="true"><use href="#i-' + name + '"></use></svg>'; },
  wa: function (message) { return 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(message); },
  latestYear: function () { return Object.keys(NEET_CUTOFFS).sort().reverse()[0]; },
  rules: function (year, cat) {
    var c = CATEGORIES[cat] || CATEGORIES.general, row = NEET_CUTOFFS[year] || NEET_CUTOFFS[MO.latestYear()];
    return { neet: row[c.group], pcb: PCB_REQUIREMENT[c.group], age: MIN_AGE, label: c.label };
  },
  num: function (v) { return Math.round(v * 10) / 10; },
  years: function (d) { return d.length; },
  // ---- starting figures (used by the MBBS Planner and the home page) ----
  tuition: function (d) { return d.course != null ? d.course : d.fee * d.feeYears; },          // lakhs, full course
  yearFee: function (d) { return d.course != null ? d.course / d.years : d.fee; },             // lakhs a year
  livingTotal: function (d) { return d.living * 12 * d.years / 100; },                         // lakhs, full course
  total: function (d) { return MO.tuition(d) + MO.livingTotal(d); },                           // lakhs, full course
  fromL: function (v) { return 'From ₹' + MO.num(v) + 'L'; },
  aboutL: function (v) { return '≈ ₹' + Math.round(v) + 'L'; },
  lakh: function (v) { return '₹' + MO.num(v) + 'L'; },
  // every country the Planner can show: the main list first, then the extra countries
  allDestinations: function () {
    var out = {}, k;
    for (k in DESTINATIONS) out[k] = DESTINATIONS[k];
    if (typeof MORE_DESTINATIONS !== 'undefined') for (k in MORE_DESTINATIONS) out[k] = MORE_DESTINATIONS[k];
    return out;
  },
  // Send a call-back request. Validates an Indian mobile, then posts to the sheet or falls back to WhatsApp.
  // Saved to the "Call-back requests" tab of the sheet.
  submitLead: function (phoneInput, msgEl, context) {
    var phone = phoneInput.value.replace(/[\s\-()]/g, '').replace(/^\+?91/, '');
    if (!/^[6-9]\d{9}$/.test(phone)) { msgEl.textContent = 'Please enter a valid 10-digit mobile number.'; phoneInput.focus(); return; }
    var payload = Object.assign({ phone: phone, source: 'call-back', page: location.pathname,
      device: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop' }, context);
    if (LEAD_ENDPOINT) {
      msgEl.textContent = 'Sending…';
      fetch(LEAD_ENDPOINT, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) })
        .then(function () { msgEl.textContent = 'Thank you! A counsellor will call you soon.'; })
        .catch(function () { msgEl.textContent = 'Could not send. Please use the WhatsApp button instead.'; });
    } else {
      window.open(MO.wa(context.message + ' Please call me on ' + phone + '.'), '_blank');
      msgEl.textContent = 'Opening WhatsApp so we get your details…';
    }
  }
};
