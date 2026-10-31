# Kwame Driving School & Computer College: Website

Plain HTML/CSS/JS. No build step. Open `index.html` in a browser to view it.

## Pages
| File | What's on it |
|---|---|
| `index.html` | Full-screen photo slideshow, "two schools" expanding panels, driving + computer photo tiles, "why us" cards, 4-step journey, animated stats, gallery with lightbox, review carousel |
| `lessons.html` | Driving: tabbed lesson explorer (photo collage per lesson), flip cards for key skills |
| `computers.html` | Computer college: tabbed course explorer (Basics, Office, Internet, Design, Coding, Accounting), how classes work, computer packages, flip cards |
| `pricing.html` | Driving/Computer switch for package cards (`pricing.html#computer` opens computer), driving lesson estimator, add-on rates, FAQ |
| `contact.html` | 3-step booking wizard with photo choice cards, contact details, service-area map slot |

Shared styles: `css/styles.css` · Shared behavior: `js/main.js` · Photos: `images/`

## Interactive features (all in `js/main.js`)
- Scroll progress "road" bar with a car that drives across the top
- Header turns solid on scroll; full-screen animated mobile menu
- Hero slideshow (auto-advances every 6s, pauses when the tab is hidden)
- Scroll-reveal animations and counting-up stats
- Gallery lightbox (click, arrow keys, Esc)
- Swipeable review carousel
- Lesson explorer tabs (deep-linkable: `lessons.html#road-test`)
- Flip cards (hover on desktop, tap on phones)
- Pricing estimator that recommends a package and highlights its card
- Booking wizard that validates each step; `?package=starter` pre-selects a lesson.
  Computer choices start with `comp-` (e.g. `?package=comp-office`). For those, the
  driving-only questions (permit, pickup) are hidden. `&plan=Office%20Pro%20Package`
  pre-fills the message box with the chosen computer package.

## Shared header & footer
The header and footer are repeated in every page. If you change one (e.g. add a
nav link), make the same change in all six `.html` files.

Everything respects the visitor's "reduce motion" setting.

## Photos
The photos in `images/` are free stock photos from StockSnap (CC0, no attribution
required). They're stand-ins. Real photos of Kwame, the training car and (with
permission) happy students will convert much better. Especially replace:
- Review carousel images on `index.html`

To swap a photo, drop a new file into `images/` with the same name, or change the `src`.
Keep photos landscape, about 1600px wide, and under 300 KB.

## Replace the placeholders
Everything marked with `class="ph"` is placeholder content. To see it highlighted
while editing, add `class="show-placeholders"` to the `<body>` tag (remove it before going live).

Find & replace across all pages:
- `Your City`, `Neighborhood A/B`, `Town C`: real service area
- `Mon–Sat 8am–5pm`: real hours
- Prices on `pricing.html` (and the estimator's numbers in `js/main.js`, search `BASE`)
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
