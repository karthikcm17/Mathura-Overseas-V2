# Ask Mathura — switching on the free AI

This file stays in your repository but is **not** published on the website (it is listed under `exclude:` in `_config.yml`).

Ask Mathura answers every question with **Cloudflare's free AI (Workers AI)**. No API key, no card, no bill. Setting it up takes about 10 minutes, once.

Until the steps below are done, the chat still opens, and every question gets a one-line reply with a WhatsApp link (the question already typed in), so nothing is lost.

---

## How it works (in one paragraph)

A small program called a **Cloudflare Worker** sits between your website and the AI. When a visitor asks a question, the website sends it to the Worker. The Worker reads your whole website (every page in `sitemap.xml`, the country and university data, and the eligibility rules in `js/tools.js`), picks the parts that match the question, and asks the AI to answer **only** from them. The AI is told never to guess fees, cutoffs or rules, and to send the visitor to a counsellor when the website doesn't say. When you update a page, the Worker picks it up within 6 hours. You never retrain anything.

## What "free" means here

| | |
|---|---|
| Daily allowance | 10,000 "Neurons" a day on Cloudflare's free plan, reset at 00:00 UTC (5:30 am India) |
| One answer | about 200 Neurons, so **roughly 50 answers a day** |
| If the day's allowance runs out | nothing is charged; the AI pauses until the reset and visitors get the WhatsApp link instead |
| AI model | Llama 3.3 70B (Meta), the strongest well-documented model on the free plan; a smaller Llama model steps in if it is busy |

You can see how much was used each day in Cloudflare: **AI → Workers AI**.

---

## Step 1 — Create the Worker (free Cloudflare account)

1. Go to **https://dash.cloudflare.com** and sign up / sign in. The free plan is enough; you don't need to add a card.
2. Left menu: **Workers & Pages → Create → Create Worker** (the "Hello World" starter).
3. Name it `ask-mathura` and click **Deploy**.
4. Click **Edit code**. Delete everything in the editor, open `worker/ask-mathura-worker.js` from this package, copy **all** of it, paste it in, and click **Deploy**.

## Step 2 — Connect the free AI

1. Go back to the Worker → **Settings → Bindings → Add binding → Workers AI**.
2. **Variable name:** type exactly `AI` (capital letters). Click **Add binding** / **Deploy**.

## Step 3 — Only if the site isn't on mathuraoverseas.com yet

Worker → **Settings → Variables and Secrets → Add** (type **Text**):

| Name | Value |
|---|---|
| `SITE_URL` | where the site is live now, e.g. `https://karthikcm17.github.io/your-repo` (no slash at the end) |
| `ALLOWED_ORIGINS` | the website addresses allowed to use the Worker, comma-separated, e.g. `https://mathuraoverseas.com,https://www.mathuraoverseas.com,https://karthikcm17.github.io` |

Click **Deploy** after adding them. Once the site moves to mathuraoverseas.com you can delete both; the defaults already point there.

## Step 4 — Check the Worker

Copy the Worker's address shown at the top (e.g. `https://ask-mathura.yourname.workers.dev`) and open it in your browser. You should see:
```
Ask Mathura worker: working
Website: https://mathuraoverseas.com
Pages read: 25
Text sections: …
Free AI connected: yes
Model: @cf/meta/llama-3.3-70b-instruct-fp8-fast
```
- "Pages read: 0" → `SITE_URL` points at an address where the site isn't live yet.
- "Free AI connected: NO" → the binding in Step 2 is missing or not named `AI`.

## Step 5 — Connect the website

Open `js/tools.js`, find this line and paste the Worker address between the quotes:
```js
var ASSISTANT_URL = 'https://ask-mathura.yourname.workers.dev';
```
Commit and push. Done.

## Step 6 — Test

On the live site, open Ask Mathura and try:
- `What does MBBS in Russia cost?` → the yearly all-in figure and a link to the Russia page.
- `Is the pre-medical course in the Philippines counted by NMC for the 54-month rule?` → an answer that uses the Philippines page.
- `What is the capital of France?` → it should politely decline (not about MBBS abroad).

To preview locally with `jekyll serve`, `http://localhost:4000` is already allowed.

---

## Everyday questions

| I want to… | Do this |
|---|---|
| Change the three suggested questions | `_includes/assistant.html` |
| Change the AI's rules (tone, what it may say) | `worker/ask-mathura-worker.js` → the `systemPrompt` section, then paste the file into Cloudflare again and Deploy |
| Get more answers per day | Worker → Settings → Variables → add `MODEL` = `@cf/meta/llama-3.1-8b-instruct-fp8` (over twice as many answers, around 120 a day, but simpler wording). Delete it to go back |
| Turn the AI off quickly | empty `ASSISTANT_URL` in `js/tools.js` (every question then gets the WhatsApp link) |
| Hide Ask Mathura on one page | add `assistant: false` to that page's top block |
| Open it from any link or button | add `data-ask-open` to it, or `data-ask-open="Your question"` to ask that question straight away |

**What it does NOT read:** the handbook PDF, and text that only appears after JavaScript runs. (The MBBS Planner's numbers come from `js/tools.js`, which the Worker reads directly, so those are covered.)

**Safety built in:** only your websites can call the Worker · a question is at most 400 characters · each visitor can ask about 15 questions per 10 minutes · answers are kept short · links in AI answers are shown only if they point to your own pages, WhatsApp or your phone number.
