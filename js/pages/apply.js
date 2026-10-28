// apply.js — the Apply page: validates the 3 details, fills in the boarding pass live, and saves the application
// to your Google Sheet. The sheet then emails you (see google-sheets-lead-script.gs).
//
// WHERE THE SHEET LINK LIVES: js/tools.js  ->  var LEAD_ENDPOINT = '';
// One link, shared with the home page and the MBBS Planner. Nothing in this file needs editing to go live.
//
// Extra: link to this page as  apply.html?country=philippines  (any country slug from tools.js) and the pass
// shows "To: MBBS / Philippines" and the sheet records the country in an "interest" column.
(function () {
  var form = document.getElementById('applyForm');
  if (!form) return;

  // ---- settings come from tools.js; safe defaults if it is ever missing ----
  var ENDPOINT = typeof LEAD_ENDPOINT !== 'undefined' ? LEAD_ENDPOINT : '';
  var WA_NUMBER = typeof WHATSAPP_NUMBER !== 'undefined' ? WHATSAPP_NUMBER : '919360859919';
  var QUEUE_KEY = 'mo_apply_pending';   // applications waiting to be sent (phone was offline)

  function $(id) { return document.getElementById(id); }
  var pass = $('pass'), submit = $('applySubmit'), label = submit.querySelector('.apply-form__label');
  var inputs = { name: $('applyName'), phone: $('applyPhone'), city: $('applyCity') };
  var touched = {};

  // ---- rules for each detail: return '' when fine, or the message to show ----
  function cleanPhone(v) {
    var d = v.replace(/\D/g, '');
    if (d.length > 10 && d.indexOf('91') === 0) d = d.slice(2);      // pasted +91 98765 43210
    if (d.length === 11 && d.charAt(0) === '0') d = d.slice(1);      // pasted 098765 43210
    return d;
  }
  var RULES = {
    name: function (v) {
      v = v.trim();
      if (!v) return 'Please enter the student’s name.';
      if (v.replace(/[^A-Za-z஀-௿]/g, '').length < 2) return 'Please enter a real name.';
      if (/[0-9@#$%^&*_=+<>{}[\]\\/|~]/.test(v)) return 'Names can only have letters, spaces and dots.';
      return '';
    },
    phone: function (v) {
      var d = cleanPhone(v);
      if (!d) return 'Please enter a mobile number.';
      if (!/^[6-9]\d{9}$/.test(d)) return 'Please enter a valid 10-digit Indian mobile number.';
      return '';
    },
    city: function (v) {
      v = v.trim();
      if (!v) return 'Please enter your city.';
      if (v.length < 2 || /\d/.test(v)) return 'Please enter a valid city name.';
      return '';
    }
  };

  function check(key, show) {
    var msg = RULES[key](inputs[key].value), box = inputs[key].closest('.apply-field');
    box.classList.toggle('is-valid', !msg);
    if (show) {
      box.classList.toggle('is-invalid', !!msg);
      $(inputs[key].id + 'Err').textContent = msg;
      inputs[key].setAttribute('aria-invalid', msg ? 'true' : 'false');
    } else if (!msg) {
      box.classList.remove('is-invalid');
      $(inputs[key].id + 'Err').textContent = '';
      inputs[key].setAttribute('aria-invalid', 'false');
    }
    return !msg;
  }

  // ---- the boarding pass: passenger = name, FROM = city (3-letter code), plane = progress ----
  function titleCase(s) { return s.trim().replace(/\s+/g, ' ').toLowerCase().replace(/(^|[\s.-])([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); }); }
  function setText(el, text, placeholder) { el.textContent = text || placeholder; el.classList.toggle('is-placeholder', !text); }
  function paintPass() {
    var name = inputs.name.value.trim(), city = inputs.city.value.trim();
    setText($('passName'), name ? titleCase(name) : '', 'Your name');
    setText($('passFrom'), city ? titleCase(city) : '', 'Your city');
    var code = city.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
    $('passFromCode').textContent = $('miniFrom').textContent = code.length === 3 ? code : 'YOU';
    var done = ['name', 'phone', 'city'].filter(function (k) { return !RULES[k](inputs[k].value); }).length;
    pass.style.setProperty('--p', (done / 3).toFixed(3));
    $('applyCount').textContent = $('miniCount').textContent = done;
    pass.classList.toggle('is-complete', done === 3);
  }

  // ---- mini pass: show it only while the big route is scrolled off the top of the screen ----
  var head = pass.querySelector('.pass__head');
  if ('IntersectionObserver' in window && head) {
    new IntersectionObserver(function (entries) {
      var e = entries[0];
      var above = !e.isIntersecting && e.boundingClientRect.top < 0;   // scrolled past it (not merely below the screen)
      pass.classList.toggle('is-mini', above && !form.hidden);
    }, { rootMargin: '-90px 0px 0px 0px' }).observe(head);
  }

  // ---- optional ?country=… from a country page ----
  var interest = '';
  var slug = (new URLSearchParams(location.search).get('country') || '').toLowerCase().replace(/[^a-z-]/g, '');
  if (slug) {
    var known = typeof DESTINATIONS !== 'undefined' && DESTINATIONS[slug];
    interest = known ? known.label : titleCase(slug.replace(/-/g, ' '));
    $('passTo').textContent = interest;
  }

  // ---- typing behaviour ----
  inputs.phone.addEventListener('input', function () {
    // keep digits only and show them as 98765 43210 (the +91 is already printed in the box)
    var raw = inputs.phone.value, d = raw.replace(/\D/g, '');
    if (raw.indexOf('+') > -1) {
      if (d === '' || d === '9' || d === '91') return;                // still typing "+91" — don't fight them
      d = d.replace(/^91/, '');
    }
    d = cleanPhone(d).slice(0, 10);
    var nice = d.length > 5 ? d.slice(0, 5) + ' ' + d.slice(5) : d;
    if (nice !== raw) inputs.phone.value = nice;
  });
  Object.keys(inputs).forEach(function (key) {
    inputs[key].addEventListener('input', function () { check(key, false); paintPass(); });
    inputs[key].addEventListener('blur', function () {
      if (inputs[key].value.trim()) touched[key] = true;
      if (touched[key]) check(key, true);
    });
  });

  // ---- sending: background POST to the Apps Script. Offline? kept on the phone and sent next visit. ----
  function readQueue() { try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch (e) { return []; } }
  function queue(d) { try { var q = readQueue(); q.push(d); localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-10))); } catch (e) {} }
  function post(d) {
    return fetch(ENDPOINT, { method: 'POST', mode: 'no-cors', keepalive: true, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(d) });
  }
  function flush() {
    if (!ENDPOINT || !navigator.onLine) return;
    var q = readQueue(); if (!q.length) return;
    try { localStorage.removeItem(QUEUE_KEY); } catch (e) {}
    q.forEach(function (d) { post(d).catch(function () { queue(d); }); });
  }
  window.addEventListener('online', flush); flush();

  function makeRef() {
    var t = new Date(), yy = String(t.getFullYear()).slice(2), mm = ('0' + (t.getMonth() + 1)).slice(-2);
    return 'MO-' + yy + mm + '-' + (1000 + Math.floor(Math.random() * 9000));
  }

  // ---- submit ----
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var bad = null;
    ['name', 'phone', 'city'].forEach(function (k) { touched[k] = true; if (!check(k, true) && !bad) bad = k; });
    if (bad) { inputs[bad].focus(); return; }
    if ($('applyCompany').value) { showDone(null, true); return; }   // spam bot: pretend success, save nothing

    var params = new URLSearchParams(location.search);
    var data = {
      ref: makeRef(),
      name: titleCase(inputs.name.value),
      phone: cleanPhone(inputs.phone.value),
      city: titleCase(inputs.city.value),
      source: 'apply-page',
      interest: interest,
      page: location.pathname,
      device: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      time: new Date().toISOString()
    };
    ['utm_source', 'utm_medium', 'utm_campaign'].forEach(function (k) { if (params.get(k)) data[k] = params.get(k); });

    if (!ENDPOINT) { showDone(data, false); return; }               // sheet not connected yet → WhatsApp keeps the lead
    submit.classList.add('is-loading'); label.textContent = 'Sending…';
    var finished = false;
    function finish() { if (!finished) { finished = true; showDone(data, true); } }
    if (!navigator.onLine) { queue(data); finish(); return; }
    post(data).then(finish).catch(function () { queue(data); finish(); });
    setTimeout(finish, 6000);                                         // never leave the student waiting on a slow network
  });

  // ---- done view: stamp the pass, show the reference, offer WhatsApp ----
  function showDone(d, saved) {
    form.hidden = true;
    var done = $('applyDone'); done.hidden = false;
    pass.classList.add('is-done'); pass.classList.remove('is-mini'); pass.style.setProperty('--p', '1');
    $('passStatus').textContent = 'Checked in';
    if (!d) return;
    var first = d.name.split(' ')[0];
    $('applyRef').textContent = d.ref;
    $('applyDoneTitle').textContent = 'Thank you, ' + first + '!';
    var waMsg = 'Hi Mathura Overseas, I just applied on your website (ref ' + d.ref + '). My name is ' + d.name + ' from ' + d.city +
      (d.interest ? ', interested in MBBS in ' + d.interest : '') + '. Please call me on ' + d.phone + '.';
    $('applyWa').href = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(waMsg);
    var phone = '+91 ' + d.phone.slice(0, 5) + ' ' + d.phone.slice(5);
    var text = $('applyDoneText');
    text.textContent = '';
    if (saved) {
      text.appendChild(document.createTextNode('A counsellor will call you on '));
      var b = document.createElement('b'); b.textContent = phone; text.appendChild(b);
      text.appendChild(document.createTextNode(' shortly. Keep your NEET scorecard handy.'));
      $('applyWaLabel').textContent = 'Chat with us on WhatsApp now';
    } else {
      text.appendChild(document.createTextNode('One last tap: send your details to us on WhatsApp so a counsellor can call you on '));
      var b2 = document.createElement('b'); b2.textContent = phone; text.appendChild(b2);
      text.appendChild(document.createTextNode('.'));
      $('applyWaLabel').textContent = 'Send my details on WhatsApp';
    }
    $('applyDoneTitle').focus();
    if (pass.getBoundingClientRect().top < 0) pass.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  paintPass();
})();
