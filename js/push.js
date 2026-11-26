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

  // Shows the welcome screen the first time the app opens. Returns true when it is showing.
  function showWelcome(canPush) {
    var welcome = document.getElementById('appWelcome');
    if (!welcome || !isApp() || store.get('mo-welcome')) return false;
    var allow = welcome.querySelector('[data-welcome-allow]');
    var finish = function () {
      store.set('mo-welcome', '1');
      welcome.classList.remove('is-in');
      document.body.classList.remove('has-welcome');
      setTimeout(function () { welcome.hidden = true; }, 350);
    };
    if (!canPush || Notification.permission !== 'default') {
      // No alerts to ask for, or already decided (e.g. allowed while installing): just say hello.
      allow.querySelector('span').textContent = 'Get started';
      allow.querySelector('use').setAttribute('href', '#i-arrow-right');
      if (canPush && Notification.permission === 'granted') enable();
      allow.addEventListener('click', finish);
    } else {
      allow.addEventListener('click', function () { allow.disabled = true; enable().then(finish); });
    }
    welcome.querySelector('[data-welcome-skip]').addEventListener('click', finish);
    try { sessionStorage.setItem('mo-welcome-now', '1'); } catch (e) {}   // no alerts card in the same visit
    launched.then(function () {
      welcome.hidden = false;
      document.body.classList.add('has-welcome');
      requestAnimationFrame(function () { welcome.classList.add('is-in'); });
    });
    return true;
  }
})();
