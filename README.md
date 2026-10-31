# Kwame Driving School & Computer College: Website

Plain HTML/CSS/JS. No build step. Open `index.html` in a browser to view it.

## Pages
| File | What's on it |
|---|---|
| `index.html` | Full-screen photo slideshow, "two schools" expanding panels, driving + computer photo tiles, "why us" cards, 4-step journey, animated stats, photo gallery, review carousel |
| `lessons.html` | Driving: tabbed lesson explorer (photo collage per lesson), flip cards for key skills |
| `computers.html` | Computer college: tabbed course explorer (Basics, Office, Internet, Design, Coding, Accounting), how classes work, computer packages, flip cards |
| `pricing.html` | Driving/Computer switch for package cards (`pricing.html#computer` opens computer), FAQ |
| `contact.html` | 3-step booking wizard with photo choice cards, contact details, service-area map |
| `404.html` | Shown by the host for broken links |

Shared styles: `css/styles.css` · Shared behavior: `js/main.js` · Photos: `images/`

## Interactive features (all in `js/main.js`)
- Scroll progress "road" bar with a car that drives across the top
- Header turns solid on scroll; full-screen animated mobile menu
- Hero slideshow (auto-advances every 6s, pauses when the tab is hidden)
- Scroll-reveal animations and counting-up stats
- Swipeable review carousel
- Lesson explorer tabs (deep-linkable: `lessons.html#road-test`)
- Flip cards (hover on desktop, tap on phones)
- Booking wizard that validates each step; `?package=starter` pre-selects a lesson.
  Computer choices start with `comp-` (e.g. `?package=comp-office`). For those, the
  driving-only questions (permit, pickup) are hidden. `&plan=Office%20Pro%20Package`
  pre-fills the message box with the chosen computer package.

## Shared header & footer
The header and footer are repeated in every page. If you change one (e.g. add a
nav link), make the same change in all six `.html` files (including `404.html`).

Everything respects the visitor's "reduce motion" setting.

## Photos
Most photos in `images/` are Kwame's own. The rest are free stock photos from
StockSnap (CC0, no attribution required); the review carousel images on `index.html`
are still stock.

To swap a photo, drop a new file into `images/` with the same name, or change the `src`.
Resize phone photos before adding them: about 1920px on the long edge and under
500 KB. Full-size phone photos (10–17 MB each) make the site very slow on mobile data.

## Replace the placeholders
Everything marked with `class="ph"` is placeholder content. To see it highlighted
while editing, add `class="show-placeholders"` to the `<body>` tag (remove it before going live).

Find & replace across all pages:
- `Mon–Sat 8am–5pm`: real hours
- `24 hours'` cancellation notice on `pricing.html`
- Prices on `pricing.html`
- Computer package names, contents and prices: on **both** `computers.html` and `pricing.html`
- Course durations, software names (Photoshop, CorelDRAW, QuickBooks…), class size, and certificate details on `computers.html`
- Stats (pass rate, students, years): the `data-count` values on `index.html`
- Reviews on `index.html`: use real reviews only

## Make the booking form send emails
1. Create a free form at https://formspree.io and copy its ID (e.g. `xyzabcd`).
2. In `contact.html`, replace `YOUR_FORM_ID` in the form `action`.

Until then, submitting the form opens the visitor's email app with the request filled in.

## Hosting
Any static host works: Netlify (drag-and-drop the folder), GitHub Pages, or Cloudflare Pages.
