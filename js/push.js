// push.js — push alerts for NEET updates, counselling dates and announcements. Loaded on every page.
// You never need to edit this file: the on/off switch is js/push-config.js, the words are in
// _includes/push-prompt.html (website card) and _includes/app-welcome.html (first-open screen in the app).
//
// Where students can turn alerts on:
//   · In the app: the welcome screen the first time the app opens (after the launch animation).
//   · A small "Never miss a counselling date" card — on the website from the 2nd page, in the app from
//     the next time it opens — and right away when a student opens a post's "Key details" (a moment of
//     real interest). Never on Apply, never together with the install banner.
//     "Not now" hides it for 3 days, then 7, then 30. "Allow" ends the asking for good.
//   · Anytime: the bell button on the NEET updates page (it also turns alerts off).
// iPhones only allow alerts for sites added to the Home Screen, so plain Safari visitors never see a prompt.
(function () {
  var API = String(self.MO_PUSH_API || '').replace(/\/+$/, '');
  var html = document.documentElement;
  var ua = navigator.userAgent;
  var ios = /iPhone|iPad|iPod/.test(ua);
  var standalone = window.matchMedia('(display-mode: standalone)').matches;
  var supported = !!API && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && (!ios || standalone);

  var isApp = function () { return html.classList.contains('is-app'); };
  var MO = window.MO || {};                                    // shared helpers from js/pwa.js
  var store = MO.store || { get: function () { return null; }, set: function () {} };
  var launched = MO.launched || Promise.resolve();
  var DAY = 86400000;

  // Without alerts (switched off, or a phone that can't receive them) the app still says hello once.
  if (!supported) { showWelcome(false); return; }
  html.classList.add('can-push');

  function keyBytes(s) {
    var b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
    var out = new Uint8Array(b.length);
    for (var i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
    return out;
  }

  // The offline helper only shows notifications sent AFTER this phone subscribed.
  function markSince() {
    if (!('caches' in window)) return Promise.resolve();
    return caches.open('mo-push').then(function (c) {
      return c.match('/__push-since').then(function (r) { if (!r) return c.put('/__push-since', new Response(String(Date.now()))); });
    }).catch(function () {});
  }

  function register(sub) {
    return fetch(API + '/subscribe', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON(), source: isApp() ? 'app' : 'web' })
    }).then(function (r) { if (!r.ok) throw new Error('subscribe ' + r.status); });
  }

  function currentSub() {
    return navigator.serviceWorker.getRegistration().then(function (reg) {
      return reg ? reg.pushManager.getSubscription() : null;
    });
  }

  function enable() {
    return Notification.requestPermission().then(function (perm) {
      if (perm !== 'granted') { refresh(); return false; }
      return navigator.serviceWorker.ready.then(function (reg) {
        return reg.pushManager.getSubscription().then(function (sub) {
          if (sub) return sub;
          return fetch(API + '/vapid').then(function (r) { return r.json(); }).then(function (d) {
            if (!d.key) throw new Error('push keys not set');
            return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(d.key) });
          });
        });
      }).then(function (sub) { return register(sub); })
        .then(markSince)
        .then(function () { store.set('mo-push', 'on'); refresh(); return true; });
    }).catch(function () { refresh(); return false; });
  }

  function disable() {
    return currentSub().then(function (sub) {
      if (!sub) return;
      var endpoint = sub.endpoint;
      return sub.unsubscribe().then(function () {
        return fetch(API + '/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: endpoint }) });
      });
    }).catch(function () {}).then(function () { store.set('mo-push', 'off'); refresh(); });
  }

  function isOn() {
    if (Notification.permission !== 'granted') return Promise.resolve(false);
    return currentSub().then(function (s) { return !!s; }).catch(function () { return false; });
  }

  // ---- The bell on the NEET updates page ----
  var toggles = document.querySelectorAll('[data-push-toggle]');
  function refresh() {
    isOn().then(function (on) {
      toggles.forEach(function (b) {
        var label = b.querySelector('[data-push-label]');
        b.hidden = false;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (Notification.permission === 'denied') {
          label.textContent = 'Alerts are blocked in your phone settings';
          b.disabled = true;
        } else {
          label.textContent = on ? 'Alerts on · tap to turn off' : 'Get alerts for new updates';
          b.disabled = false;
        }
      });
    });
  }
  toggles.forEach(function (b) {
    b.addEventListener('click', function () {
      b.disabled = true;
      isOn().then(function (on) { return on ? disable() : enable(); }).then(function () { b.disabled = false; });
    });
  });
  if (toggles.length) refresh();

  // Keep the worker's list fresh: if alerts are allowed and subscribed, re-send once a week.
  if (Notification.permission === 'granted') {
    var last = parseInt(store.get('mo-push-sync'), 10) || 0;
    if (Date.now() - last > 7 * DAY) {
      currentSub().then(function (sub) { if (sub) return register(sub).then(function () { store.set('mo-push-sync', String(Date.now())); }); }).catch(function () {});
    }
  }

  // ---- First-open welcome screen (inside the app only) ----
  if (showWelcome(true)) return;   // never stack the alerts card on top of the welcome screen

  // ---- "Never miss a counselling date" card ----
  var card = document.getElementById('pushPrompt');
  var cardShown = false;
  function canAsk() {
    return card && !cardShown && Notification.permission === 'default' && !MO.snoozed('alerts') && !MO.prompting &&
      (isApp() ? !!store.get('mo-welcome') && !welcomeThisVisit() : true);
  }
  function welcomeThisVisit() { try { return !!sessionStorage.getItem('mo-welcome-now'); } catch (e) { return false; } }
  function showCard() {
    if (!canAsk()) return;
    cardShown = true; MO.prompting = true;
    var close = function () { card.classList.remove('is-in'); setTimeout(function () { card.hidden = true; MO.prompting = false; }, 300); };
    card.querySelector('[data-push-allow]').addEventListener('click', function () { enable(); close(); });
    card.querySelector('[data-push-later]').addEventListener('click', function () { MO.snooze('alerts'); close(); });
    card.hidden = false;
    requestAnimationFrame(function () { card.classList.add('is-in'); });
  }
  // A moment of interest: the student opens a post's "Key details" on the NEET updates page.
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('.upd-card__toggle[aria-expanded="true"]')) setTimeout(showCard, 600);
  });
  // Otherwise: from the 2nd page on the website, or any page in the app after the first launch.
  if (isApp() || (MO.views || 0) >= 2) launched.then(function () { setTimeout(showCard, 4000); });

  // The app's opening screen (_includes/app-welcome.html). Returns true when it is showing.
  //   First opening ever → what the app offers + "Turn on alerts" / "Not now".
  //   Later openings from the app icon → greeting, latest update, next counselling date, "Start my journey" + 5 s auto-open.
  function showWelcome(canPush) {
    var welcome = document.getElementById('appWelcome');
    if (!welcome || !isApp()) return false;
    var first = !store.get('mo-welcome');
    var launch = html.classList.contains('app-launch');      // a fresh opening from the app icon
    if (!first && !launch) return false;
    var $ = function (sel) { return welcome.querySelector(sel); };
    var allow = $('[data-welcome-allow]'), go = $('[data-welcome-go]'), skip = $('[data-welcome-skip]');
    var timer = null;
    var finish = function () {
      clearTimeout(timer);
      if (first) store.set('mo-welcome', '1');
      if (MO.endLaunch) MO.endLaunch();          // the home page is already loaded underneath
      welcome.classList.remove('is-in');
      document.body.classList.remove('has-welcome');
      setTimeout(function () { welcome.hidden = true; }, 350);
    };

    if (first) {
      if (!canPush || Notification.permission !== 'default') {
        // No alerts to ask for, or already decided (e.g. allowed while installing): just say hello.
        allow.querySelector('span').textContent = 'Get started';
        allow.querySelector('use').setAttribute('href', '#i-arrow-right');
        skip.hidden = true;
        if (canPush && Notification.permission === 'granted') enable();
        allow.addEventListener('click', finish);
      } else {
        allow.addEventListener('click', function () { allow.disabled = true; enable().then(finish); });
      }
      skip.addEventListener('click', finish);
    } else {
      // ---- Every later opening: a live screen. "Start my journey" enters at once; otherwise it opens by itself in 5 s ----
      var SECONDS = 5;
      var auto = $('[data-welcome-auto]'), count = $('[data-welcome-count]');
      welcome.classList.add('is-launch');
      allow.hidden = true; skip.hidden = true; go.hidden = false; auto.hidden = false;
      $('[data-welcome-first]').hidden = true;
      if (!welcome.classList.contains('is-launch')) {   // normally already done in _includes/app-welcome.html
        var h = new Date().getHours();
        $('[data-welcome-hello]').textContent = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
        $('[data-welcome-lead]').textContent = 'Here’s what’s new today.';
      }
      var left = SECONDS;
      var tick = function () {
        count.textContent = 'Opening in ' + left + 's';
        if (left <= 0) { finish(); return; }
        left--; timer = setTimeout(tick, 1000);
      };
      var stop = function () { clearTimeout(timer); welcome.classList.add('is-paused'); count.textContent = 'Tap to continue'; };
      go.addEventListener('click', finish);
      auto.addEventListener('click', finish);
      var live = $('[data-welcome-live]');
      live.addEventListener('pointerdown', stop);
      live.addEventListener('focusin', stop);
      fillLive(live);
      timer = setTimeout(tick, 450);   // starts once the screen has appeared
    }

    try { sessionStorage.setItem('mo-welcome-now', '1'); } catch (e) {}   // no alerts card in the same visit
    welcome.hidden = false;
    document.body.classList.add('has-welcome');
    requestAnimationFrame(function () { requestAnimationFrame(function () { welcome.classList.add('is-in'); }); });
    return true;
  }

  // Latest update + next counselling date, read from the same files the NEET updates page uses
  // (the offline helper keeps a copy, so this works without internet too).
  function fillLive(list) {
    var MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    var toDate = function (s) {
      var m = String(s || '').match(/^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})$/);
      return m && MONTHS.indexOf(m[2].toLowerCase()) > -1 ? new Date(+m[3], MONTHS.indexOf(m[2].toLowerCase()), +m[1]) : null;
    };
    var short = function (s) { return String(s).replace(/\s+\d{4}$/, ''); };
    var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var row = function (href, colour, icon, label, text) {
      return '<li><a href="' + href + '"><span class="icon-badge icon-badge--sm icon-badge--' + colour + '"><svg class="icon" aria-hidden="true"><use href="#i-' + icon + '"></use></svg></span>' +
        '<span><b>' + label + '</b>' + esc(text) + '</span><svg class="icon app-welcome__go-row" aria-hidden="true"><use href="#i-chevron-right"></use></svg></a></li>';
    };
    var get = function (u) { return fetch(u).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); };
    Promise.all([get('assets/data/latest-updates.json'), get('assets/data/counselling-tracker.json')]).then(function (d) {
      var rows = [], posts = d[0], tracker = d[1];
      if (posts && posts.length) {
        var latest = posts.slice().sort(function (a, b) { return (toDate(b.date) || 0) - (toDate(a.date) || 0); })[0];
        rows.push(row('neet-2026-updates.html#u-' + encodeURIComponent(latest.id), 'orange', 'news', 'Latest update', latest.title));
      }
      if (tracker && tracker.tracks) {
        var today = new Date(); today.setHours(0, 0, 0, 0);
        var next = null;
        tracker.tracks.forEach(function (t) {
          (t.steps || []).forEach(function (s) {
            [[s[1], 'starts'], [s[2], 'closes']].forEach(function (x) {
              var dt = toDate(x[0]);
              if (dt && dt >= today && (!next || dt < next.dt)) next = { dt: dt, text: t.name + ' · ' + s[0] + ' ' + x[1] + ' ' + (dt.getTime() === today.getTime() ? 'today' : short(x[0])) };
            });
          });
        });
        if (next) rows.push(row('neet-2026-updates.html', 'blue', 'calendar', 'Next counselling date', next.text));
      }
      rows.push(row('mbbs-abroad-planner.html', 'teal', 'check-square', 'MBBS Planner', 'Check your eligibility in 30 seconds'));
      list.innerHTML = rows.join('');
      list.hidden = false;
    });
  }
})();
