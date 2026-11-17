# Mathura Overseas — Android app (Play Store)

The app **is the website**. It opens mathuraoverseas.com full-screen with Chrome's engine, with no address bar
(Google calls this a *Trusted Web Activity*). So:

- **Every commit you push is in the app within minutes.** New country pages, university pages, NEET updates,
  fee changes — nothing to rebuild, nothing to send to Google.
- You only rebuild the app when you change something on the **"needs an app update"** list (section 6).

This file stays in your repository but is not published (it is listed under `exclude:` in `_config.yml`).

---

## 1. What this package adds (upload now, before 26 Nov)

| File | What it does |
|---|---|
| `manifest.json` | The app's name, icons, colours and long-press shortcuts (Countries, Planner, Updates, Guide) |
| `sw.js` | The offline helper. Keeps pages the student opened, shows them without internet, and shows the "You're offline" page otherwise. **You never edit it** (see the note inside) |
| `offline.html`, `css/pages/offline.css`, `js/pages/offline.js` | The "You're offline" page: Try again, Call us (works without data), and a list of saved pages |
| `js/pwa.js` | Switches the offline helper on, on every page. Also marks pages opened inside the app (see section 5) |
| `assets/images/app/` | App icons, the Play Store icon (`play-store-icon-512.png`) and the four shortcut icons |
| `assets/images/favicon.png`, `assets/images/apple-touch-icon.png` | The two small icon files your GO_LIVE_CHECKLIST asked for. **Skip these two if you already made your own** |
| `.well-known/assetlinks.json` | Proves the app and the website belong together. Has placeholders until 27 Nov (section 3) |
| `_includes/head.html` | One new line: `<link rel="manifest" …>` |
| `_includes/scripts.html` | One new line: `js/pwa.js` |
| `_config.yml` | New `include: - .well-known` block (Jekyll skips dot-folders without it) and this file added to `exclude:` |

**Upload tip:** GitHub's web uploader can hide folders whose names start with a dot. If `.well-known` doesn't
appear in your repo after uploading, use GitHub Desktop, or on github.com click **Add file → Create new file** and
type `.well-known/assetlinks.json` as the name, then paste the contents.

### Check it on your PC (jekyll serve)
1. Open `http://localhost:4000` in Chrome, press **F12**, open the **Application** tab.
2. **Manifest**: the name, colours and icons show, with no red errors.
3. **Service workers**: `sw.js` shows as *activated and is running*.
4. Click two or three pages. Then tick **Offline** (in the Service workers panel) and click a page you visited —
   it still opens. Type an address you never visited, e.g. `localhost:4000/test.html` — the "You're offline" page appears,
   listing what you visited. Untick **Offline** when done.

---

## 2. 26 Nov — after the domain is live

Confirm all three open in a browser:
- `https://mathuraoverseas.com/manifest.json`
- `https://mathuraoverseas.com/.well-known/assetlinks.json` (placeholders are fine for now)
- `https://mathuraoverseas.com/offline.html`

HTTPS must be on (GitHub → Settings → Pages → **Enforce HTTPS**). The app cannot be built without it.

---

## 3. 27 Nov — build the app on PWABuilder (about 15 minutes)

1. Go to **pwabuilder.com**, enter `https://mathuraoverseas.com`, click **Start**.
2. Choose **Package for stores → Android → Generate package**. Open **All settings** and set:

   | Setting | Value | Why |
   |---|---|---|
   | Package ID | `com.mathuraoverseas.app` | **Permanent forever.** Deliberately not "mbbs", so the same app carries Engineering later |
   | App name | `Mathura Overseas` | |
   | Launcher name | `Mathura` | The short name under the icon (fits on every phone) |
   | Host | `mathuraoverseas.com` | |
   | Start URL | `/index.html?source=app` | |
   | Signing key | **Create new** | |
   | Other settings | leave as filled in | they are read from manifest.json |

3. Download the zip. Inside are the app file (**.aab** — this is what goes to Google), a test **.apk**,
   a **signing key file** and a **signing-key-info** text file.
4. **Back up the signing key file and the info file in two places** (e.g. Google Drive + a USB stick). If you lose
   them, you can never update the app again.

