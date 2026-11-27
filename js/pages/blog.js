// blog.js — the blog list (blog.html) and every blog post (_layouts/post.html). Nothing here needs editing per post.
//   List page: the category buttons (and #category links from a post's category pill).
//   Post page: the "In this article" list (made from the post's ## headings), the reading bar, the share buttons.
(function () {
  'use strict';

  /* ---------------- LIST PAGE: category buttons ---------------- */
  var chips = document.getElementById('blogChips');
  if (chips) {
    var cards = Array.prototype.slice.call(document.querySelectorAll('#blogLead .blog-card, #blogGrid .blog-card'));
    var lead = document.getElementById('blogLead');
    var none = document.getElementById('blogNone');

    var show = function (cat) {
      var shown = 0;
      chips.querySelectorAll('.blog-chip').forEach(function (b) {
        var on = b.getAttribute('data-cat') === cat;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      cards.forEach(function (c) {
        var hit = cat === 'all' || c.getAttribute('data-cat') === cat;
        c.hidden = !hit;
        if (hit) { shown++; c.classList.add('is-in'); }   // skip the scroll reveal for cards shown by a filter
      });
      lead.hidden = !!lead.querySelector('.blog-card[hidden]');
      none.hidden = shown > 0;
    };

    chips.addEventListener('click', function (e) {
      var b = e.target.closest('.blog-chip');
      if (!b) return;
      var cat = b.getAttribute('data-cat');
      show(cat);
      history.replaceState(null, '', cat === 'all' ? location.pathname : '#' + cat);
    });

    var start = decodeURIComponent(location.hash.slice(1));
    if (start && chips.querySelector('[data-cat="' + start.replace(/"/g, '') + '"]')) show(start);
  }

  /* ---------------- POST PAGE ---------------- */
  var article = document.getElementById('postArticle');
  if (!article) return;

  // 0. Tables: wrap each in a box that scrolls sideways on phones
  article.querySelectorAll('table').forEach(function (t) {
    var box = document.createElement('div');
    box.className = 'prose-table';
    t.parentNode.insertBefore(box, t);
    box.appendChild(t);
  });

  // 1. "In this article": one link per ## heading (needs 3 or more to be worth showing)
  var toc = document.getElementById('postToc');
  var list = document.getElementById('postTocList');
  var heads = Array.prototype.slice.call(article.querySelectorAll('h2'));
  var links = [];
  if (toc && heads.length >= 3) {
    heads.forEach(function (h, i) {
      if (!h.id) h.id = 'section-' + (i + 1);
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = h.textContent;
      li.appendChild(a);
      list.appendChild(li);
      links.push(a);
    });
    toc.hidden = false;
    var wide = window.matchMedia('(min-width: 1024px)');
    var setOpen = function () { toc.open = wide.matches; };
    setOpen();
    if (wide.addEventListener) wide.addEventListener('change', setOpen);
    // Phones: close the fold-out after a tap so the reader lands on the section
    list.addEventListener('click', function () { if (!wide.matches) toc.open = false; });

    // Highlight the section being read
    if ('IntersectionObserver' in window) {
      var current = null;
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) current = en.target.id; });
        links.forEach(function (a) { a.classList.toggle('is-current', a.getAttribute('href') === '#' + current); });
      }, { rootMargin: '0px 0px -70% 0px' });
      heads.forEach(function (h) { io.observe(h); });
    }
  }

  // 2. Reading bar (transform only, so scrolling stays smooth)
  var bar = document.getElementById('postProgress');
  if (bar) {
    var ticking = false;
    var paint = function () {
      var r = article.getBoundingClientRect();
      var total = r.height - window.innerHeight * 0.6;
      var p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 1;
      bar.style.transform = 'scaleX(' + p.toFixed(3) + ')';
      ticking = false;
    };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(paint); } }, { passive: true });
    paint();
  }

  // 3. Share buttons
  var msg = document.querySelector('.post-share__msg');
  var say = function (t) { if (!msg) return; msg.textContent = t; setTimeout(function () { msg.textContent = ''; }, 2500); };
  var copyBtn = document.querySelector('[data-copy-link]');
  if (copyBtn) copyBtn.addEventListener('click', function () {
    var link = copyBtn.getAttribute('data-copy-link');
    if (navigator.clipboard) navigator.clipboard.writeText(link).then(function () { say('Link copied'); }, function () { say(link); });
    else say(link);
  });
  var nativeBtn = document.querySelector('[data-native-share]');
  if (nativeBtn && navigator.share) {
    nativeBtn.hidden = false;
    nativeBtn.addEventListener('click', function () {
      navigator.share({ title: document.querySelector('.post-hero h1').textContent, url: copyBtn ? copyBtn.getAttribute('data-copy-link') : location.href }).catch(function () {});
    });
  }
})();
