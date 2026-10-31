# Kwame Driving School & Computer College: Website

Plain HTML/CSS/JS. No build step. Open `index.html` in a browser to view it.

## Pages
| File | What's on it |
|---|---|
| `index.html` | Full-screen photo slideshow, "two schools" expanding panels, driving + computer photo tiles, "why us" cards, 4-step journey, animated stats, photo gallery, review carousel |
| `lessons.html` | Driving: tabbed lesson explorer (photo collage per lesson), flip cards for key skills |
| `computers.html` | Computer college: tabbed course explorer (Basics, Office, Internet, Design, Coding, Accounting), how classes work, computer packages, flip cards |
| `pricing.html` | Driving/Computer switch for package cards (`pricing.html#computer` opens computer) |
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
- Prices on `pricing.html`
- Computer package names, contents and prices: on **both** `computers.html` and `pricing.html`
- Course durations, software names (Photoshop, CorelDRAW, QuickBooks…), class size, and certificate details on `computers.html`
- Stats (pass rate, students, years): the `data-count` values on `index.html`
- Reviews on `index.html`: use real reviews only

## PHP backend (booking form)
The booking form on `contact.html` posts in the background to a PHP + MySQL backend.
The visitor stays on the page and gets a booking reference (e.g. `KW-1A2B3C4D`).

```
api/csrf-token.php   GET  -> { success, token }   (the form fetches this on load)
api/booking.php      POST -> 201 { success, message, reference }
                             422 { success:false, message, errors:{field:"..."} }
                             403 bad CSRF/origin · 405 wrong method · 429 rate limited · 500 error
config/config.php    reads settings from .env
config/db.php        PDO connection to MySQL
includes/            bootstrap (error handling, CORS, headers) + helpers (CSRF, input cleaning)
schema.sql           creates the database and the bookings table
test_db.php          temporary local check of PHP + MySQL setup (delete before going live)
.env.example         copy to .env and fill in (.env is git-ignored)
```

`api/booking.php` checks every field again on the server: course, a start date within the
next year, morning/afternoon, name, phone, email, gender and ID number. It also checks the
CSRF token and the request origin, catches spam bots with a hidden honeypot field, and
limits each IP address to `RATE_LIMIT_PER_HOUR` requests. It saves the booking with
prepared statements and emails the school with PHP `mail()` if `MAIL_TO` is set.

### Setting it up on the host
Needs **PHP 8.1+** (with the `pdo_mysql` and `mbstring` extensions) and **MySQL 5.7+ / MariaDB 10.3+**,
on Apache. Most cPanel hosting has all of this.

1. Create a MySQL database and user in the hosting panel.
2. Delete the `CREATE DATABASE` and `USE` lines at the top of `schema.sql`, then import it
   (phpMyAdmin > select your database > Import).
3. Copy `.env.example` to `.env` and fill in the database details and `MAIL_FROM`
   (use an address on your own domain so the emails aren't marked as spam).
4. Upload the whole folder, including `.env` and the `.htaccess` files.
5. Check the protections: opening `https://your-domain/config/config.php` and
   `https://your-domain/.env` should both give "Not Found" or "Forbidden".
6. Send a test booking and confirm it appears in the `bookings` table and arrives by email.

The `.htaccess` files block web access to `config/`, `includes/`, `.env`, `schema.sql` and `test_db.php`.
On Nginx, add equivalent `deny all` rules for those paths. Don't upload `test_db.php` at all.

### Testing on your own computer (Windows)
You need PHP 8.1+ and MySQL. The simplest way is XAMPP (https://www.apachefriends.org),
which installs both. Its PHP is `C:\xampp\php\php.exe` and MySQL is `C:\xampp\mysql\bin\mysql.exe`
(add `C:\xampp\php` and `C:\xampp\mysql\bin` to PATH, or type the full paths).
Start **MySQL** from the XAMPP Control Panel, then in the project folder:

```powershell
# 1. Settings: copy the example, then edit .env (XAMPP: DB_USER=root, DB_PASS empty)
Copy-Item .env.example .env
#    For local testing also set:  MAIL_TO=   (empty: Windows can't send mail)
#                                 RATE_LIMIT_PER_HOUR=100

# 2. Create the database and table
mysql -u root -p -e "source schema.sql"

# 3. Check PHP + database (expect "All good")
php test_db.php

# 4. Start the PHP server
php -S 127.0.0.1:8000
```

Then open **http://127.0.0.1:8000/contact.html**. Not VS Code Live Server
(port 5501) and not by double-clicking the file: neither runs PHP, so the form will show its
error message. Use `127.0.0.1` rather than `localhost`: on Windows, `localhost` can point
at IPv6 and fail to connect.

If `php test_db.php` says `pdo_mysql` or `mbstring` is missing (plain PHP downloads, not
XAMPP): copy `php.ini-development` to `php.ini` next to `php.exe`, and remove the `;` in
front of `extension_dir = "ext"`, `extension=pdo_mysql` and `extension=mbstring`.

Note: `php -S` ignores `.htaccess`, so locally `.env` and `config/` can be opened in the
browser. That's fine on your own computer; on the real server the `.htaccess` rules apply.

Bookings hold ID numbers, which are personal data: keep database access limited to staff.

## Hosting
The site needs PHP hosting for the booking form (see above). Static-only hosts like
GitHub Pages, Netlify or Cloudflare Pages will show the pages, but the form won't work there.
