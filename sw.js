/* ==========================================================================
   sw.js — the app's offline helper (service worker). Lives at the site root.

   YOU NORMALLY NEVER EDIT THIS FILE. New country, university and update pages,
   new CSS/JS files and new photos are picked up automatically: nothing here
   lists pages by name.

   How it decides what to show:
   - Pages (.html):  internet first, so fees and NEET news are always the latest.
                     If the network is slow (over 4 s) or gone, the last saved
                     copy is shown; if there is none, the "You're offline" page.
   - CSS, JS, JSON:  internet first, saved copy as backup. So an edit you commit
                     is live on the next visit — no "clear cache" needed.
   - Photos:         the saved copy shows instantly and is refreshed in the
                     background, so a replaced photo appears on the next visit.
   - Fonts:          saved once, reused (they never change).
   - Never touched:  forms, WhatsApp/phone links, the Ask Mathura AI, PDFs,
                     and anything on another website.

   The only time to edit: if you ADD a shared CSS/JS file to _includes/head.html
   or _includes/scripts.html, add it to SHELL below and raise VERSION by one
   (v1 → v2). Forgetting is harmless — it is still saved the first time it is
   used; SHELL only makes the offline page look right on a phone's first visit.
   ========================================================================== */

const VERSION = 'v1';
const SHELL_CACHE = 'mo-shell-' + VERSION;   // offline page + shared design files
const PAGES_CACHE = 'mo-pages';              // pages the visitor has opened
const ASSETS_CACHE = 'mo-assets';            // css / js / json
const IMAGES_CACHE = 'mo-images';            // photos and icons
const FONTS_CACHE = 'mo-fonts';              // Google Fonts
const KEEP = [SHELL_CACHE, PAGES_CACHE, ASSETS_CACHE, IMAGES_CACHE, FONTS_CACHE];

const LIMITS = { [PAGES_CACHE]: 60, [IMAGES_CACHE]: 120, [ASSETS_CACHE]: 80 };
const SLOW_NETWORK_MS = 4000;
const OFFLINE_PAGE = 'offline.html';

// Saved when the app is installed. Paths are relative to this file (the site root).
const SHELL = [
  OFFLINE_PAGE,
  'css/variables.css', 'css/reset.css', 'css/typography.css', 'css/layout.css',
  'css/components.css', 'css/forms.css', 'css/navigation.css', 'css/footer.css',
  'css/assistant.css', 'css/animations.css', 'css/responsive.css',
  'css/pages/offline.css',
  'js/main.js', 'js/navigation.js', 'js/animations.js', 'js/assistant.js', 'js/pwa.js',
  'js/pages/offline.js',
  'assets/images/app/icon-192.png'
];

/* ---------- Install: save the offline page and the shared design ---------- */
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    // The offline page must succeed; each other file is saved on its own, so one
    // renamed or missing file can never stop the app from installing.
    await cache.add(new Request(OFFLINE_PAGE, { cache: 'reload' }));
    await Promise.all(SHELL.slice(1).map((url) =>
      cache.add(new Request(url, { cache: 'reload' })).catch(() => {})
    ));
    await self.skipWaiting();
  })());
});

/* ---------- Activate: delete caches from older versions ---------- */
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((n) => n.startsWith('mo-') && !KEEP.includes(n))
      .map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

/* ---------- Fetch: route every request ---------- */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;

  const url = new URL(req.url);
  const sameSite = url.origin === self.location.origin;
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!sameSite && !isFont) return;                 // WhatsApp, AI worker, forms: untouched
  if (sameSite && /\.pdf$/i.test(url.pathname)) return; // big downloads stay network-only

  if (isFont) { event.respondWith(cacheFirst(req, FONTS_CACHE)); return; }
  if (req.mode === 'navigate') { event.respondWith(pageRequest(event)); return; }
  if (req.destination === 'image') { event.respondWith(staleWhileRevalidate(event, IMAGES_CACHE)); return; }
  event.respondWith(networkFirst(req, ASSETS_CACHE));
});

/* ---------- Strategies ---------- */

// Pages: try the internet; fall back to a saved copy, then to the offline page.
async function pageRequest(event) {
  const req = event.request;
  const cache = await caches.open(PAGES_CACHE);
  const saved = await cache.match(req, { ignoreSearch: true });

  // Copy the fresh page before the browser reads it, and keep the worker alive
  // until the copy is saved — even if the saved version was shown to the student first.
  const network = fetch(req).then((res) => ({ res, copy: isSaveable(res) ? res.clone() : null }));
  event.waitUntil(network
    .then(({ copy }) => copy && cache.put(stripSearch(req.url), copy).then(() => trim(PAGES_CACHE)))
    .catch(() => {}));
  const fromNetwork = network.then(({ res }) => res);

  try {
    // With a saved copy available, don't keep the student waiting on a slow line.
    return saved ? await raceTimeout(fromNetwork, SLOW_NETWORK_MS) : await fromNetwork;
  } catch (err) {
    if (saved) return saved;
    const offline = await caches.match(OFFLINE_PAGE);
    return offline || new Response('You are offline.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (isSaveable(res)) { await cache.put(req, res.clone()); trim(cacheName); }
    return res;
  } catch (err) {
    const saved = (await cache.match(req, { ignoreSearch: true })) || (await caches.match(req, { ignoreSearch: true }));
    if (saved) return saved;
    throw err;
  }
}

async function staleWhileRevalidate(event, cacheName) {
  const req = event.request;
  const cache = await caches.open(cacheName);
  const saved = await cache.match(req);
  const update = fetch(req).then((res) => {
    if (isSaveable(res)) return cache.put(req, res.clone()).then(() => trim(cacheName)).then(() => res);
    return res;
  });
  if (saved) { event.waitUntil(update.catch(() => {})); return saved; }
  return update;
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const saved = await cache.match(req);
  if (saved) return saved;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
  return res;
}

/* ---------- Helpers ---------- */

function isSaveable(res) {
  // Redirected responses can't be replayed for a page load, so they are never saved.
  return res && res.ok && !res.redirected && (res.type === 'basic' || res.type === 'cors');
}

// "index.html?source=app" and "index.html" are the same page: save it once.
function stripSearch(href) {
  const u = new URL(href);
  u.search = '';
  u.hash = '';
  return u.href;
}

function raceTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('slow network')), ms);
    promise.then((v) => { clearTimeout(timer); resolve(v); },
                 (e) => { clearTimeout(timer); reject(e); });
  });
}

// Keep each cache from growing forever: drop the oldest entries past the limit.
async function trim(cacheName) {
  const max = LIMITS[cacheName];
  if (!max) return;
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}
