// Runs when assets/data/latest-updates.json changes. Finds the posts that are new in this push and
// sends ONE notification: the post itself, or "3 new NEET & counselling updates" if you added several.
// Editing an existing post (typo, extra point) sends nothing.
import { readFileSync } from 'node:fs';
import { sendPush, clip, previousJson, waitForLive } from './push-send.mjs';

const FILE = 'assets/data/latest-updates.json';
const now = JSON.parse(readFileSync(FILE, 'utf8'));
const old = previousJson(FILE);
if (!old) { console.log('No earlier version to compare with. Nothing sent.'); process.exit(0); }

const oldIds = new Set(old.map((p) => p.id));
const added = now.filter((p) => p.id && !oldIds.has(p.id));
if (!added.length) { console.log('No new posts (only edits). Nothing sent.'); process.exit(0); }
console.log('New posts: ' + added.map((p) => p.id).join(', '));

await waitForLive(FILE, (live) => added.every((p) => live.includes('"' + p.id + '"')));

const msg = added.length === 1
  ? { title: clip(added[0].title, 80), body: clip(added[0].summary || 'Tap to read the details.', 200),
      url: 'neet-2026-updates.html#u-' + added[0].id, topic: 'updates', ref: 'update:' + added[0].id }
  : { title: added.length + ' new NEET & counselling updates', body: clip(added.map((p) => p.title).join(' · '), 200),
      url: 'neet-2026-updates.html', topic: 'updates', ref: clip('updates:' + added.map((p) => p.id).join(','), 200) };
await sendPush(msg);
