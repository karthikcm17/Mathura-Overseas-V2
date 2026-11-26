/* ==========================================================================
   Mathura Push — our own push-notification service (Cloudflare Worker, free plan).
   Setup steps: PUSH_SETUP.md. Deploy this file as a SEPARATE worker named "mathura-push"
   (Ask Mathura keeps its own worker).

   Needs, in the worker's Settings:
     Binding  DB                 → a D1 database (any name, e.g. mathura-push). Tables are created automatically.
     Secret   VAPID_PUBLIC_KEY   ┐ make both on  https://<this worker>/setup  (one click, in your browser)
     Secret   VAPID_PRIVATE_KEY  ┘
     Secret   ADMIN_KEY          → your send password (used by /admin and by the GitHub automations)
     Text     SITE_URL           → optional; default https://mathuraoverseas.com
     Text     ALLOWED_ORIGINS    → optional; comma-separated sites allowed to subscribe

   How a notification travels (no paid service anywhere):
     1. A phone or browser that allows alerts gets a private address from its push service
        (Chrome uses Google's free push network). The site sends that address to /subscribe.
     2. To send, you (on /admin) or a GitHub automation POST the message to /api/send, then call
        /api/batch until done. Each batch wakes 45 phones: the free plan allows 50 outside calls
        per run, so big lists are sent in small, safe steps.
     3. Each phone wakes its offline helper (sw.js), which fetches the text from /latest and shows it.
        The wake-up itself carries no text, so nothing private ever passes through Google.
   ========================================================================== */

const TOPICS = ['updates', 'deadlines', 'news'];
const BATCH = 45;                       // free plan: 50 outside calls per run; keep 5 spare
const KEEP_DAYS = 3;                    // /latest shows messages from the last 3 days
const PUSH_HOSTS = [                    // only real browser push services may be stored (stops misuse)
  'fcm.googleapis.com', 'android.googleapis.com', 'updates.push.services.mozilla.com',
  'push.services.mozilla.com', 'notify.windows.com', 'web.push.apple.com'
];

