// offline.js — only for offline.html.
// Lists the pages saved on this phone (newest first) so the student can keep reading without internet,
// and reloads automatically the moment the connection comes back.
// New country, university and update pages appear here by themselves — nothing is listed by name.
(function () {
  var list = document.getElementById('offlineList');
  var empty = document.getElementById('offlineEmpty');
  var retry = document.getElementById('offlineRetry');
  var MAX = 12;

  if (retry) retry.addEventListener('click', function () { location.reload(); });
  window.addEventListener('online', function () { location.reload(); });

  function showEmpty() { if (empty) empty.hidden = false; }
  if (!list || !('caches' in window)) { showEmpty(); return; }

  function pageTitle(html, url) {
    if (/(^|\/)(index\.html)?$/.test(url.pathname)) return 'Home';
    var m = html.match(/<title>([^<]*)<\/title>/i);
    var t = m ? m[1] : url.pathname.split('/').pop().replace(/\.html$/, '').replace(/-/g, ' ');
    var tmp = document.createElement('textarea');        // decodes &amp; &rsquo; etc.
    tmp.innerHTML = t.split('|')[0].trim();
    return tmp.value || 'Home';
  }

  function icon(id, cls) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'icon' + (cls ? ' ' + cls : ''));
    svg.setAttribute('aria-hidden', 'true');
    var use = document.createElementNS(ns, 'use');
    use.setAttribute('href', '#' + id);
    svg.appendChild(use);
    return svg;
  }

  caches.open('mo-pages')
    .then(function (cache) {
      return cache.keys().then(function (keys) {
        keys = keys.reverse().filter(function (r) { return !/offline\.html$/.test(r.url); }).slice(0, MAX);
        return Promise.all(keys.map(function (req) {
          return cache.match(req).then(function (res) { return res.text(); })
            .then(function (html) { return { url: new URL(req.url), title: pageTitle(html, new URL(req.url)) }; });
        }));
      });
    })
    .then(function (pages) {
      if (!pages.length) { showEmpty(); return; }
      pages.forEach(function (p) {
        var li = document.createElement('li');
        li.className = 'offline__item';
        var a = document.createElement('a');
        a.href = p.url.pathname;
        var ico = document.createElement('span');
        ico.className = 'offline__item-ico';
        ico.appendChild(icon('i-clock'));
        var text = document.createElement('span');
        text.className = 'offline__item-text';
        text.textContent = p.title;
        a.appendChild(ico);
        a.appendChild(text);
        a.appendChild(icon('i-chevron-right', 'offline__item-go'));
        li.appendChild(a);
        list.appendChild(li);
      });
    })
    .catch(showEmpty);
})();
