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

/* ======================= DESTINATIONS (home page + MBBS Planner) ======================= */
// tuition: full course, in lakhs of rupees (excludes living)  · years: course length [shortest, longest]
// living: per month, in thousands of rupees [low, high]        Source: MBBS Abroad Handbook 2026-27.
// The MBBS Planner shows the AVERAGE (middle) of each range, so families see a typical figure, not the extremes.
// flight / fare / tz / lang / currency / rate / why: researched travel facts, the same ones used on the Countries page
// (destinations.js). Fares and exchange rates are indicative — re-check them and update TRAVEL_AS_OF when you do.
var TRAVEL_AS_OF = 'Sep 2026';
var DESTINATIONS = {
  philippines: { label: 'Philippines', page: 'mbbs-in-philippines.html', tuition: [18, 35], years: [5.5, 6.5], living: [20, 35], climate: 'Tropical',
    flight: [10, 10], stops: '1 stop', fare: 13434, tz: '2h 30m ahead', lang: 'Filipino & English', currency: 'Philippine peso', rate: '1 INR ≈ 0.66 PHP',
    why: ['American-style curriculum, taught in English', 'A large Indian student community', 'Strong clinical exposure'] },
  uzbekistan:  { label: 'Uzbekistan',  page: 'mbbs-in-uzbekistan.html', tuition: [15, 25], years: [6, 6], living: [12, 20], climate: 'Continental',
    flight: [8, 8], stops: '1 stop', fare: 20073, tz: '30m behind', lang: 'Uzbek', currency: 'Uzbek som', rate: '1 INR ≈ 124.5 UZS',
    why: ['Silk Road cities like Tashkent and Samarkand', 'Modern campuses', 'Established Indian student communities'] },
  russia:      { label: 'Russia',      page: 'mbbs-in-russia.html', tuition: [18, 32], years: [6, 6], living: [15, 25], climate: 'Cold',
    flight: [12, 15], stops: '1 stop', fare: null, fareText: 'About ₹61,667 return', tz: '2h 30m behind', lang: 'Russian', currency: 'Russian rouble', rate: '1 INR ≈ 0.90 RUB',
    why: ['Government universities with 60+ years of Indian students', 'Moscow is Russia’s capital and largest city', 'Long, cold winters — a real change from home'] },
  kyrgyzstan:  { label: 'Kyrgyzstan',  page: 'mbbs-in-kyrgyzstan.html', tuition: [18, 33], years: [6, 6], living: [12, 20], climate: 'Cold winters',
    flight: [9, 10], stops: '1 stop', fare: 34725, tz: '30m ahead', lang: 'Kyrgyz & Russian', currency: 'Kyrgyz som', rate: '1 INR ≈ 1.0 KGS',
    why: ['Among the most affordable options', 'Bishkek sits at the foot of the Ala-Too mountains', 'Russian is widely used alongside Kyrgyz'] },
  vietnam:     { label: 'Vietnam',     page: 'mbbs-in-vietnam.html', tuition: [28, 45], years: [6, 6], living: [18, 30], climate: 'Tropical',
    flight: [7, 7], stops: '1 stop', fare: 12679, tz: '1h 30m ahead', lang: 'Vietnamese', currency: 'Vietnamese dong', rate: '1 INR ≈ 275.6 VND',
    why: ['Modern, safe cities', 'Hanoi: lakes, an old quarter and famous street food', 'One of the shorter flights from South India'] },
  timor:       { label: 'Timor-Leste', page: 'mbbs-in-timor-uct-timor.html', tuition: [15, 20], years: [5.5, 5.5], living: [15, 25], climate: 'Tropical',
    flight: [20, 24], stops: 'via Singapore', fare: 35561, tz: '3h 30m ahead', lang: 'Tetum & Portuguese', currency: 'US dollar', rate: '1 INR ≈ 0.0114 USD',
    why: ['Indian-aligned syllabus, taught in English', 'A tropical island setting', 'An emerging option — extra due diligence needed'] }
};

