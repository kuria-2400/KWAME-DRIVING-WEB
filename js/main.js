// Kwame Driving School — shared site behavior.
// Each feature checks for its own markup, so one script serves every page.

(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Header, mobile menu, active link ---------- */
  const header = $(".site-header");
  const toggle = $(".nav-toggle");
  const links = $(".nav-links");
  if (toggle && links) {
    const setOpen = (open) => {
      links.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
      document.body.classList.toggle("no-scroll", open);
      header.classList.toggle("menu-open", open);
    };
    toggle.addEventListener("click", () => setOpen(!links.classList.contains("open")));
    $$("a", links).forEach((a) => a.addEventListener("click", () => setOpen(false)));
    document.addEventListener("keydown", (e) => e.key === "Escape" && setOpen(false));
    // Keyboard users tabbing into the header should always see it
    header.addEventListener("focusin", () => header.classList.remove("nav-hidden"));
  }

  const page = location.pathname.split("/").pop() || "index.html";
  $$(".nav-links a:not(.btn)").forEach((a) => {
    if (a.getAttribute("href") === page) a.classList.add("active");
  });

  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

  /* ---------- Scroll-driven UI (one rAF-throttled listener) ---------- */
  const bar = $(".road-progress .bar");
  const car = $(".road-progress .car");
  const toTop = $(".to-top");
  const mobileCta = $(".mobile-cta");
  const parallax = $$("[data-parallax]");
  let ticking = false;
  let lastY = window.scrollY;

  function onScroll() {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? (y / max) * 100 : 0;
    if (bar) bar.style.width = pct + "%";
    if (car) car.style.left = pct + "%";
    if (header) {
      header.classList.toggle("scrolled", y > 40);
      // Hide the bar while scrolling down, bring it back on any scroll up (never while the mobile menu is open)
      if (y < 120 || header.classList.contains("menu-open")) header.classList.remove("nav-hidden");
      else if (y > lastY + 4) header.classList.add("nav-hidden");
      else if (y < lastY - 4) header.classList.remove("nav-hidden");
    }
    if (Math.abs(y - lastY) > 4) lastY = y;
    if (toTop) toTop.classList.toggle("show", y > 700);
    if (mobileCta) mobileCta.classList.toggle("show", y > 500);
    if (!reduceMotion) {
      parallax.forEach((img) => {
        const rect = img.parentElement.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) return;
        const speed = parseFloat(img.dataset.parallax) || 0.2;
        // Page-top banners drift with scroll distance; mid-page bands drift
        // around the viewport center so the overscan covers both edges.
        const atTop = img.parentElement.offsetTop < window.innerHeight / 2;
        const offset = atTop ? rect.top : rect.top + rect.height / 2 - window.innerHeight / 2;
        img.style.transform = `translate3d(0, ${offset * -speed}px, 0)`;
      });
    }
    ticking = false;
  }
  window.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });
  onScroll();

  if (toTop) toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }));

  /* ---------- Reveal on scroll + animated counters ---------- */
  function countUp(el) {
    const target = parseFloat(el.dataset.count);
    const decimals = (el.dataset.count.split(".")[1] || "").length;
    const suffix = el.dataset.suffix || "";
    el.dataset.counted = "1";
    if (reduceMotion) {
      el.textContent = target.toFixed(decimals) + suffix;
      return;
    }
    const start = performance.now();
    const dur = 1600;
    (function frame(now) {
      const t = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = (target * eased).toFixed(decimals) + suffix;
      if (t < 1) requestAnimationFrame(frame);
    })(start);
  }

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("in");
        if (e.target.dataset.count) countUp(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    $$(".reveal, [data-count]").forEach((el) => io.observe(el));
  } else {
    $$(".reveal").forEach((el) => el.classList.add("in"));
    $$("[data-count]").forEach(countUp);
  }

  /* ---------- Hero slideshow ---------- */
  const hero = $(".hero");
  if (hero) {
    const slides = $$(".hero-slides .slide", hero);
    const dotsWrap = $(".hero-dots", hero);
    let idx = 0;
    let timer;
    const dots = slides.map((_, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", `Show photo ${i + 1}`);
      b.addEventListener("click", () => go(i, true));
      dotsWrap && dotsWrap.appendChild(b);
      return b;
    });
    function go(i, user) {
      slides[idx].classList.remove("active");
      dots[idx] && dots[idx].classList.remove("active");
      idx = (i + slides.length) % slides.length;
      slides[idx].classList.add("active");
      // restart the dot's fill animation
      if (dots[idx]) {
        void dots[idx].offsetWidth;
        dots[idx].classList.add("active");
      }
      if (user) restart();
    }
    function restart() {
      clearInterval(timer);
      if (!reduceMotion && slides.length > 1) timer = setInterval(() => go(idx + 1), 6000);
    }
    if (slides.length) {
      go(0);
      restart();
      document.addEventListener("visibilitychange", () => (document.hidden ? clearInterval(timer) : restart()));
    }
  }

  /* ---------- Generic tabs (journey steps + lesson explorer) ---------- */
  $$("[data-tabs]").forEach((wrap) => {
    const tabs = $$('[role="tab"]', wrap);
    const panels = $$('[role="tabpanel"]', wrap);
    const images = $$("[data-stage] img", wrap);
    const autoplay = wrap.hasAttribute("data-autoplay") && !reduceMotion;
    let current = 0;
    let timer;

    function select(i, focus) {
      current = (i + tabs.length) % tabs.length;
      tabs.forEach((t, n) => {
        const on = n === current;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
      });
      panels.forEach((p, n) => {
        p.hidden = n !== current;
        p.classList.remove("enter");
        if (n === current) { void p.offsetWidth; p.classList.add("enter"); }
      });
      images.forEach((img, n) => img.classList.toggle("active", n === current));
      if (focus) tabs[current].focus();
    }

    tabs.forEach((t, i) => {
      t.addEventListener("click", () => {
        select(i);
        restart();
      });
      t.addEventListener("keydown", (e) => {
        const horiz = wrap.dataset.tabs !== "vertical";
        const next = horiz ? "ArrowRight" : "ArrowDown";
        const prev = horiz ? "ArrowLeft" : "ArrowUp";
        if (e.key === next) { e.preventDefault(); select(current + 1, true); restart(); }
        if (e.key === prev) { e.preventDefault(); select(current - 1, true); restart(); }
      });
    });

    function stop() {
      clearInterval(timer);
      wrap.classList.add("paused");
    }
    // pause while hovered, resume on leave; clicks restart the 5s cycle
    function restart() {
      if (!autoplay) return;
      clearInterval(timer);
      wrap.classList.remove("paused");
      timer = setInterval(() => select(current + 1), 5000);
    }
    if (autoplay) {
      restart();
      wrap.addEventListener("mouseenter", stop);
      wrap.addEventListener("mouseleave", restart);
    }

    // deep links like lessons.html#road-test open the matching tab
    const fromHash = () => panels.findIndex((p) => p.dataset.slug && "#" + p.dataset.slug === location.hash);
    select(Math.max(fromHash(), 0));
    window.addEventListener("hashchange", () => {
      const n = fromHash();
      if (n >= 0) { select(n); restart(); }
    });
  });

  /* ---------- Carousel (reviews) ---------- */
  // Wires up whatever slides are in the track; call it again after replacing them.
  function initCarousel(root) {
    const track = $(".carousel-track", root);
    const slides = [...track.children];
    const dotsWrap = $(".carousel-dots", root);
    let i = 0;
    let timer;
    dotsWrap.textContent = "";
    // More than 8 dots won't fit on a phone, so show a "3 / 30" counter instead
    const counter = slides.length > 8 ? document.createElement("span") : null;
    if (counter) {
      counter.className = "carousel-count";
      counter.setAttribute("aria-live", "polite");
      dotsWrap.appendChild(counter);
    }
    const dots = counter ? [] : slides.map((_, n) => {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", `Show review ${n + 1}`);
      b.addEventListener("click", () => { show(n); restart(); });
      dotsWrap.appendChild(b);
      return b;
    });
    function show(n) {
      i = (n + slides.length) % slides.length;
      track.style.transform = `translateX(${-100 * i}%)`;
      dots.forEach((d, k) => d.classList.toggle("active", k === i));
      if (counter) counter.textContent = `${i + 1} / ${slides.length}`;
      slides.forEach((s, k) => s.setAttribute("aria-hidden", String(k !== i)));
    }
    function restart() {
      clearInterval(timer);
      if (!reduceMotion) timer = setInterval(() => show(i + 1), 7000);
    }
    // Re-running replaces the old listeners instead of stacking a second set
    const ctl = new AbortController();
    if (root._carousel) root._carousel.abort();
    root._carousel = ctl;
    const on = (el, type, fn) => el.addEventListener(type, fn, { signal: ctl.signal });
    ctl.signal.addEventListener("abort", () => clearInterval(timer));

    on($(".prev", root), "click", () => { show(i - 1); restart(); });
    on($(".next", root), "click", () => { show(i + 1); restart(); });
    on(root, "mouseenter", () => clearInterval(timer));
    on(root, "mouseleave", restart);

    // swipe
    let startX = null;
    const vp = $(".carousel-viewport", root);
    on(vp, "pointerdown", (e) => (startX = e.clientX));
    on(vp, "pointerup", (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 50) { show(i + (dx < 0 ? 1 : -1)); restart(); }
      startX = null;
    });
    show(0);
    restart();
  }
  $$("[data-carousel]").forEach(initCarousel);

  /* ---------- Posting forms to the PHP backend ---------- */
  // The API needs a CSRF token tied to the visitor's session. The pages are static HTML,
  // so each form fetches one from api/csrf-token.php (which starts the session cookie).
  function tokenLoader(csrf) {
    return () =>
      fetch("api/csrf-token.php", { credentials: "same-origin", headers: { Accept: "application/json" } })
        .then((res) => (res.ok ? res.json() : null))
        .then((reply) => { if (reply && reply.token) csrf.value = reply.token; })
        .catch(() => {});
  }
  // POSTs the form; if the session expired meanwhile (403), gets a fresh token and tries once more
  async function postForm(form, csrf, loadToken) {
    const send = () => fetch(form.getAttribute("action"), {
      method: "POST",
      credentials: "same-origin",
      headers: { Accept: "application/json", "X-CSRF-Token": csrf.value },
      body: new FormData(form),
    });
    if (!csrf.value) await loadToken();
    let res = await send();
    if (res.status === 403) {
      csrf.value = "";
      await loadToken();
      res = await send();
    }
    return res;
  }

  /* ---------- Student reviews (api/reviews.php) ---------- */
  // Our own photos, matched to the course each review is about.
  const REVIEW_PHOTOS = {
    driving: ["IMAGE%205.jpeg", "step-keys.jpg", "DRIVING%201.jpeg", "PARKING.jpeg"],
    "comp-package": ["comp-hero.jpg", "comp-basics-1.jpg", "comp-office-student.jpg", "comp-lab-keys.jpg"],
  };
  const COURSE_LABELS = { driving: "Driving school student", "comp-package": "Computer college student" };

  function reviewSlide(r, n) {
    const slide = document.createElement("div");
    slide.className = "review";
    const photos = REVIEW_PHOTOS[r.course] || REVIEW_PHOTOS.driving;
    const img = document.createElement("img");
    img.src = "images/" + photos[n % photos.length];
    img.alt = "";
    img.loading = "lazy";
    const text = document.createElement("div");
    text.className = "text";
    const stars = document.createElement("div");
    stars.className = "stars";
    stars.setAttribute("aria-label", `${r.rating} star${r.rating === 1 ? "" : "s"}`);
    stars.textContent = "★".repeat(r.rating) + "☆".repeat(5 - r.rating);
    const quote = document.createElement("blockquote");
    quote.textContent = `"${r.comment}"`;
    const who = document.createElement("div");
    who.className = "who";
    const name = document.createElement("strong");
    name.textContent = r.name;
    const role = document.createElement("small");
    role.textContent = COURSE_LABELS[r.course] || "";
    who.append(name, role);
    text.append(stars, quote, who);
    slide.append(img, text);
    return slide;
  }

  $$("[data-reviews]").forEach((root) => {
    fetch(root.dataset.reviews, { credentials: "same-origin", headers: { Accept: "application/json" } })
      .then((res) => (res.ok ? res.json() : null))
      .then((reply) => {
        // No approved reviews yet (or no PHP, e.g. a static preview): keep the slides in the HTML
        if (!reply || !reply.success || !reply.reviews || !reply.reviews.length) return;
        $(".carousel-track", root).replaceChildren(...reply.reviews.slice(0, 30).map(reviewSlide));
        initCarousel(root);
        // The hero rating and the "Average review" stat follow the real reviews
        const average = reply.average.toFixed(1);
        $$("[data-review-average]").forEach((el) => {
          el.classList.remove("ph");
          if (!("count" in el.dataset)) {
            el.textContent = "★ " + average; // plain text, not an animated counter
            return;
          }
          el.dataset.count = average;
          if (el.dataset.counted) el.textContent = average + (el.dataset.suffix || "");
        });
      })
      .catch(() => {});
  });

  const reviewForm = $("form[data-review-form]");
  if (reviewForm) {
    const err = $(".form-error", reviewForm);
    const status = $(".form-status", reviewForm);
    const submit = $("[data-submit]", reviewForm);
    const csrf = $("input[name=csrf_token]", reviewForm);
    const loadToken = tokenLoader(csrf);
    // Only fetch a token (and start a session) once someone opens the form
    reviewForm.closest("details").addEventListener("toggle", (e) => {
      if (e.target.open && !csrf.value) loadToken();
    });

    function problem() {
      const data = new FormData(reviewForm);
      if (!data.get("rating")) return "Please choose a star rating.";
      if (String(data.get("name") || "").trim().length < 2) return "Please enter your name.";
      if (!data.get("course")) return "Please choose what you studied.";
      if (String(data.get("comment") || "").trim().length < 10) return "Please write a few words about your experience (at least 10 characters).";
      return "";
    }

    reviewForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      status.className = "form-status";
      status.textContent = "";
      err.textContent = problem();
      if (err.textContent) return;

      submit.disabled = true;
      const label = submit.textContent;
      submit.textContent = "Sending…";
      try {
        const res = await postForm(reviewForm, csrf, loadToken);
        const reply = await res.json().catch(() => ({}));
        if (!res.ok || reply.success !== true) {
          throw Object.assign(new Error(reply.message || res.statusText), { shown: res.status === 422 || res.status === 429 || res.status === 403 });
        }
        reviewForm.innerHTML = `
          <div class="success">
            <div class="check">✓</div>
            <h3>Thank you for your review!</h3>
            <p class="muted">It will appear here once the school has checked it.</p>
          </div>`;
      } catch (error) {
        status.textContent = error.shown && error.message
          ? error.message
          : "Something went wrong sending your review. Please try again later.";
        status.classList.add("err");
        submit.disabled = false;
        submit.textContent = label;
      }
    });
  }

  /* ---------- Flip cards: tap to flip on touch ---------- */
  $$(".flip").forEach((card) => {
    card.addEventListener("click", () => {
      const on = card.classList.toggle("flipped");
      card.setAttribute("aria-pressed", String(on));
    });
    // Mouse users: flip back as soon as the cursor leaves, even after a click
    card.addEventListener("pointerleave", (e) => {
      if (e.pointerType !== "mouse") return;
      card.classList.remove("flipped");
      card.setAttribute("aria-pressed", "false");
    });
  });

  /* ---------- 3D tilt on pricing cards (mouse only) ---------- */
  if (!reduceMotion && window.matchMedia("(hover: hover)").matches) {
    $$("[data-tilt]").forEach((el) => {
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(900px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateY(-6px)`;
      });
      el.addEventListener("mouseleave", () => (el.style.transform = ""));
    });
  }

  /* ---------- Booking wizard (contact page) ---------- */
  const form = $("form[data-booking]");
  if (form) {
    const panels = $$(".step-panel", form);
    const steps = $$(".wizard-progress li", form);
    const back = $("[data-back]", form);
    const next = $("[data-next]", form);
    const submit = $("[data-submit]", form);
    const err = $(".form-error", form);
    const status = $(".form-status", form);
    let step = 0;

    // Pre-select a lesson/course from ?package=..., and note a chosen
    // computer package from ?plan=... in the message box.
    const params = new URLSearchParams(location.search);
    const pkg = params.get("package");
    if (pkg) {
      // Students pick a whole school, not single lessons: any comp-* link means Computer, anything else Driving
      const radio = $(`input[name=package][value="${pkg.startsWith("comp") ? "comp-package" : "driving"}"]`, form);
      if (radio) radio.checked = true;
    }
    const plan = params.get("plan");
    const msg = $("#message", form);
    if (plan && msg) msg.value = `Interested in: ${plan}`;

    // Driving-only fields (marked data-only="driving") are hidden and disabled for
    // computer courses, so they're neither required nor submitted.
    function syncSchool() {
      const chosen = $("input[name=package]:checked", form);
      const computer = !!chosen && chosen.value.startsWith("comp-");
      $$("[data-only=driving]", form).forEach((el) => {
        el.hidden = computer;
        $$("input, select, textarea", el).forEach((f) => (f.disabled = computer));
      });
    }
    form.addEventListener("change", (e) => e.target.name === "package" && syncSchool());
    syncSchool();
    const date = $("#date", form);
    // Same window the server accepts: today up to one year ahead, in the visitor's local date
    // (toISOString() would give the UTC date, which is yesterday in Kenya before 3am)
    const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (date) {
      const today = new Date();
      date.min = ymd(today);
      date.max = ymd(new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()));
    }

    function render() {
      panels.forEach((p, i) => (p.hidden = i !== step));
      steps.forEach((s, i) => {
        s.classList.toggle("done", i < step);
        s.classList.toggle("current", i === step);
      });
      back.hidden = step === 0;
      next.hidden = step === panels.length - 1;
      submit.hidden = step !== panels.length - 1;
      err.textContent = "";
    }
    function valid() {
      const fields = $$("input, select, textarea", panels[step]);
      for (const f of fields) {
        if (!f.checkValidity()) {
          if (f.type === "radio") err.textContent = "Please pick one option to continue.";
          else f.reportValidity();
          return false;
        }
      }
      return true;
    }
    function advance() {
      if (!valid()) return;
      step++;
      render();
      form.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    }
    next.addEventListener("click", advance);
    back.addEventListener("click", () => { step--; render(); });
    render();

    // Fetch the CSRF token (and start the session cookie) only once the visitor starts filling in the form
    const csrf = $("input[name=csrf_token]", form);
    const loadToken = tokenLoader(csrf);
    form.addEventListener("focusin", () => { if (!csrf.value) loadToken(); }, { once: true });

    // Sends the request in the background; the visitor stays on the page.
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      // Enter in an earlier step submits the form natively; treat it as "Next"
      if (step < panels.length - 1) return advance();
      status.className = "form-status";
      status.textContent = "";
      if (!valid()) return;

      submit.disabled = true;
      const label = submit.textContent;
      submit.textContent = "Sending…";
      try {
        const res = await postForm(form, csrf, loadToken);
        const reply = await res.json().catch(() => ({}));
        if (!res.ok || reply.success !== true) {
          // 422 = a field failed server-side checks; the server says which
          throw Object.assign(new Error(reply.message || res.statusText), { shown: res.status === 422 || res.status === 429 || res.status === 403 });
        }
        form.innerHTML = `
          <div class="success">
            <div class="check">✓</div>
            <h3>Request sent!</h3>
            <p class="muted">We will contact you within one business day to confirm your booking.</p>
            <p class="muted">Your reference: <strong data-ref></strong></p>
            <a href="index.html" class="btn btn--black">Back to home</a>
          </div>`;
        $("[data-ref]", form).textContent = reply.reference || "";
      } catch (error) {
        status.textContent = error.shown && error.message
          ? error.message
          : "Something went wrong sending your request. Please call or text us instead.";
        status.classList.add("err");
        submit.disabled = false;
        submit.textContent = label;
      }
    });
  }
})();
