# Mathura Overseas — Content Plan (no repeated content)

**Rule 1 — every fact has ONE home.** Other pages only *tease* it with one short line and a link.
**Rule 2 — Home is a front door, not a brochure.** Each home section teases exactly one page.
**Rule 3 — shared numbers live in one file.** NEET cutoffs, cost ranges and compare data live only in `js/tools.js`; the latest news line only in `assets/data/latest-updates.json`.

## Home page — what each section does (and where the full content lives)
| Home section | Purpose (one idea only) | Full content lives on |
|---|---|---|
| Hero + tool | Promise + instant eligibility / cost / compare | Find University page (long versions) |
| Highlight strip | The four proof points (recognition, zero fees, 200+ students, 10+ years) — numbers live ONLY here | About |
| Find your path | Pointers to the Guide, Updates and "How we work" | Guide, Updates, About |
| Top destinations | Four cards: photo, one line, fee | Countries page + each country page |
| Trust banner | The *service* promise: one counsellor, after-admission support, vetting (no numbers) | About |
| Journey | The 6-step process, one line each | Guide (admission timeline chapter) |
| Student story | One real quote | About (all stories) |
| Closing CTA | Talk to a counsellor | Apply |

Removed from Home because they repeated something else: the hero tick list and the banner's number boxes (the highlight strip now carries those facts once), the news list (the Updates card now shows the live latest item), the extra "Explore destinations" button after the journey.

## Other pages — what goes where
**Countries (`destinations.html`)** — all destinations as cards with sort chips; the flight map (Chennai → each country: flight time, capital, exchange rate, language, climate); compare tray. *Travel details live only here.*
**Country page (`mbbs-in-<country>.html`)** — why this country, at-a-glance table, fee table, universities list (photo cards), eligibility note, FAQ, CTA. *Fees live only here and in `tools.js`.*
**University page** — about, fee structure, recognition (NMC/WHO/ECFMG), hostel & food, campus photos, quick facts, map, apply CTA.
**Find University** — full eligibility checker, cost calculator, compare universities (tabs). *The long form of the home tool.*
**Updates** — filterable news feed (UG / PG), dated posts, expandable tables. Home shows only the newest line.
**Student Guide** — the 10-chapter handbook hub + PDF download. *The process, regulations and timelines live here.*
**About** — story, 6 differentiators, company timeline, "what we look for in a university", all student stories.
**Apply** — one short form (name, phone, NEET score, preferred country); same shared header/footer.
**Privacy / thank-you pages** — plain text pages in the shared template.

## Shared on every page (identical, never edited per page)
Announcement bar · header + menu · bottom tab bar · footer · icon block · scripts. Start every new page from `PAGE_TEMPLATE.html`.

## Checklist before publishing a page
- [ ] Does any sentence already exist on another page? Replace it with a link.
- [ ] Is the page's one job clear in the first screen?
- [ ] Every image slot has a file name + size in `IMAGE_BRIEF.md`.
- [ ] No counts of destinations or universities anywhere.