### Fill in assetlinks.json
The zip also contains an `assetlinks.json`. Copy the long `AB:12:…` fingerprint from it and paste it over
`REPLACE_WITH_UPLOAD_KEY_SHA256_FROM_PWABUILDER` in **your** `.well-known/assetlinks.json`.
The second placeholder is filled in section 4, step 4. Commit.

---

## 4. Play Console — first upload

1. **Create app**: name *Mathura Overseas*, type **App**, **Free**, default language English (India).
2. **Store listing**: short description (80 characters), full description, the `play-store-icon-512.png`,
   a feature graphic (1024 × 500), and at least 2 phone screenshots. Take the screenshots inside the installed app.
3. **App content** (all required):
   - Privacy policy: `https://mathuraoverseas.com/privacy-policy.html`
   - Data safety: the app collects **name, phone number and city** (Apply / Planner / call-back forms, stored in your
     Google Sheet, for contacting the student), and **messages typed into Ask Mathura** (sent to the AI service to
     answer). No data is sold. Data is encrypted in transit (HTTPS). If you later add analytics or a Meta Pixel
     to the site, update this form.
   - Ads: **No**. Content rating questionnaire: education.
   - Target audience: choose honestly. Many NEET students are 17, so tick **13–17** as well as **18+**. Google then
     asks a few extra questions about younger users; answer them as they apply.
4. **Closed testing → Create track → upload the .aab.** When it's uploaded, open **App integrity** (under Test and
   release → Setup) and copy the **App signing key certificate SHA-256**. Paste it over the second placeholder in
   `.well-known/assetlinks.json`. Commit.
   *(Google re-signs your app with its own key. Without this second fingerprint, the Play Store version shows an
   address bar even though your test .apk didn't.)*
5. **Add 12 or more testers** (their Gmail addresses), send them the opt-in link, and ask them to install and
   **use** the app — open it most days, browse a few pages. Google checks real use, not just installs.
6. After **14 continuous days** with 12+ testers opted in, **Apply for production**. Google's answer usually
   takes a few days.

### Is the address bar gone?
Open the installed app. If you see a thin browser bar with the web address at the top, assetlinks.json doesn't
match yet: check both fingerprints, that the file opens at the address in section 2, and wait ~15 minutes after
committing (Android checks again the next time the app is installed).

---

## 5. Day-to-day: nothing changes

Add pages, posts and photos exactly as before. They reach the app automatically:

- New **country / university / update pages** need nothing extra. The offline helper doesn't list pages by name;
  any page a student opens is kept for offline reading (the newest 60).
- A changed **CSS or JS** file is live in the app on the next open. No version numbers to bump.
- A **replaced photo** with the same file name appears on the student's next visit.

**Only inside the app** — `js/pwa.js` adds the class `is-app` to the page. In CSS:

```css
.is-app .some-banner { display: none; }   /* hidden only inside the app */
```

---

## 6. Changes that DO need an app update

Only these are baked into the app when it is built:

- App name, launcher name, icons, splash colours
- The long-press shortcuts in `manifest.json`
- The Package ID (can never change)

To update: edit `manifest.json` / icons, push, then on PWABuilder **upload your existing signing key**
(never "Create new" again), raise the **App version** number by one, and upload the new .aab to Play Console.

---

## 7. Planned: Medicine + Engineering in the same app

Built for this already: the app is named *Mathura Overseas* (not "MBBS"), the Package ID is stream-neutral,
and the offline helper works for any page. When Engineering starts, keep these rules so nothing breaks:

1. **Keep every page in the main folder** (no sub-folders like `/engineering/`). The shared header, footer and
   CSS links are written as short addresses (`css/…`, `index.html`) that only work from the main folder.
2. **Name Engineering pages the same way as Medicine pages**, with a different first word:
   `engineering-in-{country}.html` and `engineering-in-{country}-{university}.html`
   (Medicine keeps `mbbs-in-…` — never rename those; they are your Google rankings).
3. **Data**: give Engineering its own `_data/engineering-countries.yml` and `_data/engineering-universities.yml`,
   copied from the Medicine files' layout. That keeps today's files, and every page built from them, untouched.
4. **App shortcuts**: the four shortcuts are Medicine pages. Swap one for Engineering when it launches — an app
   update (section 6).
