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

  function onScroll() {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? (y / max) * 100 : 0;
    if (bar) bar.style.width = pct + "%";
    if (car) car.style.left = pct + "%";
    if (header) header.classList.toggle("scrolled", y > 40);
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
        stop();
      });
      t.addEventListener("keydown", (e) => {
        const horiz = wrap.dataset.tabs !== "vertical";
        const next = horiz ? "ArrowRight" : "ArrowDown";
        const prev = horiz ? "ArrowLeft" : "ArrowUp";
        if (e.key === next) { e.preventDefault(); select(current + 1, true); stop(); }
        if (e.key === prev) { e.preventDefault(); select(current - 1, true); stop(); }
      });
    });

    function stop() {
      clearInterval(timer);
      wrap.classList.add("paused");
    }
    if (autoplay) {
      timer = setInterval(() => select(current + 1), 5000);
      wrap.addEventListener("mouseenter", stop, { once: true });
    }

    // deep links like lessons.html#road-test open the matching tab
    const fromHash = () => panels.findIndex((p) => p.dataset.slug && "#" + p.dataset.slug === location.hash);
    select(Math.max(fromHash(), 0));
    window.addEventListener("hashchange", () => {
      const n = fromHash();
      if (n >= 0) { select(n); stop(); }
    });
  });

  /* ---------- Carousel (reviews) ---------- */
  $$("[data-carousel]").forEach((root) => {
    const track = $(".carousel-track", root);
    const slides = [...track.children];
    const dotsWrap = $(".carousel-dots", root);
    let i = 0;
    let timer;
    const dots = slides.map((_, n) => {
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
      slides.forEach((s, k) => s.setAttribute("aria-hidden", String(k !== i)));
    }
    function restart() {
      clearInterval(timer);
      if (!reduceMotion) timer = setInterval(() => show(i + 1), 7000);
    }
    $(".prev", root).addEventListener("click", () => { show(i - 1); restart(); });
    $(".next", root).addEventListener("click", () => { show(i + 1); restart(); });
    root.addEventListener("mouseenter", () => clearInterval(timer));
    root.addEventListener("mouseleave", restart);

    // swipe
    let startX = null;
    const vp = $(".carousel-viewport", root);
    vp.addEventListener("pointerdown", (e) => (startX = e.clientX));
    vp.addEventListener("pointerup", (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 50) { show(i + (dx < 0 ? 1 : -1)); restart(); }
      startX = null;
    });
    show(0);
    restart();
  });

  /* ---------- Gallery lightbox ---------- */
  const galleryItems = $$("[data-gallery] button");
  if (galleryItems.length) {
    const lb = document.createElement("div");
    lb.className = "lightbox";
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.setAttribute("aria-label", "Photo viewer");
    lb.innerHTML = `
      <button class="lb-btn lb-close" aria-label="Close">✕</button>
      <button class="lb-btn lb-prev" aria-label="Previous photo">←</button>
      <figure><img alt="" /><figcaption></figcaption></figure>
      <button class="lb-btn lb-next" aria-label="Next photo">→</button>`;
    document.body.appendChild(lb);
    const img = $("img", lb);
    const cap = $("figcaption", lb);
    let at = 0;
    let opener = null;

    function show(n) {
      at = (n + galleryItems.length) % galleryItems.length;
      const src = $("img", galleryItems[at]);
      img.src = src.currentSrc || src.src;
      img.alt = src.alt;
      cap.textContent = src.alt;
    }
    function open(n) {
      opener = document.activeElement;
      show(n);
      lb.classList.add("open");
      document.body.classList.add("no-scroll");
      $(".lb-close", lb).focus();
    }
    function close() {
      lb.classList.remove("open");
      document.body.classList.remove("no-scroll");
      opener && opener.focus();
    }
    galleryItems.forEach((b, n) => b.addEventListener("click", () => open(n)));
    $(".lb-close", lb).addEventListener("click", close);
    $(".lb-prev", lb).addEventListener("click", () => show(at - 1));
    $(".lb-next", lb).addEventListener("click", () => show(at + 1));
    lb.addEventListener("click", (e) => e.target === lb && close());
    document.addEventListener("keydown", (e) => {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(at - 1);
      if (e.key === "ArrowRight") show(at + 1);
      if (e.key === "Tab") {
        // keep focus inside the viewer
        const f = $$("button", lb);
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ---------- Flip cards: tap to flip on touch ---------- */
  $$(".flip").forEach((card) => {
    card.addEventListener("click", () => {
      const on = card.classList.toggle("flipped");
      card.setAttribute("aria-pressed", String(on));
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

  /* ---------- Lesson estimator (pricing page) ---------- */
  const est = $("#estimator");
  if (est) {
    const out = {
      hours: $("[data-out=hours]", est),
      plan: $("[data-out=plan]", est),
      note: $("[data-out=note]", est),
      link: $("[data-out=link]", est),
      img: $(".result > img", est),
    };
    const range = $("#confidence", est);
    const rangeOut = $("output[for=confidence]", est);
    const labels = ["Very nervous", "Nervous", "Okay", "Confident", "Very confident"];

    // Rough guide only; Kwame should tune these numbers to his real experience.
    const BASE = { never: 9, some: 5, licensed: 2 };
    const PLANS = [
      { max: 3, name: "Single Lessons", slug: "single", img: "images/start-engine.jpg", note: "A few targeted sessions should get you there." },
      { max: 6, name: "Starter Pack", slug: "starter", img: "images/hero-driver.jpg", note: "5 hours plus a top-up lesson or two if needed." },
      { max: 99, name: "10-Lesson Package", slug: "ten", img: "images/hands-on-wheel.jpg", note: "Our best value for building skills from zero." },
    ];

    function calc() {
      const exp = $("input[name=experience]:checked", est).value;
      const goal = $("input[name=goal]:checked", est).value;
      const conf = +range.value;
      rangeOut.textContent = labels[conf - 1];
      let h = BASE[exp] + (3 - conf);
      if (goal === "test") h += 1;
      h = Math.max(1, Math.round(h));
      let plan = PLANS.find((p) => h <= p.max);
      if (goal === "test" && h <= 6) plan = { name: "Road Test Bundle", slug: "road-test", img: "images/traffic-light.jpg", note: "Test-focused practice, a mock test, and our car on the day." };
      out.hours.textContent = `${h}–${h + 2} hrs`;
      out.plan.textContent = plan.name;
      out.note.textContent = h + 2 > 10 && plan.slug === "ten"
        ? "Start with the 10-lesson package and add single lessons if you need them."
        : plan.note;
      out.link.href = `contact.html?package=${plan.slug}`;
      if (!out.img.src.endsWith(plan.img)) {
        out.img.style.opacity = 0;
        setTimeout(() => { out.img.src = plan.img; out.img.style.opacity = 1; }, 200);
      }
      $$("[data-plan]").forEach((c) => c.classList.toggle("highlight", c.dataset.plan === plan.slug));
    }
    est.addEventListener("input", calc);
    calc();
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
      const radio = $(`input[name=package][value="${CSS.escape(pkg)}"]`, form);
      if (radio) radio.checked = true;
    }
    const plan = params.get("plan");
    const msg = $("#message", form);
    if (plan && msg) msg.value = `Interested in: ${plan}`;

    // Driving-only fields (permit, pickup) are hidden and disabled for
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
    if (date) date.min = new Date().toISOString().split("T")[0];

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
    next.addEventListener("click", () => {
      if (!valid()) return;
      step++;
      render();
      form.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    });
    back.addEventListener("click", () => { step--; render(); });
    render();

    // Submits to Formspree (or any endpoint that accepts form POSTs).
    // Until a real endpoint is set in the form's action, it opens the
    // visitor's email app with the details filled in instead.
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      status.className = "form-status";
      if (!valid()) return;

      const data = new FormData(form);
      const action = form.getAttribute("action") || "";
      if (!action || action.includes("YOUR_FORM_ID")) {
        const body = [...data.entries()].map(([k, v]) => `${k}: ${v}`).join("\n");
        location.href = `mailto:${form.dataset.email}?subject=${encodeURIComponent("Lesson booking request")}&body=${encodeURIComponent(body)}`;
        return;
      }

      submit.disabled = true;
      try {
        const res = await fetch(action, { method: "POST", body: data, headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(res.statusText);
        form.innerHTML = `
          <div class="success">
            <div class="check">✓</div>
            <h3>Request sent!</h3>
            <p class="muted">We'll call or text you within one business day to confirm your lesson.</p>
            <a href="index.html" class="btn btn--black">Back to home</a>
          </div>`;
      } catch {
        status.textContent = "Something went wrong sending your request. Please call or text us instead.";
        status.classList.add("err");
        submit.disabled = false;
      }
    });
  }
})();