let schemaReady = false;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const site = (env.SITE_URL || 'https://mathuraoverseas.com').replace(/\/+$/, '');
    const cors = corsHeaders(request.headers.get('Origin'), env, site);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    try {
      if (path === '/setup') return page(SETUP_PAGE);
      if (path === '/admin') return page(ADMIN_PAGE);
      if (!env.DB) return text('Mathura push worker: the D1 database is not connected yet (binding name must be DB). See PUSH_SETUP.md, step 2.', 500);
      await ensureSchema(env.DB);

      if (path === '/') {
        return text([
          'Mathura push worker: working',
          'Database: connected',
          'Keys: ' + (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY ? 'set' : 'NOT set — open /setup'),
          'Admin password: ' + (env.ADMIN_KEY ? 'set' : 'NOT set'),
          'Website: ' + site
        ].join('\n'));
      }

      // ---------- Public: used by the website and the offline helper ----------
      if (path === '/vapid' && request.method === 'GET') {
        return json({ key: env.VAPID_PUBLIC_KEY || null }, 200, cors);
      }

      if (path === '/subscribe' && request.method === 'POST') {
        if (!cors['Access-Control-Allow-Origin']) return json({ error: 'origin not allowed' }, 403, cors);
        const body = await readJson(request);
        const sub = body && body.subscription;
        if (!sub || !validEndpoint(sub.endpoint)) return json({ error: 'invalid subscription' }, 400, cors);
        const topics = cleanTopics(body.topics);
        const source = body.source === 'app' ? 'app' : 'web';
        const keys = sub.keys || {};
        await env.DB.prepare(
          `INSERT INTO subscribers (endpoint, p256dh, auth, source, topics, created, seen)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)
           ON CONFLICT(endpoint) DO UPDATE SET source = ?4, topics = ?5, seen = ?6, p256dh = ?2, auth = ?3`
        ).bind(sub.endpoint, String(keys.p256dh || ''), String(keys.auth || ''), source, topics, Date.now()).run();
        return json({ ok: true }, 200, cors);
      }

      if (path === '/unsubscribe' && request.method === 'POST') {
        const body = await readJson(request);
        if (body && validEndpoint(body.endpoint)) {
          await env.DB.prepare('DELETE FROM subscribers WHERE endpoint = ?').bind(body.endpoint).run();
        }
        return json({ ok: true }, 200, cors);
      }

      if (path === '/latest' && request.method === 'GET') {
        const since = Date.now() - KEEP_DAYS * 86400000;
        const rows = await env.DB.prepare(
          'SELECT id, created, topic, title, body, url, image FROM messages WHERE created > ? ORDER BY id DESC LIMIT 5'
        ).bind(since).all();
        return json({ messages: rows.results || [] }, 200, { ...cors, 'Cache-Control': 'no-store' });
      }

      // ---------- Private: /admin page and GitHub automations (password needed) ----------
      if (path.startsWith('/api/')) {
        const auth = request.headers.get('Authorization') || '';
        if (!env.ADMIN_KEY || auth !== 'Bearer ' + env.ADMIN_KEY) return json({ error: 'wrong password' }, 401);

        if (path === '/api/stats') {
          const t = await env.DB.prepare(
            `SELECT COUNT(*) AS total, SUM(source = 'app') AS app, SUM(source = 'web') AS web FROM subscribers`
          ).first();
          const recent = await env.DB.prepare(
            'SELECT id, created, topic, title, body, url, total, sent, failed FROM messages ORDER BY id DESC LIMIT 12'
          ).all();
          const newest = await env.DB.prepare(
            'SELECT source, created, seen, endpoint FROM subscribers ORDER BY id DESC LIMIT 8'
          ).all();
          const devices = (newest.results || []).map((s) => ({
            source: s.source, created: s.created, seen: s.seen,
            service: /fcm|android\.googleapis/.test(s.endpoint) ? 'Android / Chrome' : /mozilla/.test(s.endpoint) ? 'Firefox' : /windows/.test(s.endpoint) ? 'Edge' : /apple/.test(s.endpoint) ? 'Safari' : 'Other'
          }));
          return json({ subscribers: { total: t.total || 0, app: t.app || 0, web: t.web || 0 }, recent: recent.results || [], devices });
        }

        if (path === '/api/send' && request.method === 'POST') {
          if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return json({ error: 'keys not set — open /setup' }, 400);
          const b = await readJson(request) || {};
          const title = clip(b.title, 80), body = clip(b.body, 240);
          if (!title || !body) return json({ error: 'title and message are both needed' }, 400);
          const topic = TOPICS.includes(b.topic) ? b.topic : 'news';
          const link = siteLink(b.url, site);
          if (link === null) return json({ error: 'the link must be a page on ' + site }, 400);
          const image = b.image ? siteLink(b.image, site) : '';
          if (image === null) return json({ error: 'the image must be on ' + site }, 400);
          const ref = b.ref ? clip(b.ref, 200) : null;
          if (ref) {
            const dup = await env.DB.prepare('SELECT id FROM messages WHERE ref = ?').bind(ref).first();
            if (dup) return json({ id: dup.id, duplicate: true, total: 0 });
          }
          const count = await env.DB.prepare(
            `SELECT COUNT(*) AS n FROM subscribers WHERE (',' || topics || ',') LIKE ?`
          ).bind('%,' + topic + ',%').first();
          const res = await env.DB.prepare(
            `INSERT INTO messages (created, topic, title, body, url, image, ref, total, sent, failed)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`
          ).bind(Date.now(), topic, title, body, link, image || '', ref, count.n || 0).run();
          return json({ id: res.meta.last_row_id, total: count.n || 0, duplicate: false });
        }

        if (path === '/api/batch' && request.method === 'POST') {
          const b = await readJson(request) || {};
          const msg = await env.DB.prepare('SELECT id, topic FROM messages WHERE id = ?').bind(Number(b.id) || 0).first();
          if (!msg) return json({ error: 'message not found' }, 404);
          const after = Number(b.after) || 0;
          const rows = (await env.DB.prepare(
            `SELECT id, endpoint FROM subscribers WHERE id > ? AND (',' || topics || ',') LIKE ? ORDER BY id LIMIT ?`
          ).bind(after, '%,' + msg.topic + ',%', BATCH).all()).results || [];

          const jwtFor = vapidSigner(env);
          if (rows.length) await jwtFor(new URL(rows[0].endpoint).origin);   // a key problem shows as an error, not silent failures
          let sent = 0, gone = [], failed = 0;
          await Promise.all(rows.map(async (r) => {
            try {
              const aud = new URL(r.endpoint).origin;
              const res = await fetch(r.endpoint, {
                method: 'POST',
                headers: {
                  TTL: '86400',                 // keep trying for a day if the phone is off
                  Urgency: msg.topic === 'deadlines' ? 'high' : 'normal',
                  Authorization: 'vapid t=' + (await jwtFor(aud)) + ', k=' + env.VAPID_PUBLIC_KEY,
                  'Content-Length': '0'
                }
              });
              if (res.status === 404 || res.status === 410) gone.push(r.id);   // phone unsubscribed or app removed
              else if (res.ok) sent++;
              else failed++;
            } catch (e) { failed++; }
          }));

          const stmts = [env.DB.prepare('UPDATE messages SET sent = sent + ?, failed = failed + ? WHERE id = ?').bind(sent, failed + gone.length, msg.id)];
          if (gone.length) stmts.push(env.DB.prepare(`DELETE FROM subscribers WHERE id IN (${gone.map(() => '?').join(',')})`).bind(...gone));
          await env.DB.batch(stmts);

          const next = rows.length ? rows[rows.length - 1].id : after;
          return json({ sent, failed, removed: gone.length, next, done: rows.length < BATCH });
        }
      }

      return json({ error: 'not found' }, 404, cors);
    } catch (err) {
      return json({ error: String(err && err.message || err) }, 500, cors);
    }
  }
};

