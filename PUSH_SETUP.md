# Mathura Overseas — push alerts (our own system)

Alerts go out **only when you publish something** — nothing is sent on a timer.
Alerts reach students on Android phones (in the app and in Chrome) and on computers (Chrome, Edge, Firefox).
iPhones get them only if the student added the site to the Home Screen; plain Safari never shows a prompt.

**Running cost: ₹0.** Everything runs on Cloudflare's free plan (like Ask Mathura) and GitHub. No third-party
alert company, so nobody can change the terms on us. This file stays in the repository but is not published.

| What | How it's sent |
|---|---|
| **New NEET / counselling update** | Automatic: add a post to `assets/data/latest-updates.json` and push. Students get the post's title and summary; tapping opens that exact post |
| **Counselling dates** | Automatic when you push `assets/data/counselling-tracker.json` with a round's dates **newly filled in**, a **new round**, or **changed dates**. E.g. "Tamil Nadu PG · Mop-up: dates announced — 03 Dec – 08 Dec" |
| **Your announcement** | You type it on your private send page (`/admin`, step 7), with a live preview |

Until step 6 is done, nothing changes on the website: no prompts, no bell, nothing sent.

---

## Step 1 — Upload the files and push
Copy the package into your site folder (same sub-folders) and push. Safe at any time: alerts stay off.

## Step 2 — Create the database (Cloudflare, 1 minute)
1. **dash.cloudflare.com** → left menu **Storage & databases → D1** → **Create database**.
2. Name: `mathura-push` → **Create**. You never need to open it; the worker builds its own tables.

## Step 3 — Create the push worker
1. **Workers & Pages → Create → Create Worker**, name it `mathura-push`, **Deploy**.
2. **Edit code**: delete everything, paste **all** of `worker/mathura-push-worker.js`, **Deploy**.
3. Worker → **Settings → Bindings → Add → D1 database**. Variable name: `DB` (capitals). Database: `mathura-push`. **Deploy**.

## Step 4 — Make your keys (one click)
1. Open `https://mathura-push.<your-name>.workers.dev/setup` (your worker's address + `/setup`).
2. Click **Make my keys**. Three values appear.
3. Worker → **Settings → Variables and Secrets → Add**, type **Secret**, once for each, names exactly as shown:
   `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `ADMIN_KEY`. Then **Deploy**.
4. **Save all three in your password manager.** Cloudflare never shows a secret again after saving.

> Make keys **once**. New keys later would silently disconnect every phone that already allowed alerts.

## Step 5 — Check the worker
Open the worker's address. You should see:
```
Mathura push worker: working
Database: connected
Keys: set
Admin password: set
```

## Step 6 — Switch alerts on
1. Open `js/push-config.js` and paste the worker address between the quotes:
   `self.MO_PUSH_API = 'https://mathura-push.your-name.workers.dev';`
2. On GitHub: repository → **Settings → Secrets and variables → Actions → New repository secret**, twice:

   | Name | Value |
   |---|---|
   | `PUSH_API` | the worker address (same as above) |
   | `PUSH_ADMIN_KEY` | your `ADMIN_KEY` |
3. Commit and push.

## Step 7 — Test on your own phone
1. Android phone, Chrome: open **mathuraoverseas.com/neet-2026-updates.html** → tap **Get alerts for new updates** → **Allow**.
2. On your computer open `https://mathura-push.your-name.workers.dev/admin`, enter your `ADMIN_KEY`.
   **Bookmark this page** — it's your send page. It shows how many people are subscribed (app / website).
3. Write a test, press **Send now**. Your phone shows it within seconds; tapping it opens the page you chose.
4. Automatic alerts: add a test post to `latest-updates.json` (or fill in a round's dates in the tracker) and push. GitHub → **Actions → Push alerts** shows what was sent.

## Step 8 — The Android app
On PWABuilder (`ANDROID_APP_SETUP.md`, section 3), under **All settings**, turn on **Notification delegation** (it may be labelled "Notifications").
The app then asks with Android's own "Allow notifications?" dialog, and alerts show with the app's name and icon.
The first time the app opens, students see the welcome screen with **Turn on alerts**.

---

## Everyday use
- **Write update titles as you'd want them on a lock screen.** The title becomes the alert's title; the summary its text.
  Adding several posts in one push sends **one** alert ("3 new NEET & counselling updates"), never a flood.
- The alert waits until the live website shows the new post (usually 1–2 minutes), so a tap never lands on an old page.
- **Tracker alerts**: filling in a `null` date, adding a round or moving dates sends one alert. Changing only `asOf` or notes sends nothing.
  Changing several rounds in one push sends **one** alert ("Counselling dates updated").
- Fixing a typo in an existing post sends nothing. Re-running an automation never sends the same alert twice.
- If you change a post **and** the tracker in the same push, students get two alerts (one each). Push them separately if you'd rather send one.
- Want to preview an automatic alert without sending? It's already safe: every send is listed on `/admin` → *Recently sent*.

## Free-plan limits (plenty for us)
| | Free allowance | What we use |
|---|---|---|
| Worker requests | 100,000 a day | about 1 per subscriber per alert. 5,000 subscribers × 3 alerts = ~15,000 |
| Outside calls per run | 50 | we send in batches of 45; the send page and automations loop for you |
| GitHub Actions | free for public repositories | ~1–3 minutes per update you push |

## If something looks wrong
| You see | Fix |
|---|---|
| No bell on the updates page | `js/push-config.js` is empty, or you're on an iPhone in Safari (not supported there) |
| `/admin` says *wrong password* | Paste `ADMIN_KEY` again; check it was added as a **Secret** on the worker and deployed |
| Send page error *VAPID_PRIVATE_KEY is not a valid key* | Paste that secret again from your password manager, **Deploy** |
| Automations say *not set up yet* | Add the two GitHub secrets in step 6 |
| Bell says *Alerts are blocked in your phone settings* | The student tapped Block. Phone **Settings → Apps → Chrome (or Mathura Overseas) → Notifications** |
