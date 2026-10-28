# Mathura Overseas — Shared parts with Jekyll

The header, footer, announcement bar, mobile tab bar, icons and shared scripts each live in **one file**.
GitHub Pages joins them into every page automatically when you push. Google receives complete HTML pages,
exactly as before, so SEO is unchanged.

---

## 1. Where to edit what

| I want to change… | Edit this one file |
|---|---|
| Announcement bar messages | `_includes/announcement.html` |
| Top menu / logo / "Get Free Counselling" button | `_includes/header.html` |
| Footer links, phone, email, social links | `_includes/footer.html` |
| Mobile bottom tab bar, floating WhatsApp button | `_includes/bottom-nav.html` |
| Add a new icon | `_includes/icons.html` (add one `<symbol>` line) |
| Add or remove a shared CSS file, fonts | `_includes/head.html` |
| Add a script that every page needs | `_includes/scripts.html` |
| One page's own content | That page's `.html` file, inside `<main>` |
| Colours, spacing, look | `css/…` files (unchanged) |

**Highlighted menu item:** every page starts with a small block like this:

```
---
active: about
---
```

That word decides which menu item is highlighted (teal). Use one of:
`home`, `countries`, `planner`, `updates`, `guide`, `about`, `privacy`.
All country and university pages use `active: countries`.

---

## 2. One-time setup on GitHub (required)

Do these once. After that, every push publishes automatically.

### Step 1 — Make sure Jekyll is not switched off
Open your repository on github.com and look at the file list in the main folder.
If you see a file called **`.nojekyll`**, delete it: click it, then the **⋯** menu, then **Delete file**, then **Commit changes**.
That file tells GitHub to skip Jekyll, which would leave `{% include … %}` showing as plain text on your pages.

### Step 2 — Upload the new files
1. Unzip the package on your computer.
2. In your repository, click **Add file**, then **Upload files**.
3. Drag **everything** inside the unzipped folder into the upload box: the `_includes` folder, `_config.yml`, `.gitignore`, `JEKYLL_SETUP.md`, `PAGE_TEMPLATE.html` and the 8 pages. Files with the same name replace the old ones.
4. Write a short message such as *Use shared Jekyll includes* and click **Commit changes**.

### Step 3 — Delete the old snippet file
Delete **`bottom-nav-snippet.html`** the same way as in Step 1. The tab bar now lives in `_includes/bottom-nav.html`, so this file is no longer needed.

### Step 4 — Check the publishing setting
1. Go to **Settings**, then **Pages** (left sidebar, under "Code, planning, and automation").
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. Set the branch to **main** and the folder to **/ (root)**, then click **Save**.

If Source was set to **GitHub Actions** with a "Static HTML" workflow, switch it as above. That workflow publishes files as they are, without running Jekyll.

### Step 5 — Watch it build
Open the **Actions** tab. A run named **pages build and deployment** appears. Wait for the green tick (usually 1–2 minutes).
- **Green:** open your site and press **Ctrl + F5** to skip the browser's cache.
- **Red:** click the run, then the failed step. The message names the file and line. The usual cause is a misspelt include name, e.g. `{% include heder.html %}`.

### Step 6 — Confirm it worked
On any page, right-click and choose **View page source**. You should see the full header and footer HTML and no `{% include` text anywhere.

---

## 3. Preview on your Windows computer (optional)

You can skip this and preview on the live site after each push. Installing Jekyll lets you see changes on your computer **before** they go live.

> Note: double-clicking an `.html` file no longer shows the header and footer, because Jekyll has to assemble the page first. Use `jekyll serve` (below) instead.

### Step 1 — Install Ruby (one time, ~10 minutes)
1. Go to **https://rubyinstaller.org/downloads/**
2. Under **WITH DEVKIT**, download **Ruby+Devkit 3.3.x (x64)**.
   I recommend this well-established version over the newest one, so every Jekyll part works without surprises.
3. Run the installer and accept the defaults. Keep **"Add Ruby executables to your PATH"** ticked.
4. On the last screen, keep **"Run 'ridk install'…"** ticked and click **Finish**.
5. A black window opens and asks which components to install. **Press Enter** to accept the default (1,3: the MSYS2 base and development toolchain). Wait until it finishes.
6. When it asks again, press **Enter** on the empty line to close it.

### Step 2 — Install Jekyll (one time)
1. Open a **new** Command Prompt: press the Windows key, type `cmd`, press Enter.
2. Type this and press Enter (it takes a few minutes):
   ```
   gem install jekyll bundler
   ```
3. Check that it worked:
   ```
   jekyll -v
   ```
   If you see something like `jekyll 4.x.x`, it's installed. If not, restart the computer and try `jekyll -v` again.

### Step 3 — Get the site onto your computer
The easiest way is **GitHub Desktop** (desktop.github.com). Sign in, choose **File → Clone repository**, pick your site, and note the folder it saves to.
Later you can commit and push from GitHub Desktop instead of uploading on the website.

### Step 4 — Preview
1. In Command Prompt, go to the site folder (use your own path):
   ```
   cd C:\Users\YourName\Documents\GitHub\your-repo-name
   ```
2. Start the preview:
   ```
   jekyll serve
   ```
3. Open **http://localhost:4000** in your browser.
4. Edit any file and save. Jekyll rebuilds in a second or two, so just refresh the browser.
5. To stop, click the Command Prompt window and press **Ctrl + C**.

### If something goes wrong
| Message | Fix |
|---|---|
| `cannot load such file -- webrick` | Run `gem install webrick`, then `jekyll serve` again |
| A note about `wdm` or "polling for changes" | Harmless; ignore it |
| Windows Firewall asks about Ruby | Click **Allow** (private networks) |
| `'jekyll' is not recognized` | Close Command Prompt, open a new one; if it still fails, restart the computer |
| You changed `_config.yml` | Stop with Ctrl + C and run `jekyll serve` again; this file is only read at start |

A folder called `_site` appears while previewing. It is the assembled website, made fresh each time. **Never upload it**; `.gitignore` already keeps it out of GitHub Desktop.

---

## 4. Making a new page (country pages and others)

1. Copy `PAGE_TEMPLATE.html` and rename it, e.g. `mbbs-in-mauritius.html`.
2. Set `active: countries` at the top. Use another word for non-country pages; see section 1.
3. Change the title, description and the two `og:` lines.
4. Put the page's content inside `<main>`.
5. Push. The header, footer, tab bar and icons appear automatically.

`PAGE_TEMPLATE.html` is listed in `_config.yml` so it is **not** published as a page on the live site.

---

## 5. Rules that keep Jekyll happy
- Keep the `---` block at the very top of every page. A page without it is published as-is, with no header or footer.
- Don't type `{{` or `{%` in page text. Jekyll treats them as instructions.
- Files and folders whose names start with `_` (like `_includes`) are never published. They are building blocks only.