/* ---------------- Database ---------------- */
async function ensureSchema(db) {
  if (schemaReady) return;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT, endpoint TEXT NOT NULL UNIQUE, p256dh TEXT, auth TEXT,
      source TEXT NOT NULL DEFAULT 'web', topics TEXT NOT NULL, created INTEGER NOT NULL, seen INTEGER)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT, created INTEGER NOT NULL, topic TEXT NOT NULL, title TEXT NOT NULL,
      body TEXT NOT NULL, url TEXT NOT NULL, image TEXT, ref TEXT UNIQUE, total INTEGER, sent INTEGER, failed INTEGER)`),
    db.prepare('CREATE INDEX IF NOT EXISTS messages_created ON messages (created)')
  ]);
  schemaReady = true;
}

/* ---------------- VAPID (proves to the push service that the message is from us) ---------------- */
function vapidSigner(env) {
  const cache = new Map();
  const jwk = readPrivateKey(env.VAPID_PRIVATE_KEY);   // a bad paste stops here with a clear message
  const keyPromise = crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
    .catch(() => { throw new Error('VAPID_PRIVATE_KEY is not a valid key: paste it again from /setup'); });
  return async (aud) => {
    if (cache.has(aud)) return cache.get(aud);
    const key = await keyPromise;
    const head = b64url(utf8(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
    const claims = b64url(utf8(JSON.stringify({
      aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600,
      sub: env.VAPID_SUBJECT || 'mailto:mathuraoverseas@gmail.com'
    })));
    const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, utf8(head + '.' + claims));
    const token = head + '.' + claims + '.' + b64url(new Uint8Array(sig));
    cache.set(aud, token);
    return token;
  };
}

/* ---------------- Helpers ---------------- */
// Accepts the key exactly as /setup shows it, and forgives extra quotes or \" from copy-pasting.
function readPrivateKey(raw) {
  let v = String(raw || '').trim();
  for (let i = 0; i < 3 && typeof v === 'string'; i++) {
    try { v = JSON.parse(v); } catch (e) {
      try { v = JSON.parse(v.replace(/^['"]|['"]$/g, '').replace(/\\"/g, '"')); } catch (e2) { break; }
    }
  }
  if (!v || typeof v !== 'object' || !v.d) throw new Error('VAPID_PRIVATE_KEY is not a valid key: paste it again from /setup');
  return { kty: v.kty, crv: v.crv, x: v.x, y: v.y, d: v.d };
}
function corsHeaders(origin, env, site) {
  const allowed = (env.ALLOWED_ORIGINS || [site, site.replace('://', '://www.'), 'http://127.0.0.1:4000', 'http://localhost:4000'].join(','))
    .split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean);
  const h = { 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' };
  if (origin && allowed.includes(origin)) h['Access-Control-Allow-Origin'] = origin;
  return h;
}
function validEndpoint(e) {
  if (typeof e !== 'string' || e.length > 1000) return false;
  try {
    const u = new URL(e);
    return u.protocol === 'https:' && PUSH_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith('.' + h));
  } catch (err) { return false; }
}
function cleanTopics(t) {
  const list = String(t || TOPICS.join(',')).split(',').map((s) => s.trim()).filter((s) => TOPICS.includes(s));
  return (list.length ? list : TOPICS).join(',');
}
function siteLink(u, site) {
  if (!u) return site + '/';
  u = String(u).trim();
  if (u.startsWith('/')) return site + u;
  if (!/^https?:/i.test(u)) return site + '/' + u;
  return u.startsWith(site + '/') || u === site ? u : null;
}
function clip(s, n) { return String(s || '').replace(/\s+/g, ' ').trim().slice(0, n); }
async function readJson(req) { try { return await req.json(); } catch (e) { return null; } }
function utf8(s) { return new TextEncoder().encode(s); }
function b64url(bytes) {
  let s = ''; bytes.forEach((b) => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } });
}
function text(s, status = 200) { return new Response(s, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }); }
function page(html) {
  return new Response(html, { headers: {
    'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
    'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex'
  } });
}

/* ---------------- /setup: makes the two keys in YOUR browser (they never pass through anyone) ---------------- */
const SETUP_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mathura Push · Setup</title><style>
body{margin:0;font:15px/1.55 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#F8F7F3;color:#17212B}
main{max-width:760px;margin:0 auto;padding:32px 20px}h1{color:#0B1F4D;margin:0 0 6px}p{color:#5B6670}
button{font:inherit;font-weight:800;padding:12px 22px;border:0;border-radius:10px;background:#1E3A8A;color:#fff;cursor:pointer}
.box{margin:18px 0;padding:16px;border:1px solid #E3E1DA;border-radius:14px;background:#fff}
label{display:block;font-weight:800;color:#0B1F4D;margin-bottom:6px}textarea{width:100%;box-sizing:border-box;font:12px/1.4 ui-monospace,Consolas,monospace;padding:10px;border:1px solid #E3E1DA;border-radius:10px;resize:vertical}
.copy{margin-top:6px;padding:7px 14px;font-size:13px;background:#EEF2FC;color:#1E3A8A}.warn{color:#B42318;font-weight:700}
</style></head><body><main>
<h1>Mathura Push · one-time setup</h1>
<p>Click the button once. It makes your three secrets <b>in this browser</b>. Copy each into the worker: <b>Settings → Variables and Secrets → Add → type Secret</b>, using exactly the names shown. Then click <b>Deploy</b>.</p>
<p class="warn">Do this only once. Making new keys later disconnects every phone that already allowed alerts.</p>
<button id="go">Make my keys</button>
<div id="out" hidden>
 <div class="box"><label>VAPID_PUBLIC_KEY</label><textarea id="pub" rows="2" readonly></textarea><button class="copy" data-c="pub">Copy</button></div>
 <div class="box"><label>VAPID_PRIVATE_KEY</label><textarea id="priv" rows="4" readonly></textarea><button class="copy" data-c="priv">Copy</button></div>
 <div class="box"><label>ADMIN_KEY <span style="font-weight:400;color:#5B6670">(your send password — also keep it in your password manager)</span></label><textarea id="adm" rows="1" readonly></textarea><button class="copy" data-c="adm">Copy</button></div>
</div></main><script>
function b64u(b){var s='';new Uint8Array(b).forEach(function(x){s+=String.fromCharCode(x)});return btoa(s).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'')}
document.getElementById('go').onclick=async function(){
 var k=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 document.getElementById('pub').value=b64u(await crypto.subtle.exportKey('raw',k.publicKey));
 var j=await crypto.subtle.exportKey('jwk',k.privateKey);
 document.getElementById('priv').value=JSON.stringify({kty:j.kty,crv:j.crv,x:j.x,y:j.y,d:j.d});
 var r=new Uint8Array(24);crypto.getRandomValues(r);document.getElementById('adm').value='mo-'+b64u(r);
 document.getElementById('out').hidden=false;this.disabled=true;this.textContent='Keys made — copy them below';};
document.addEventListener('click',function(e){var c=e.target.getAttribute('data-c');if(!c)return;var t=document.getElementById(c);t.select();navigator.clipboard.writeText(t.value);e.target.textContent='Copied';});
</script></body></html>`;

