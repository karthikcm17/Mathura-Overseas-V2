// pwa.js — turns the website into an installable app. Loaded on every page by _includes/scripts.html.
// You never need to edit this file.
//
// 1. Registers sw.js (the offline helper). Its address is worked out from THIS file's own
//    location (js/pwa.js → ../sw.js), so it is always the site root — on localhost, on a
//    github.io preview address, on mathuraoverseas.com, and on any future sub-folder page.
// 2. Adds the class "is-app" to <html> when the site is opened as the Android app, so CSS
//    can show or hide things only inside the app, e.g.
//        .is-app .get-the-app-banner { display: none; }
// 3. Shows the "Get the app" links and the Android install banner (see step 3 below).
(function () {
  var script = document.currentScript;
  var root = new URL('../', script.src);

  // ---- 2. Inside the app? (Play Store app, or "Add to Home screen") ----
  try {
    var params = new URLSearchParams(location.search);
    var inApp = params.get('source') === 'app' ||
      document.referrer.indexOf('android-app://') === 0 ||
      window.matchMedia('(display-mode: standalone)').matches;
    if (inApp) sessionStorage.setItem('mo-app', '1');
    if (inApp || sessionStorage.getItem('mo-app') === '1') document.documentElement.classList.add('is-app');
  } catch (e) { /* private mode: sessionStorage may be blocked — harmless */ }

  // ---- 3. "Get the app" (only once play_store_url is filled in _config.yml) ----
  // Android phones get the class "is-android", which shows the menu's app link (iPhones never see it).
  // The install banner appears from the 2nd page view on, 1.5 s after the page opens, and stays away
  // for 30 days once closed or tapped. Inside the app none of this shows (CSS hides it under .is-app).
  var html = document.documentElement;
  var isAndroid = /Android/i.test(navigator.userAgent);
  if (isAndroid) html.classList.add('is-android');
  var banner = document.getElementById('appBanner');
  if (banner && isAndroid && !html.classList.contains('is-app')) {
    var CLOSED = 'mo-app-banner-closed', VIEWS = 'mo-page-views', MONTH = 30 * 24 * 60 * 60 * 1000;
    var store = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
                  set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
    var views = (parseInt(store.get(VIEWS), 10) || 0) + 1;
    store.set(VIEWS, String(views));
    var closedAt = parseInt(store.get(CLOSED), 10) || 0;
    if (views >= 2 && Date.now() - closedAt > MONTH) {
      var hide = function () { banner.classList.remove('is-in'); store.set(CLOSED, String(Date.now())); setTimeout(function () { banner.hidden = true; }, 300); };
      banner.querySelector('.app-banner__close').addEventListener('click', hide);
      banner.querySelector('.app-banner__btn').addEventListener('click', hide);
      setTimeout(function () { banner.hidden = false; requestAnimationFrame(function () { banner.classList.add('is-in'); }); }, 1500);
    }
  }

  // ---- 1. Register the offline helper after the page has finished loading ----
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', function () {
    navigator.serviceWorker.register(new URL('sw.js', root).href).catch(function () { /* site still works normally */ });
  });
})();
