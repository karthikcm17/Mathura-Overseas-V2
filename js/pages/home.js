// home.js — behaviour unique to index.html.
document.addEventListener('DOMContentLoaded', function () {

  // ---- Journey: the route draws itself and the plane flies stop to stop when it scrolls into view ----
  var journey = document.getElementById('journey');
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

  // ---- "NEET & counselling updates" card: show the newest item from assets/data/latest-updates.json (edit that one file to change it) ----
  var latest = document.querySelector('[data-latest]');
  if (latest) {
    fetch('assets/data/latest-updates.json')
      .then(function (r) { return r.json(); })
      .then(function (items) {
        var it = items && items[0];
        if (it && /^\d/.test(it.date)) latest.textContent = 'Latest \u00B7 ' + it.date.replace(/\s+\d{4}$/, '') + ' \u2014 ' + it.title;
      })
      .catch(function () { /* keep the static text */ });
  }

  // ---- AI chat widget (desktop only; CSS hides it on mobile) ----
  var WORKER_URL = 'https://mathura-ai-chat.mathuraoverseas.workers.dev/';
  var bubble = document.getElementById('aiChatBubble');
  if (!bubble) return;
  var panel = document.getElementById('aiChatPanel');
  var msgs = document.getElementById('aiChatMsgs');
  var form = document.getElementById('aiChatForm');
  var input = document.getElementById('aiChatInput');
  var chips = document.getElementById('aiChatChips');
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
  document.getElementById('aiChatClose').addEventListener('click', toggle);
  form.addEventListener('submit', function (e) { e.preventDefault(); send(input.value); });
  if (chips) chips.querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { send(b.textContent); }); });
});