/* ---------------- /admin: write and send a notification ---------------- */
const ADMIN_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mathura Push · Send</title><style>
:root{--navy:#1E3A8A;--ink:#0B1F4D;--wash:#EEF2FC;--line:#E3E1DA;--muted:#5B6670}
*{box-sizing:border-box}body{margin:0;font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#F8F7F3;color:#17212B}
header{background:linear-gradient(135deg,#1E3A8A,#2B4FB5 60%,#3A63D1);color:#fff;padding:22px 20px 70px}
header .in,main{max-width:980px;margin:0 auto}header h1{margin:0;font-size:22px}header p{margin:4px 0 0;color:#C9D6F5}
main{padding:0 20px 40px;margin-top:-52px;display:grid;gap:18px}
.card{background:#fff;border:1px solid var(--line);border-radius:18px;padding:20px;box-shadow:0 8px 22px rgba(30,58,138,.10)}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.stat{padding:14px;border-radius:14px;background:var(--wash)}
.stat b{display:block;font-size:26px;color:var(--ink)}.stat span{font-size:12px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.06em}
.grid{display:grid;gap:18px}@media(min-width:860px){.grid{grid-template-columns:1.2fr 1fr}}
label{display:block;font-weight:800;font-size:13px;color:var(--ink);margin:14px 0 6px}label small{font-weight:500;color:var(--muted)}
input,textarea,select{width:100%;font:inherit;padding:11px 13px;border:1.5px solid var(--line);border-radius:10px;background:#fff}
input:focus,textarea:focus,select:focus{outline:none;border-color:var(--navy)}
button{font:inherit;font-weight:800;border:0;border-radius:10px;cursor:pointer}
.send{margin-top:18px;width:100%;padding:14px;background:var(--navy);color:#fff;font-size:16px}.send:disabled{opacity:.55;cursor:default}
.ghost{padding:8px 14px;background:var(--wash);color:var(--navy);font-size:13px}
.phone{border-radius:28px;background:#1b1b1f;padding:16px 12px;min-height:250px}
.note{display:flex;gap:10px;background:#2d2f36;border-radius:18px;padding:12px;color:#e8eaed}
.note img{width:22px;height:22px;border-radius:50%}.note .t{font-weight:700;font-size:14px}.note .b{font-size:13px;color:#bdc1c6;margin-top:2px;word-break:break-word}
.note .app{font-size:11px;color:#9aa0a6;margin-bottom:4px}.note .pic{margin-top:8px;width:100%;border-radius:10px;display:none}
.bar{height:8px;border-radius:9px;background:var(--wash);overflow:hidden;margin-top:12px}.bar i{display:block;height:100%;width:0;background:var(--navy);transition:width .3s}
.msg{margin-top:10px;font-weight:700}.ok{color:#0F7B4B}.err{color:#B42318}
table{width:100%;border-collapse:collapse;font-size:13px}td,th{text-align:left;padding:9px 6px;border-top:1px solid var(--line)}th{color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.06em;border:0}
.tag{display:inline-block;padding:2px 8px;border-radius:99px;background:var(--wash);color:var(--navy);font-size:11px;font-weight:800}
.login{max-width:420px;margin:0 auto}.row{display:flex;gap:10px;align-items:center;justify-content:space-between}
</style></head><body>
<header><div class="in row"><div><h1>Mathura Push</h1><p>Send a notification to everyone who allowed alerts</p></div><button class="ghost" id="logout" hidden>Log out</button></div></header>
<main>
<section class="card login" id="login"><label for="key">Admin password <small>(ADMIN_KEY)</small></label><input id="key" type="password" autocomplete="current-password"><button class="send" id="enter">Open</button><p class="msg err" id="loginMsg"></p></section>
<div id="app" hidden class="grid">
 <div class="grid" style="grid-template-columns:1fr">
  <section class="card"><div class="stats"><div class="stat"><span>Subscribers</span><b id="sTotal">–</b></div><div class="stat"><span>In the app</span><b id="sApp">–</b></div><div class="stat"><span>On the website</span><b id="sWeb">–</b></div></div></section>
  <section class="card"><h2 style="margin:0;font-size:18px;color:var(--ink)">New notification</h2>
   <label for="topic">Type</label><select id="topic"><option value="news">Announcement</option><option value="updates">NEET / counselling update</option><option value="deadlines">Counselling dates</option></select>
   <label for="title">Title <small>— short, about 50 characters</small></label><input id="title" maxlength="80" placeholder="e.g. Free MBBS abroad webinar this Sunday">
   <label for="body">Message <small>— one or two lines</small></label><textarea id="body" rows="3" maxlength="240" placeholder="e.g. Fees, eligibility and a live Q&amp;A with our counsellors. Tap to register."></textarea>
   <label for="url">Opens this page</label><select id="url"><option value="/">Home</option><option value="/neet-2026-updates.html">NEET updates</option><option value="/destinations.html">Countries &amp; universities</option><option value="/mbbs-abroad-planner.html">MBBS Planner</option><option value="/student-guide.html">Student guide</option><option value="/apply.html">Free counselling form</option><option value="custom">Another page…</option></select>
   <input id="urlCustom" placeholder="/mbbs-in-philippines.html" style="margin-top:8px" hidden>
   <label for="image">Picture <small>— optional, a wide image already on the website</small></label><input id="image" placeholder="/assets/images/og/home.jpg">
   <button class="send" id="send">Send now</button><div class="bar" id="bar" hidden><i></i></div><p class="msg" id="sendMsg"></p>
  </section>
 </div>
 <div class="grid" style="grid-template-columns:1fr;align-content:start">
  <section class="card"><h2 style="margin:0 0 12px;font-size:18px;color:var(--ink)">Preview on Android</h2><div class="phone"><div class="note"><img src="SITE/assets/images/app/icon-192.png" alt=""><div style="flex:1;min-width:0"><div class="app">Mathura Overseas · now</div><div class="t" id="pT">Your title</div><div class="b" id="pB">Your message</div><img class="pic" id="pI" alt=""></div></div></div></section>
  <section class="card"><h2 style="margin:0 0 6px;font-size:18px;color:var(--ink)">Newest subscribers</h2><p style="margin:0 0 8px;color:var(--muted);font-size:13px">Turned on alerts on your own phone? It should appear at the top within seconds.</p><table><thead><tr><th>Joined</th><th>From</th><th>Push service</th></tr></thead><tbody id="devices"></tbody></table></section>
  <section class="card"><div class="row"><h2 style="margin:0;font-size:18px;color:var(--ink)">Recently sent</h2><button class="ghost" id="refresh">Refresh</button></div><table><thead><tr><th>When</th><th>Notification</th><th>Delivered</th></tr></thead><tbody id="recent"></tbody></table></section>
 </div>
</div>
</main><script>
var SITE=location.search.match(/site=([^&]+)/)?decodeURIComponent(RegExp.$1):'https://mathuraoverseas.com';
document.querySelector('.note img').src=SITE+'/assets/images/app/icon-192.png';
var K=localStorage.getItem('mo-push-admin')||'';var $=function(i){return document.getElementById(i)};
function api(p,b){return fetch(p,{method:b?'POST':'GET',headers:{'Authorization':'Bearer '+K,'Content-Type':'application/json'},body:b?JSON.stringify(b):undefined}).then(function(r){return r.json().then(function(j){if(!r.ok)throw new Error(j.error||r.status);return j})})}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
var NAMES={news:'Announcement',updates:'Update',deadlines:'Dates'};
function load(){return api('/api/stats').then(function(d){$('login').hidden=true;$('app').hidden=false;$('logout').hidden=false;
 $('sTotal').textContent=d.subscribers.total;$('sApp').textContent=d.subscribers.app;$('sWeb').textContent=d.subscribers.web;
 $('recent').innerHTML=d.recent.map(function(m){return '<tr><td>'+new Date(m.created).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})+'</td><td><span class="tag">'+NAMES[m.topic]+'</span> <b>'+esc(m.title)+'</b></td><td>'+m.sent+' / '+m.total+'</td></tr>'}).join('')||'<tr><td colspan="3">Nothing sent yet.</td></tr>';
 $('devices').innerHTML=(d.devices||[]).map(function(s){return '<tr><td>'+new Date(s.created).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})+'</td><td><span class="tag">'+(s.source==='app'?'App':'Website')+'</span></td><td>'+esc(s.service)+'</td></tr>'}).join('')||'<tr><td colspan="3">No subscribers yet.</td></tr>';})}
function enter(){K=$('key').value.trim();load().then(function(){localStorage.setItem('mo-push-admin',K)}).catch(function(e){$('loginMsg').textContent=e.message})}
$('enter').onclick=enter;$('key').onkeydown=function(e){if(e.key==='Enter')enter()};
$('logout').onclick=function(){localStorage.removeItem('mo-push-admin');location.reload()};$('refresh').onclick=load;
if(K)load().catch(function(){$('login').hidden=false});
function prev(){$('pT').textContent=$('title').value||'Your title';$('pB').textContent=$('body').value||'Your message';var im=$('image').value.trim();$('pI').style.display=im?'block':'none';if(im)$('pI').src=im.indexOf('http')===0?im:SITE+(im[0]==='/'?'':'/')+im}
['title','body','image'].forEach(function(i){$(i).oninput=prev});
$('url').onchange=function(){$('urlCustom').hidden=this.value!=='custom'};
$('send').onclick=async function(){var btn=this,m=$('sendMsg');m.className='msg';
 var url=$('url').value==='custom'?$('urlCustom').value:$('url').value;
 if(!confirm('Send this notification to everyone who allowed alerts?'))return;
 btn.disabled=true;m.textContent='Sending…';$('bar').hidden=false;var bar=$('bar').firstChild;bar.style.width='4%';
 try{var s=await api('/api/send',{title:$('title').value,body:$('body').value,url:url,image:$('image').value.trim(),topic:$('topic').value});
  var after=0,sent=0,done=s.total===0;while(!done){var r=await api('/api/batch',{id:s.id,after:after});after=r.next;sent+=r.sent;done=r.done;bar.style.width=Math.min(100,Math.round(sent/Math.max(1,s.total)*100))+'%'}
  bar.style.width='100%';m.className='msg ok';m.textContent='Sent to '+sent+' of '+s.total+' subscribers.';$('title').value='';$('body').value='';$('image').value='';prev();load();
 }catch(e){m.className='msg err';m.textContent='Not sent: '+e.message}btn.disabled=false};
</script></body></html>`;
