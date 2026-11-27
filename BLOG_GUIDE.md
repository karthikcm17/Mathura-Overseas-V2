# Blog — how to publish a post

Not published on the website (listed under `exclude` in `_config.yml`).

## What happens when you publish

You add one Markdown file to `_posts/` and push. Then, with no other work:

1. GitHub Pages builds the post with the shared design (`_layouts/post.html`).
2. It appears at the top of **blog.html** and under "Keep reading" on other posts.
3. It is added to **sitemap.xml**, so Google finds it and **Ask Mathura** learns from it.
4. The **Push alerts** GitHub Action waits until the post is live, then sends **one notification**:
   the post's title, its description and its cover photo. A tap opens the post.

Editing a post later (typo, new paragraph) never sends another alert.

## Step by step

1. **Copy** `_drafts/post-template.md` into `_posts/`.
2. **Rename** it `YYYY-MM-DD-keywords.md`, with **today's date**:
   `2026-12-02-mbbs-in-georgia-fees.md` → `mathuraoverseas.com/mbbs-in-georgia-fees.html`
   - Use lowercase words and hyphens: the words a student would search for.
   - The name must not match an existing page (e.g. never `mbbs-in-georgia.md`).
3. **Fill in the top block:** `title`, `description`, `category`, `image`, `image_alt`, and optional `faqs`.
4. **Add the cover photo:** `assets/images/blog/<same-name-as-post>.jpg`
   - **1200 × 630 px, JPG, under 200 KB.** The same picture is used for the page, the WhatsApp/Facebook
     link preview and the push alert (Android crops it to about 2:1, so keep the subject in the middle).
   - Landmarks or scenery, never people (same rule as country photos).
5. **Write the article** under the second `---` in Markdown (see below).
6. **Preview:** `jekyll serve`, then open `http://localhost:4000/blog.html`.
7. **Commit and push** to `master`. The alert goes out a few minutes later. Check it on `/admin` → "Recently sent".

## Categories

Pick ONE per post and type it exactly the same way each time, because the filter buttons on blog.html are made from them:
`Country guides` · `Fees & budget` · `NEET & admissions` · `NMC rules` · `Student life`
A new spelling creates a new button.

## Writing in Markdown

| You type | You get |
|---|---|
| `## Heading` | A section heading (also listed in "In this article" once there are 3) |
| `### Smaller heading` | A sub-heading |
| `**bold**` | **bold** |
| `[MBBS in Georgia](mbbs-in-georgia.html)` | A link to our own page (no `/` at the start) |
| `- item` | A bullet list |
| `1. item` | A numbered list |
| `![Short description](assets/images/blog/photo.jpg)` | A photo inside the article |

Tables: one line per row, `|` between columns, and a `|---|---|` line under the header row.

Highlighted boxes: write a quote, then put the class on the next line:

```
> **Counsellor's tip:** shown in a blue box.
{: .note}

> **Check first:** shown with an orange edge.
{: .warn}
```

## Optional lines in the top block

- `updated: 2027-01-10` — when you revise facts. Shows "Last reviewed on…" and tells Google.
- `push: false` — publish **without** a notification.
- `push_title:` / `push_text:` — a shorter title or message just for the notification.
- `seo_title:` — a shorter title for the browser tab and Google, if the headline is long.

## Dates

Always use **today's date** in the file name. GitHub Pages hides posts dated in the future, and the alert
for such a post is skipped (the Action log shows a warning). To change the date of a published post,
don't rename the file: add `updated:` instead, because renaming changes the address.

## Content rules (same as the rest of the site)

- Every fact has a source. Anything that changes yearly gets "as of Month Year".
- Never state the number of countries or colleges.
- Fees: "from ₹X" or averages only. The full fee sheet stays on WhatsApp.
- Link to the matching country/university page and to `apply.html` where it helps.

## How the alert works (for later debugging)

- Workflow: `.github/workflows/push-alerts.yml` (path `_posts/**`). Script: `.github/scripts/push-new-posts.mjs`.
- Only files **added** in the push count. Two or more new posts in one push → one alert:
  "2 new articles on the blog", opening blog.html with the newest post's photo.
- Alerts go out under the **Announcement** type (`news`), which every subscriber receives.
- Test without sending: `DRY=1 BEFORE=<old commit id> node .github/scripts/push-new-posts.mjs`
