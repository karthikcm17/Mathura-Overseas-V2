// Runs when assets/data/counselling-tracker.json changes. Compares it with the version before this push and
// sends ONE notification about what changed: a round's dates announced (a null date filled in), a new round
// added, or dates moved. Changing only "asOf", names or notes sends nothing.
import { readFileSync } from 'node:fs';
import { sendPush, clip, previousJson, waitForLive } from './push-send.mjs';

const FILE = 'assets/data/counselling-tracker.json';
const now = JSON.parse(readFileSync(FILE, 'utf8'));
const old = previousJson(FILE);
if (!old) { console.log('No earlier version to compare with. Nothing sent.'); process.exit(0); }

const short = (s) => String(s).replace(/\s+\d{4}$/, '');                 // "12 Dec 2026" → "12 Dec"
const span = (start, end) => start && end ? short(start) + ' – ' + short(end) : start ? 'from ' + short(start) : 'reporting till ' + short(end);
const oldSteps = new Map();
for (const t of old.tracks || []) for (const [round, start, end] of t.steps || []) oldSteps.set(t.name + '|' + round, [start, end]);

const changes = [];
for (const t of now.tracks || []) {
  for (const [round, start, end] of t.steps || []) {
    if (!start && !end) continue;                                          // still awaited: nothing to say
    const label = t.name + ' · ' + round;
    const prev = oldSteps.get(t.name + '|' + round);
    if (!prev || (!prev[0] && !prev[1])) changes.push({ label, kind: 'announced', text: span(start, end) });
    else if (prev[0] !== start || prev[1] !== end) changes.push({ label, kind: 'changed', text: 'now ' + span(start, end) });
  }
}
if (!changes.length) { console.log('No round dates announced or changed. Nothing sent.'); process.exit(0); }
console.log('Changes: ' + changes.map((c) => c.label + ' (' + c.kind + ')').join(', '));

await waitForLive(FILE, (live) => { try { return JSON.stringify(JSON.parse(live).tracks) === JSON.stringify(now.tracks); } catch (e) { return false; } });

const one = changes[0];
const msg = changes.length === 1
  ? { title: clip(one.label + (one.kind === 'announced' ? ': dates announced' : ': dates changed'), 80),
      body: clip(one.text.charAt(0).toUpperCase() + one.text.slice(1) + ' (start to last date of reporting). Tap for the full schedule.', 200) }
  : { title: 'Counselling dates updated', body: clip(changes.map((c) => c.label).join(', ') + '. Tap for the full schedule.', 200) };
await sendPush({ ...msg, url: 'neet-2026-updates.html', topic: 'deadlines', ref: clip('tracker:' + (process.env.GITHUB_SHA || Date.now()), 200) });
