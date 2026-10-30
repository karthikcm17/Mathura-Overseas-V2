# Mathura Overseas — Go-live checklist

This file stays in your repository but is NOT published (it is listed under `exclude:` in `_config.yml`).
Tick these off before pointing mathuraoverseas.com at the new site.

## A. Upload this package
Copy every file in this folder into your site folder, keeping the same sub-folders. Files with the same name replace the old ones.

| File | What changed |
|---|---|
| `_includes/header.html` | New mobile menu drawer (icon tiles, counselling card, Call / WhatsApp / Email, socials) |
| `_includes/footer.html` | Countries list now builds itself from `_data/countries.yml` (adds Nepal, Bangladesh, Caribbean); new Explore links; year updates itself |
| `_includes/head.html` | Social-sharing and favicon lines; `noindex` support |
| `_includes/icons.html` | Newest icon set (includes alert, stethoscope, utensils) |
| `css/navigation.css`, `css/responsive.css`, `css/footer.css` | Menu drawer and footer styling |
| `js/navigation.js` | Menu: keyboard focus, Esc, swipe right to close |
| `index.html`, `css/pages/home.css`, `js/pages/home.js` | Home page improvements |
| `js/tools.js` | Nepal and Bangladesh now link to their pages |
| `_config.yml` | Site address added; extra files kept off the live site |
| `404.html`, `css/pages/404.css` | New "page not found" page |
| `sitemap.xml`, `robots.txt` | For Google |
| `assets/images/favicon.svg` | Browser-tab icon made from the logo |

## B. Must do before launch
1. **Lead sheet link.** Open `js/tools.js`, find `LEAD_ENDPOINT = ''` and paste your Google Apps Script Web app link (it must end in `/exec`). Until then every form (Apply, Planner, the new home "Call me back") opens WhatsApp instead of saving to the sheet.
2. **Delete `mbbs-in-central-america.html`.** It is replaced by `mbbs-in-caribbean.html` and is already hidden from the live site.
3. **Social preview images.** On every page except `index.html`, the `og:image` line uses a short address that Facebook/WhatsApp cannot read. In VS Code: *Edit → Replace in Files*
   - Find: `property="og:image" content="assets/`
   - Replace: `property="og:image" content="https://mathuraoverseas.com/assets/`
4. **Two small icon files** in `assets/images/`: `favicon.png` (32 × 32 px) and `apple-touch-icon.png` (180 × 180 px). Export both from `favicon.svg`.
5. **Photos.** Every grey "IMAGE" box shows the exact file name and size it needs.

## C. After the site is live
1. GitHub → Settings → Pages: set the custom domain to `mathuraoverseas.com` and tick **Enforce HTTPS**.
2. Open `https://mathuraoverseas.com/sitemap.xml` — you should see every page listed.
3. Google Search Console: add the site and submit `sitemap.xml`.
4. Open a wrong address (e.g. `/test-page.html`) — the new 404 page should appear.
5. Desktop home page: ask the AI chat bubble a question. If it says the assistant is not available, the Cloudflare worker isn't deployed yet; visitors are shown a WhatsApp link instead, so nothing breaks.
