// Shared by the push automations (new posts, tracker changes). Sends one notification through our push worker, in safe batches.
// Does nothing (and doesn't fail) until the PUSH_API and PUSH_ADMIN_KEY secrets are added — see PUSH_SETUP.md.
export async function sendPush(msg) {
  if (process.env.DRY) { console.log('DRY RUN (nothing sent) → ' + msg.title + ' | ' + msg.body + ' | ' + msg.url); return; }
  const api = String(process.env.PUSH_API || '').replace(/\/+$/, '');
  const key = process.env.PUSH_ADMIN_KEY || '';
  if (!api || !key) { console.log('Push alerts are not set up yet (PUSH_API / PUSH_ADMIN_KEY secrets missing). Nothing sent.'); return; }

  const call = async (path, body) => {
    const res = await fetch(api + path, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(path + ' failed: ' + (data.error || res.status));
    return data;
  };

  const created = await call('/api/send', msg);
  if (created.duplicate) { console.log('Already sent earlier (' + msg.ref + '). Skipped.'); return; }
  let after = 0, sent = 0, done = created.total === 0;
  while (!done) {
    const r = await call('/api/batch', { id: created.id, after });
    after = r.next; sent += r.sent; done = r.done;
  }
  console.log('Sent "' + msg.title + '" to ' + sent + ' of ' + created.total + ' subscribers.');
}

export const clip = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; };

import { execSync } from 'node:child_process';

// The file as it was before this push (null if there is no earlier version to compare with).
export function previousJson(file) {
  const before = process.env.BEFORE || '';
  if (!before || /^0+$/.test(before)) return null;
  try { return JSON.parse(execSync(`git show ${before}:${file}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })); }
  catch (e) { return null; }
}

// Wait (up to 10 minutes) until the live website serves the new file, so a tap never lands on an old page.
export async function waitForLive(file, isLive) {
  if (process.env.DRY) return;
  const site = String(process.env.SITE_URL || 'https://mathuraoverseas.com').replace(/\/+$/, '');
  for (let i = 0; i < 40; i++) {
    try { if (isLive(await (await fetch(site + '/' + file + '?v=' + Date.now(), { cache: 'no-store' })).text())) return; } catch (e) { /* try again */ }
    await new Promise((r) => setTimeout(r, 15000));
  }
  console.log('The website did not show the change within 10 minutes; sending anyway.');
}
