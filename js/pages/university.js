// university.js — shared by EVERY university page (mbbs-in-{country}-{university}.html).
//   1. WhatsApp links: <a data-wa="message"> opens WhatsApp with that message ready to send
//   2. The ask bar in the hero (#uniAsk): three questions take turns; a tap opens WhatsApp with the one showing
//   3. The fee-sheet form (#uniLead): name and mobile. It saves the lead to your
//      Google Sheet, then offers a WhatsApp button that carries the request.
//
// WHERE THE SHEET LINK LIVES: js/tools.js  ->  var LEAD_ENDPOINT = '';
// The same link the Apply page and the MBBS Planner use, so every lead lands in one sheet
// (source column: "university-page"). Until that link is filled in, the form still works:
// the student sends the request on WhatsApp instead.
document.addEventListener('DOMContentLoaded', function () {
  var WA_NUMBER = typeof WHATSAPP_NUMBER !== 'undefined' ? WHATSAPP_NUMBER : '919360859919';
  var ENDPOINT = typeof LEAD_ENDPOINT !== 'undefined' ? LEAD_ENDPOINT : '';
  function $(id) { return document.getElementById(id); }
  function waLink(text) { return 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(text); }

  /* ---------- 1. WhatsApp links with a ready-made message ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-wa]'), function (a) {
    a.href = waLink(a.dataset.wa); a.target = '_blank'; a.rel = 'noopener';
  });

  /* ---------- 2. Ask bar: the questions take turns every few seconds ---------- */
  var ask = $('uniAsk');
  if (ask) {
    var qs = ask.querySelectorAll('.uni-ask__q'), at = 0;
    var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function showQ(i) {
      Array.prototype.forEach.call(qs, function (q, k) { q.classList.toggle('is-on', k === i); });
      ask.href = waLink(qs[i].dataset.q);
      ask.setAttribute('aria-label', 'Ask on WhatsApp: ' + qs[i].textContent);
    }
    showQ(0);
    if (qs.length > 1 && !still) {
      var timer = setInterval(function () { at = (at + 1) % qs.length; showQ(at); }, 3200);
      ask.addEventListener('mouseenter', function () { clearInterval(timer); });   // hold still while the mouse is on it
    }
  }

  var lead = $('uniLead');
  var uni = lead ? lead.dataset.uni : document.title, country = lead ? lead.dataset.country : '';

  /* ---------- shared helpers ---------- */
  function cleanPhone(v) {
    var d = v.replace(/\D/g, '');
    if (d.length > 10 && d.indexOf('91') === 0) d = d.slice(2);   // pasted +91 98765 43210
    if (d.length === 11 && d.charAt(0) === '0') d = d.slice(1);   // pasted 098765 43210
    return d;
  }
  function phoneError(v) {
    var d = cleanPhone(v);
    if (!d) return 'Please enter your mobile number.';
    if (!/^[6-9]\d{9}$/.test(d)) return 'Please enter a valid 10-digit Indian mobile number.';
    return '';
  }
  function nameError(v) {
    v = v.trim();
    if (!v) return 'Please enter the student’s name.';
    if (v.replace(/[^A-Za-z஀-௿]/g, '').length < 2 || /[0-9@#$%^&*_=+<>{}[\]\\/|~]/.test(v)) return 'Please enter a real name.';
    return '';
  }
  function prettyPhone(input) {   // shows the number as 98765 43210 while typing
    input.addEventListener('input', function () {
      var d = cleanPhone(input.value).slice(0, 10);
      var nice = d.length > 5 ? d.slice(0, 5) + ' ' + d.slice(5) : d;
      if (nice !== input.value) input.value = nice;
    });
  }
  function titleCase(s) { return s.trim().replace(/\s+/g, ' ').toLowerCase().replace(/(^|[\s.-])([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); }); }
  function spaced(d) { return '+91 ' + d.slice(0, 5) + ' ' + d.slice(5); }

  // Save to the sheet (if connected), then call done(saved). Never waits more than 6 seconds.
  function send(data, done) {
    data.interest = uni + (country ? ' (' + country + ')' : '');
    data.page = location.pathname;
    data.device = /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
    data.time = new Date().toISOString();
    if (!ENDPOINT) { done(false); return; }
    var finished = false;
    function finish() { if (!finished) { finished = true; done(true); } }
    fetch(ENDPOINT, { method: 'POST', mode: 'no-cors', keepalive: true, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(data) })
      .then(finish).catch(finish);
    setTimeout(finish, 6000);
  }
  function requestText(extra) {
    return 'Hi Mathura Overseas, please send me the fee sheet for ' + uni + (country ? ' (' + country + ')' : '') + '.' + (extra || '') + ' [from its university page]';
  }

  /* ---------- 3. The fee-sheet form ---------- */
  if (!lead) return;
  var name = $('leadName'), phone = $('leadPhone'), submit = $('leadSubmit');
  var RULES = { leadName: nameError, leadPhone: phoneError };
  function check(input, show) {
    var msg = RULES[input.id](input.value), box = input.closest('.uni-lead__field');
    if (show || !msg) {
      box.classList.toggle('is-invalid', !!msg);
      $(input.id + 'Err').textContent = msg;
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    }
    return !msg;
  }
  [name, phone].forEach(function (input) {
    input.addEventListener('input', function () { check(input, false); });
    input.addEventListener('blur', function () { if (input.value.trim()) check(input, true); });
  });
  prettyPhone(phone);

  lead.addEventListener('submit', function (e) {
    e.preventDefault();
    var okName = check(name, true), okPhone = check(phone, true);
    if (!okName) { name.focus(); return; }
    if (!okPhone) { phone.focus(); return; }
    if ($('leadCompany').value) { lead.hidden = true; $('uniLeadDone').hidden = false; return; }   // spam bot: pretend success, save nothing

    var data = { name: titleCase(name.value), phone: cleanPhone(phone.value), source: 'university-page' };
    submit.classList.add('is-loading');
    send(data, function (saved) {
      lead.hidden = true;
      $('uniLeadDone').hidden = false;
      $('uniLeadTitle').textContent = 'Thank you, ' + data.name.split(' ')[0] + '!';
      $('uniLeadText').textContent = saved
        ? 'A counsellor will send the ' + uni + ' fee sheet to ' + spaced(data.phone) + '. Want it right now? Tap below.'
        : 'One last tap: send this request on WhatsApp and we will reply with the ' + uni + ' fee sheet.';
      $('uniLeadWa').href = waLink(requestText(' My name is ' + data.name + '.'));
      $('uniLeadTitle').focus();
    });
  });
});
