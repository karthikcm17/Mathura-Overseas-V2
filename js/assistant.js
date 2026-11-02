// assistant.js — "Ask Mathura", the AI assistant on every page.
// Markup: _includes/assistant.html · Looks: css/assistant.css · The AI: worker/ask-mathura-worker.js (Cloudflare, free)
//
// Every question goes to the AI through your Cloudflare Worker, which reads the whole website before answering.
// Connect it by pasting the Worker link into ASSISTANT_URL in js/tools.js (steps: ASK_MATHURA_SETUP.md).
// While that link is empty — or if the free daily AI allowance runs out — the reply is a one-line WhatsApp link,
// with the visitor's question already typed in, so no question is lost.
//
// Open it from anywhere: any link or button with  data-ask-open  opens the chat;
//   data-ask-open="Your question"  opens it and asks that question straight away.
// The conversation is kept while the visitor moves between pages, and cleared when they close the browser tab.
(function () {
  var panel = document.getElementById('askPanel');
  if (!panel) return;

  var WA_NUMBER = '919360859919';
  var STORE = 'mo_ask_chat';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var phoneLayout = window.matchMedia('(max-width: 1023.98px)');
  function $(id) { return document.getElementById(id); }
  var body = $('askBody'), empty = $('askEmpty'), msgs = $('askMsgs'), form = $('askForm'), input = $('askInput'),
      send = $('askSend'), reset = $('askReset'), launch = $('askLaunch');
  var history = [], busy = false;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function wa(text) { return 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(text); }
  function track(name) {
    if (window.dataLayer && window.dataLayer.push) window.dataLayer.push({ event: name });
    else if (typeof window.gtag === 'function') window.gtag('event', name);
  }

  // ASSISTANT_URL lives in js/tools.js. Most pages don't load that file, so fetch it the first time the chat opens.
  var ready = null;
  function loadSettings() {
    if (ready) return ready;
    ready = new Promise(function (resolve) {
      if (typeof ASSISTANT_URL !== 'undefined') return resolve();
      if (!document.querySelector('script[src="js/tools.js"]')) {
        var s = document.createElement('script'); s.src = 'js/tools.js'; document.head.appendChild(s);
      }
      var tries = 0, t = setInterval(function () { if (typeof ASSISTANT_URL !== 'undefined' || ++tries > 50) { clearInterval(t); resolve(); } }, 100);
    });
    return ready;
  }
  function aiOn() { return typeof ASSISTANT_URL !== 'undefined' && /^https:\/\//.test(ASSISTANT_URL); }

  /* ================= showing messages ================= */
  // The AI writes plain text with **bold**, "- " lists and [label](page.html) links. Only links to this website,
  // WhatsApp or the office phone become clickable; anything else is shown as plain text.
  function safeHref(u) {
    u = u.trim();
    if (/^[a-z0-9-]+\.html(#[a-z0-9-]+)?$/i.test(u)) return u;
    if (/^https:\/\/(www\.)?mathuraoverseas\.com\/[^\s"'<>]*$/i.test(u)) return u;
    if (/^https:\/\/wa\.me\/\d+(\?[^\s"'<>]*)?$/.test(u)) return u;
    if (/^tel:\+?\d{8,14}$/.test(u)) return u;
    return null;
  }
  function inline(s) {
    return esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/\[([^\]]{1,80})\]\(([^()\s]{1,400})\)/g, function (m, label, url) {
        var h = safeHref(url.replace(/&amp;/g, '&'));
        return h ? '<a href="' + esc(h) + '"' + (/^https?:/.test(h) ? ' target="_blank" rel="noopener"' : '') + '>' + label + '</a>' : label;
      });
  }
  function render(text) {
    var out = [], list = [];
    function flush() { if (list.length) { out.push('<ul>' + list.join('') + '</ul>'); list = []; } }
    String(text).replace(/\r/g, '').split('\n').forEach(function (line) {
      var l = line.trim();
      if (!l) { flush(); return; }
      var m = l.match(/^[-*•]\s+(.*)$/);
      if (m) list.push('<li>' + inline(m[1]) + '</li>');
      else { flush(); out.push('<p>' + inline(l) + '</p>'); }
    });
    flush();
    return out.join('');
  }
  function scrollDown() { body.scrollTop = body.scrollHeight; }
  function add(who, html) {
    var m = document.createElement('div');
    m.className = 'ask-m ask-m--' + who;
    m.innerHTML = html;
    msgs.appendChild(m);
    scrollDown();
    return m;
  }
  function showConversation(on) { empty.hidden = on; reset.hidden = !on; }
  function save() {
    try { sessionStorage.setItem(STORE, JSON.stringify({ html: msgs.innerHTML.slice(-60000), history: history.slice(-12) })); } catch (e) {}
  }
  function restore() {
    try {
      var s = JSON.parse(sessionStorage.getItem(STORE) || 'null');
      if (s && s.html) { msgs.innerHTML = s.html; history = s.history || []; msgs.querySelectorAll('.ask-m--typing').forEach(function (n) { n.remove(); }); showConversation(true); return; }
    } catch (e) {}
    showConversation(false);
  }

  /* ================= asking ================= */
  function setBusy(on) { busy = on; send.disabled = on || !input.value.trim(); }
  function fallback(question) {
    return render('I can’t answer that right now. Please [ask us on WhatsApp](' + wa('Hi Mathura Overseas, I have a question: ' + question) + ') — a counsellor will reply.');
  }
  function ask(question) {
    question = String(question || '').trim().slice(0, 400);
    if (!question || busy) return;
    showConversation(true);
    add('user', esc(question));
    history.push({ role: 'user', content: question });
    input.value = ''; setBusy(true);
    var typing = add('bot ask-m--typing', '<i></i><i></i><i></i>');
    typing.setAttribute('aria-hidden', 'true');
    track('ask_question');

    loadSettings().then(function () {
      if (!aiOn()) throw new Error('not connected');
      var ctrl = window.AbortController ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 30000);
      return fetch(ASSISTANT_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl ? ctrl.signal : undefined,
        body: JSON.stringify({ message: question, history: history.slice(-9, -1), page: location.pathname })
      }).then(function (r) { clearTimeout(timer); if (!r.ok) throw new Error(r.status); return r.json(); });
    }).then(function (d) {
      if (!d || !d.reply) throw new Error('empty');
      typing.remove();
      add('bot', render(d.reply));
      history.push({ role: 'assistant', content: String(d.reply).slice(0, 1200) });
      track('ask_answer');
    }).catch(function () {
      typing.remove();
      add('bot', fallback(question));
      history.pop();   // an unanswered question isn't sent to the AI as context next time
      track('ask_fallback');
    }).then(function () {
      setBusy(false); save();
      if (!phoneLayout.matches) input.focus({ preventScroll: true });
    });
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); ask(input.value); });
  input.addEventListener('input', function () { send.disabled = busy || !input.value.trim(); });
  empty.querySelectorAll('[data-q]').forEach(function (b) { b.addEventListener('click', function () { ask(b.getAttribute('data-q')); }); });
  reset.addEventListener('click', function () {
    msgs.innerHTML = ''; history = [];
    try { sessionStorage.removeItem(STORE); } catch (e) {}
    showConversation(false); input.focus({ preventScroll: true });
  });

  /* ================= open / close ================= */
  var opener = null, restored = false;
  function open(question) {
    var drawerOpen = document.body.classList.contains('nav-open');
    if (drawerOpen) { var c = document.querySelector('.site-nav__close'); if (c) c.click(); }
    opener = drawerOpen ? document.querySelector('.nav-toggle') : document.activeElement;
    if (!restored) { restored = true; restore(); }
    panel.classList.add('is-open');
    document.body.classList.add('ask-open');
    if (launch) launch.setAttribute('aria-expanded', 'true');
    panel.setAttribute('aria-modal', phoneLayout.matches ? 'true' : 'false');
    loadSettings();
    scrollDown();
    if (question) ask(question);
    // Phones: don't pop the keyboard up over the welcome screen; computers: ready to type
    setTimeout(function () { if (!('ontouchstart' in window)) input.focus({ preventScroll: true }); }, reduce ? 0 : 350);
    track('ask_opened');
  }
  function close() {
    if (!panel.classList.contains('is-open')) return;
    panel.classList.remove('is-open');
    document.body.classList.remove('ask-open');
    if (launch) launch.setAttribute('aria-expanded', 'false');
    if (opener && opener.focus && document.contains(opener)) opener.focus({ preventScroll: true });
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-ask-open]');
    if (!b) return;
    e.preventDefault();
    if (b === launch && panel.classList.contains('is-open')) { close(); return; }
    open(b.getAttribute('data-ask-open'));
  });
  $('askClose').addEventListener('click', close);
  $('askScrim').addEventListener('click', close);
  document.addEventListener('keydown', function (e) {
    if (!panel.classList.contains('is-open')) return;
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'Tab' && phoneLayout.matches) {   // phones / tablets: keep keyboard focus inside the open chat
      var f = Array.prototype.filter.call(panel.querySelectorAll('a[href], button:not([disabled]), input'), function (el) { return el.offsetParent !== null; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  if (phoneLayout.addEventListener) phoneLayout.addEventListener('change', function () { panel.setAttribute('aria-modal', phoneLayout.matches && panel.classList.contains('is-open') ? 'true' : 'false'); });

  // Phones: drag the header down to close
  var head = panel.querySelector('.ask__head'), y0 = null;
  head.addEventListener('touchstart', function (e) { y0 = e.touches[0].clientY; }, { passive: true });
  head.addEventListener('touchend', function (e) { if (y0 !== null && e.changedTouches[0].clientY - y0 > 80) close(); y0 = null; }, { passive: true });
})();