/* ======================= MORE DESTINATIONS (MBBS Planner only: Cost + Compare) ======================= */
// Other countries Indian students commonly choose. Same fields as above (tuition and living are ranges; the Planner shows the average).
// page: the country page on this site, or null if there isn't one yet.
// Sources (checked Oct 2026; fees change every year, so a counsellor confirms the exact figure):
//   Tuition: Careers360 "Best country for MBBS abroad in 2026 with low fees" (13 May 2026) for Georgia, Kazakhstan, Nepal,
//   Bangladesh, China and Armenia; Belarus: KaranGupta.com (3 May 2026) USD 3,800–5,200/yr × 6; Tajikistan: MedBound Times
//   (2 May 2026) USD 3,000–5,000/yr; Egypt: Careers360 (12 Jun 2026). USD converted at about ₹95.
//   Living: Careers360 (Nepal 23 Apr 2026, Bangladesh 13 May 2026), KaranGupta.com (Georgia, Kazakhstan, China 30 Apr 2026;
//   Belarus 3 May 2026), Leap Scholar (Armenia 6 Apr 2026, Egypt 7 Apr 2026), MedBound Times (Tajikistan 2 May 2026).
var MORE_DESTINATIONS = {
  georgia:    { label: 'Georgia',    page: 'mbbs-in-georgia.html',    tuition: [25, 40], years: [6, 6], living: [18, 33], climate: 'Mild, temperate',
    lang: 'Georgian', why: ['Where Europe meets Asia', 'Tbilisi’s old town and mild climate'] },
  kazakhstan: { label: 'Kazakhstan', page: 'mbbs-in-kazakhstan.html', tuition: [20, 35], years: [6, 6], living: [10, 19], climate: 'Continental, cold winters',
    lang: 'Kazakh & Russian', why: ['Established state medical universities', 'Almaty sits beneath snow-capped mountains'] },
  nepal:      { label: 'Nepal',      page: null, tuition: [20, 30], years: [5.5, 5.5], living: [10, 15], climate: 'Mild in Kathmandu',
    lang: 'Nepali', why: ['Right next door — similar food and culture', 'Patients and diseases much like India’s'] },
  bangladesh: { label: 'Bangladesh', page: null, tuition: [20, 35], years: [6, 6], living: [8, 17], climate: 'Tropical monsoon',
    lang: 'Bengali', why: ['Curriculum close to India’s MBBS', 'Short distance from India'] },
  china:      { label: 'China',      page: null, tuition: [20, 40], years: [6, 6], living: [15, 28], climate: 'Varies by region',
    lang: 'Mandarin', why: ['Large, well-equipped university hospitals', 'Chinese (HSK) needed for clinical years'] },
  armenia:    { label: 'Armenia',    page: null, tuition: [15, 27], years: [6, 6], living: [16, 32], climate: 'Cold winters, warm summers',
    lang: 'Armenian', why: ['Classes in English in a compact, safe capital', 'Basic Armenian needed on hospital wards'] },
  belarus:    { label: 'Belarus',    page: null, tuition: [22, 30], years: [6, 6], living: [19, 28], climate: 'Continental, cold winters',
    lang: 'Russian & Belarusian', why: ['Long-established state universities', 'Russian needed for clinical rotations'] },
  egypt:      { label: 'Egypt',      page: null, tuition: [25, 50], years: [7, 7], living: [17, 26], climate: 'Hot and dry',
    lang: 'Arabic', why: ['Historic government universities in Cairo', 'Longer course: 5 years + 2-year internship'] },
  tajikistan: { label: 'Tajikistan', page: null, tuition: [17, 28], years: [6, 6], living: [9, 14], climate: 'Continental',
    lang: 'Tajik & Russian', why: ['Among the lowest living costs', 'English-medium at most universities'] }
};
var FEES_AS_OF = 'Oct 2026';
var COST_SCALE_MAX = 50;   // right edge of the tuition chart, in lakhs. Raise it if any tuition goes above 50.

