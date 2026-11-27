// pwa.js — turns the website into an installable app. Loaded on every page by _includes/scripts.html.
// You never need to edit this file.
//
// 1. Registers sw.js (the offline helper). Its address is worked out from THIS file's own
//    location (js/pwa.js → ../sw.js), so it is always the site root.
// 2. Adds the class "is-app" to <html> when the site is opened as the app (Play Store app, or installed
//    from Chrome on a phone or computer), so CSS can show or hide things only inside the app.
// 3. Holds the page under the opening screen when the app is opened from its icon (_includes/app-welcome.html).
// 4. Shows the "Get the app" links and the Android install banner (once play_store_url is set in _config.yml).
//    Never to people who already have the app.
//
// "Not now" is polite and gets quieter each time: hidden 3 days, then 7 days, then 30 days (window.MO.snooze).
(function () {
  var script = document.currentScript;
  var root = new URL('../', script.src);
  var html = document.documentElement;
  var DAY = 86400000;

  // ---- Small shared helpers (also used by js/push.js) ----
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var STEPS = [3, 7, 30];
  var MO = window.MO = {
    store: store,
    snoozed: function (name) {
      try { var s = JSON.parse(store.get('mo-snooze-' + name) || '{}'); return Date.now() < (s.until || 0); } catch (e) { return false; }
    },
    snooze: function (name) {
      var s; try { s = JSON.parse(store.get('mo-snooze-' + name) || '{}'); } catch (e) { s = {}; }
      var n = (s.n || 0) + 1;
      store.set('mo-snooze-' + name, JSON.stringify({ n: n, until: Date.now() + STEPS[Math.min(n, STEPS.length) - 1] * DAY }));
    },
    views: 0,
    prompting: false        // true while the install banner or the alerts card is on screen: never two at once
  };
  MO.views = (parseInt(store.get('mo-views'), 10) || 0) + 1;
  store.set('mo-views', String(MO.views));

  // ---- 2. Inside the app? ----
  try {
    var params = new URLSearchParams(location.search);
    var inApp = params.get('source') === 'app' ||
      document.referrer.indexOf('android-app://') === 0 ||
      window.matchMedia('(display-mode: standalone)').matches;
    if (inApp) sessionStorage.setItem('mo-app', '1');
    if (inApp || sessionStorage.getItem('mo-app') === '1') html.classList.add('is-app');
  } catch (e) { /* private mode: sessionStorage may be blocked — harmless */ }

  // ---- 3. Opening screen (the class "app-launch" is set by a tiny script in _includes/head.html) ----
  // While it is set, the page waits invisibly under the opening screen. js/push.js calls MO.endLaunch()
  // the moment the student enters, and the page is simply there — nothing plays in between.
  var endLaunch;
  MO.launched = new Promise(function (resolve) { endLaunch = resolve; });
  MO.endLaunch = function () { html.classList.remove('app-launch'); endLaunch(); };
  if (!html.classList.contains('app-launch')) endLaunch();
  else document.addEventListener('DOMContentLoaded', function () { if (!document.getElementById('appWelcome')) MO.endLaunch(); });

  // ---- 4. "Get the app" ----
  var isAndroid = /Android/i.test(navigator.userAgent);
  if (isAndroid) html.classList.add('is-android');
  // Already installed from Play? (Chrome on Android can tell, via related_applications in manifest.json.)
  var hasApp = ('getInstalledRelatedApps' in navigator)
    ? navigator.getInstalledRelatedApps().then(function (a) { return a.length > 0; }).catch(function () { return false; })
    : Promise.resolve(false);
  hasApp.then(function (yes) { if (yes) html.classList.add('has-app'); });
  MO.hasApp = hasApp;

  var banner = document.getElementById('appBanner');
  if (banner && isAndroid && !html.classList.contains('is-app') && MO.views >= 2 && !MO.snoozed('app-banner')) {
    MO.prompting = true;   // claim this page so the alerts card waits for another one
    hasApp.then(function (installed) {
      if (installed) { MO.prompting = false; return; }
      var hide = function (snooze) {
        if (snooze) MO.snooze('app-banner');
        banner.classList.remove('is-in');
        setTimeout(function () { banner.hidden = true; MO.prompting = false; }, 300);
      };
      banner.querySelector('.app-banner__close').addEventListener('click', function () { hide(true); });
      banner.querySelector('.app-banner__btn').addEventListener('click', function () { hide(true); });
      setTimeout(function () { banner.hidden = false; requestAnimationFrame(function () { banner.classList.add('is-in'); }); }, 1500);
    });
  }

  // ---- 1. Register the offline helper after the page has finished loading ----
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', function () {
    navigator.serviceWorker.register(new URL('sw.js', root).href).catch(function () { /* site still works normally */ });
  });
})();
