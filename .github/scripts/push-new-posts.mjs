// Runs when a file in _posts/ changes. Finds the blog posts ADDED in this push and sends ONE notification:
//   · one new post   → its title, its description, its cover photo, opens the post
//   · several posts  → "2 new articles on the blog", the newest post's photo, opens blog.html
// Editing an existing post (typo, new paragraph) sends nothing. A post with  push: false  in its top block is skipped.
// A post dated in the future is not on the website yet (GitHub Pages hides it), so it is skipped too.
// Test without sending:  DRY=1 BEFORE=<old commit> node .github/scripts/push-new-posts.mjs
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { sendPush, clip, waitForLive } from './push-send.mjs';

const before = process.env.BEFORE || '';
if (!before || /^0+$/.test(before)) { console.log('No earlier version to compare with. Nothing sent.'); process.exit(0); }

let added;
try {
  added = execSync(`git diff --name-only --diff-filter=A ${before} HEAD -- _posts`, { encoding: 'utf8' })
    .split('\n').map((s) => s.trim()).filter((f) => /\.(md|markdown|html)$/i.test(f));
} catch (e) { console.log('Could not compare with the earlier version. Nothing sent.'); process.exit(0); }
if (!added.length) { console.log('No new posts (only edits). Nothing sent.'); process.exit(0); }

// Read the simple "key: value" lines of a post's top block (between the two --- lines).
function frontMatter(text) {
  const m = text.match(/^---\s*\n([\s\S]*?)\n---/);
  const out = {};
  if (!m) return out;
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].replace(/\s+#.*$/, '').trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[kv[1]] = v;
  }
  return out;
}

const today = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);   // India date
const posts = [];
for (const file of added) {
  const name = file.split('/').pop();
  const m = name.match(/^(\d{4}-\d{2}-\d{2})-(.+)\.(md|markdown|html)$/i);
  if (!m) { console.log('::warning::' + name + ' is not named YYYY-MM-DD-title.md, so the website ignores it. No alert.'); continue; }
  const fm = frontMatter(readFileSync(file, 'utf8'));
  if (String(fm.push).toLowerCase() === 'false') { console.log(name + ': push: false — no alert.'); continue; }
  if (String(fm.published).toLowerCase() === 'false') { console.log(name + ': published: false — no alert.'); continue; }
  const date = (fm.date || m[1]).slice(0, 10);
  if (date > today) { console.log('::warning::' + name + ' is dated ' + date + ', so it is not on the website yet. No alert. Use today\'s date in the file name (BLOG_GUIDE.md, "Dates").'); continue; }
  if (!fm.title) { console.log('::warning::' + name + ' has no title: line. No alert.'); continue; }
  const page = (fm.permalink || m[2] + '.html').replace(/^\/+/, '');
  posts.push({ name, page, date, title: fm.title, text: fm.push_text || fm.description || '', pushTitle: fm.push_title || fm.title, image: (fm.image || '').replace(/^\/+/, '') });
}
if (!posts.length) { console.log('Nothing to announce.'); process.exit(0); }
posts.sort((a, b) => (a.date < b.date ? 1 : -1));   // newest first
console.log('New posts: ' + posts.map((p) => p.page).join(', '));

// Wait until every new post is live, so a tap never lands on "page not found".
for (const p of posts) {
  await waitForLive(p.page, (html) => html.includes('mathuraoverseas.com/' + p.page + '"'));
}

const first = posts[0];
const msg = posts.length === 1
  ? { title: clip(first.pushTitle, 80), body: clip(first.text || 'New on the Mathura Overseas blog. Tap to read.', 200),
      url: first.page, image: first.image, topic: 'news', ref: clip('blog:' + first.page, 200) }
  : { title: posts.length + ' new articles on the blog', body: clip(posts.map((p) => p.title).join(' · '), 200),
      url: 'blog.html', image: first.image, topic: 'news', ref: clip('blog:' + posts.map((p) => p.page).join(','), 200) };
if (!msg.image) delete msg.image;
await sendPush(msg);
