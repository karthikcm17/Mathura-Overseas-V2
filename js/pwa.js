// pwa.js — turns the website into an installable app. Loaded on every page by _includes/scripts.html.
// You never need to edit this file.
//
// 1. Registers sw.js (the offline helper). Its address is worked out from THIS file's own
//    location (js/pwa.js → ../sw.js), so it is always the site root — on localhost, on a
//    github.io preview address, on mathuraoverseas.com, and on any future sub-folder page.
// 2. Adds the class "is-app" to <html> when the site is opened as the Android app, so CSS
//    can show or hide things only inside the app, e.g.
//        .is-app .get-the-app-banner { display: none; }
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

  // ---- 1. Register the offline helper after the page has finished loading ----
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', function () {
    navigator.serviceWorker.register(new URL('sw.js', root).href).catch(function () { /* site still works normally */ });
  });
})();