/* ======================= LEADS ======================= */
var WHATSAPP_NUMBER = '919360859919';
// Paste your Google Apps Script web-app URL here and call-back requests are saved to your sheet.
// While it is empty, "Call me back" opens WhatsApp with the visitor's details instead, so no lead is lost.
var LEAD_ENDPOINT = 'https://script.google.com/macros/s/AKfycbw6cRblZGrLuXe_1RW03Rp7B72gyhTZnZTT2I0bl9co/dev';

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
  lakh: function (v) { return '₹' + MO.num(v) + 'L'; },
  range: function (a, b) { return MO.num(a) === MO.num(b) ? MO.lakh(a) : MO.lakh(a) + '–' + MO.num(b) + 'L'; },
  years: function (d) { return d.years[0] === d.years[1] ? d.years[0] + ' yrs' : d.years[0] + '–' + d.years[1] + ' yrs'; },
  hours: function (d) { return '~' + d.flight[0] + (d.flight[1] !== d.flight[0] ? '–' + d.flight[1] : '') + ' hrs'; },
  fare: function (d) { return d.fare ? 'From ₹' + d.fare.toLocaleString('en-IN') + ' one-way' : d.fareText; },
  living: function (d) { return '₹' + d.living[0] + 'k–' + d.living[1] + 'k / month'; },
  // living for the whole course, in lakhs: monthly (thousands) x months / 100
  livingTotal: function (d) { return [d.living[0] * 12 * d.years[0] / 100, d.living[1] * 12 * d.years[1] / 100]; },
  total: function (d) { var l = MO.livingTotal(d); return [d.tuition[0] + l[0], d.tuition[1] + l[1]]; },
  pct: function (v, max) { return Math.max(0, Math.min(100, v / (max || COST_SCALE_MAX) * 100)).toFixed(2) + '%'; },
  // ---- averages (used by the MBBS Planner) ----
  mid: function (r) { return (r[0] + r[1]) / 2; },
  avgTuition: function (d) { return MO.mid(d.tuition); },                       // lakhs
  avgLiving: function (d) { return MO.mid(d.living); },                         // thousands per month
  avgYears: function (d) { return MO.mid(d.years); },
  avgLivingTotal: function (d) { return MO.avgLiving(d) * 12 * MO.avgYears(d) / 100; },   // lakhs
  avgTotal: function (d) { return MO.avgTuition(d) + MO.avgLivingTotal(d); },   // lakhs
  aboutL: function (v) { return '≈ ₹' + Math.round(v) + 'L'; },
  aboutK: function (v) { return '≈ ₹' + Math.round(v) + 'k'; },
  // every destination the Planner can show: the main list first, then the extra countries
  allDestinations: function () {
    var out = {}, k;
    for (k in DESTINATIONS) out[k] = DESTINATIONS[k];
    if (typeof MORE_DESTINATIONS !== 'undefined') for (k in MORE_DESTINATIONS) out[k] = MORE_DESTINATIONS[k];
    return out;
  },
  // Send a call-back request. Validates an Indian mobile, then posts to the sheet or falls back to WhatsApp.
  submitLead: function (phoneInput, msgEl, context) {
    var phone = phoneInput.value.replace(/[\s\-()]/g, '').replace(/^\+?91/, '');
    if (!/^[6-9]\d{9}$/.test(phone)) { msgEl.textContent = 'Please enter a valid 10-digit mobile number.'; phoneInput.focus(); return; }
    var payload = Object.assign({ phone: phone, page: location.pathname }, context);
    if (LEAD_ENDPOINT) {
      msgEl.textContent = 'Sending…';
      fetch(LEAD_ENDPOINT, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(payload) })
        .then(function () { msgEl.textContent = 'Thank you! A counsellor will call you soon.'; })
        .catch(function () { msgEl.textContent = 'Could not send. Please use the WhatsApp button instead.'; });
    } else {
      window.open(MO.wa(context.message + ' Please call me on ' + phone + '.'), '_blank');
      msgEl.textContent = 'Opening WhatsApp so we get your details…';
    }
  }
};
