/* ==========================================================================
   Veridian Limited — script.js
   Mobile nav · theme toggle · scroll behaviour · reveal-on-scroll
   Animated counters · FAQ accordion · contact form · newsletter
   Interactive mini-audit tool · year stamp
   ========================================================================== */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    yearStamp();
    headerScrollState();
    mobileNav();
    themeToggle();
    smoothScroll();
    revealOnScroll();
    countersOnScroll();
    faqAccordion();
    updateBookingMonth();
    captureCampaignParams();
    personalizeForCampaign();
    contactForm();
    newsletterForm();
    blogFilters();
    imageFallbacks();
  }

  /* ===== Year ===== */
  function yearStamp() {
    document.querySelectorAll("[data-year]").forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });
  }

  /* ===== Header scroll state ===== */
  function headerScrollState() {
    var header = document.querySelector(".site-header");
    if (!header) return;
    var ticking = false;
    function update() {
      header.classList.toggle("scrolled", window.scrollY > 8);
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    update();
  }

  /* ===== Mobile navigation ===== */
  function mobileNav() {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.querySelector(".site-nav");
    if (!toggle || !nav) return;

    var backdrop = document.createElement("div");
    backdrop.className = "nav-backdrop";
    document.body.insertBefore(backdrop, document.body.firstChild);

    function closeNav() {
      nav.classList.remove("open");
      backdrop.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    }

    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      backdrop.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.style.overflow = open ? "hidden" : "";
    });

    backdrop.addEventListener("click", closeNav);

    // Close on link click
    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", closeNav);
    });

    // Close on Escape
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("open")) closeNav();
    });
  }

  /* ===== Theme toggle (light default, dark optional) ===== */
  function themeToggle() {
    var btn = document.querySelector(".theme-toggle");
    if (!btn) return;
    var KEY = "veridian-theme";
    var saved = localStorage.getItem(KEY);
    if (saved === "dark") document.documentElement.setAttribute("data-theme", "dark");

    btn.addEventListener("click", function () {
      var isDark = document.documentElement.getAttribute("data-theme") === "dark";
      if (isDark) {
        document.documentElement.removeAttribute("data-theme");
        localStorage.setItem(KEY, "light");
      } else {
        document.documentElement.setAttribute("data-theme", "dark");
        localStorage.setItem(KEY, "dark");
      }
    });
  }

  /* ===== Smooth in-page scroll ===== */
  function smoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener("click", function (e) {
        var href = this.getAttribute("href");
        if (href.length <= 1) return;
        var target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        var top = target.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: top, behavior: "smooth" });
      });
    });
  }

  /* ===== Reveal on scroll ===== */
  function revealOnScroll() {
    var els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window) || !els.length) {
      els.forEach(function (el) { el.classList.add("visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -50px 0px" });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ===== Animated counters ===== */
  function countersOnScroll() {
    var counters = document.querySelectorAll("[data-count-to]");
    if (!counters.length) return;

    function animate(el) {
      var target = parseFloat(el.getAttribute("data-count-to"));
      var decimals = parseInt(el.getAttribute("data-count-decimals") || "0", 10);
      var prefix = el.getAttribute("data-count-prefix") || "";
      var suffix = el.getAttribute("data-count-suffix") || "";
      var duration = 1600;
      var start = null;

      function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / duration, 1);
        // ease-out cubic
        var eased = 1 - Math.pow(1 - p, 3);
        var val = target * eased;
        el.textContent = prefix + val.toFixed(decimals) + suffix;
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    if (!("IntersectionObserver" in window)) {
      counters.forEach(animate);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animate(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    counters.forEach(function (c) { io.observe(c); });
  }

  /* ===== FAQ accordion (close others when opening one) ===== */
  function faqAccordion() {
    var items = document.querySelectorAll(".faq-item");
    items.forEach(function (item) {
      item.addEventListener("toggle", function () {
        if (this.open) {
          items.forEach(function (other) {
            if (other !== item) other.removeAttribute("open");
          });
        }
      });
    });
  }

  /* ===== Campaign attribution =====
   * Captures UTM params + landing page + referrer on first arrival and
   * persists them for the session, so a form submitted three pages later
   * still carries the campaign that brought the visitor in. On submit we
   * inject these as hidden fields, making every Netlify lead attributable
   * to a specific cold-email campaign / industry / source.
   *
   * Cold-email link convention:
   *   https://veridian.ng/audit?utm_source=cold-email
   *     &utm_medium=email&utm_campaign=abuja-pharmacies-jun26&industry=pharmacy
   */
  var CAMPAIGN_KEY = "veridian-campaign";
  var CAMPAIGN_FIELDS = [
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "industry"
  ];

  function captureCampaignParams() {
    try {
      var params = new URLSearchParams(window.location.search);
      var existing = {};
      try { existing = JSON.parse(sessionStorage.getItem(CAMPAIGN_KEY) || "{}"); } catch (e) {}

      var sawAny = false;
      CAMPAIGN_FIELDS.forEach(function (key) {
        var val = params.get(key);
        if (val) { existing[key] = val.slice(0, 120); sawAny = true; }
      });

      // Record landing context once, on the first touch of the session
      if (!existing.landing_page) {
        existing.landing_page = window.location.pathname + window.location.search;
        existing.referrer = document.referrer || "direct";
        existing.first_seen = new Date().toISOString();
        sawAny = true;
      }

      if (sawAny) {
        sessionStorage.setItem(CAMPAIGN_KEY, JSON.stringify(existing));
      }
    } catch (e) { /* sessionStorage blocked — attribution is best-effort */ }
  }

  function getCampaignData() {
    try { return JSON.parse(sessionStorage.getItem(CAMPAIGN_KEY) || "{}"); }
    catch (e) { return {}; }
  }

  // Inject campaign data as hidden inputs just before a form is submitted.
  function attachCampaignFields(form) {
    var data = getCampaignData();
    Object.keys(data).forEach(function (key) {
      if (!data[key]) return;
      var existing = form.querySelector('input[name="' + key + '"]');
      if (existing) { existing.value = data[key]; return; }
      var input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = data[key];
      form.appendChild(input);
    });
  }

  /* ===== Landing-page personalization =====
   * Lets a cold email drop a prospect onto a page that speaks to *their*
   * industry. Any element with data-campaign-industry will have its text
   * swapped for the matching phrase when ?industry=… is present. Falls back
   * silently to the default copy when there's no param (e.g. organic visit),
   * so the page is always coherent.
   *
   * Markup example:
   *   <span data-campaign-industry
   *         data-default="Nigerian businesses">Nigerian businesses</span>
   */
  var INDUSTRY_LABELS = {
    pharmacy:     "pharmacies",
    pharmacies:   "pharmacies",
    school:       "schools",
    schools:      "schools",
    realestate:   "real-estate firms",
    "real-estate":"real-estate firms",
    property:     "property businesses",
    hotel:        "hotels",
    hospitality:  "hospitality businesses",
    clinic:       "clinics",
    hospital:     "clinics & hospitals",
    restaurant:   "restaurants",
    law:          "law firms",
    legal:        "law firms",
    logistics:    "logistics companies",
    retail:       "retail businesses",
    fashion:      "fashion brands",
    fintech:      "fintech startups"
  };

  function personalizeForCampaign() {
    var nodes = document.querySelectorAll("[data-campaign-industry]");
    if (!nodes.length) return;

    var data = getCampaignData();
    var raw = (data.industry || "").toLowerCase().trim();
    var label = INDUSTRY_LABELS[raw];

    nodes.forEach(function (el) {
      if (label) {
        el.textContent = label;
      } else if (el.getAttribute("data-default")) {
        el.textContent = el.getAttribute("data-default");
      }
    });
  }

  /* ===== Submit any form to Netlify Forms =====
   * Netlify intercepts POST to "/" when form has data-netlify="true" AND
   * a hidden form-name input. We use fetch() so we can keep the inline
   * success UX (no page reload). The form's existing markup is the source
   * of truth — we just bundle FormData as urlencoded body. Campaign
   * attribution fields are injected immediately before serialization.
   */
  function submitToNetlify(form) {
    attachCampaignFields(form);
    var data = new FormData(form);
    var body = new URLSearchParams(data).toString();
    return fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body,
    });
  }

  /* ===== Dynamic booking month =====
   * Keeps "Now booking audits — Month YYYY" current without manual edits.
   * Shows the NEXT calendar month so it reads as forward-looking.
   * E.g. visiting in June → shows "July 2026"
   */
  function updateBookingMonth() {
    var el = document.getElementById("booking-month");
    if (!el) return;
    var months = [
      "January","February","March","April","May","June",
      "July","August","September","October","November","December"
    ];
    var now  = new Date();
    el.textContent = months[now.getMonth()] + " " + now.getFullYear();
  }
  function contactForm() {
    var form = document.querySelector("#contact-form");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = form.querySelector("button[type='submit']");
      var success = form.querySelector(".form-success");
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Sending…";
      }
      submitToNetlify(form)
        .then(function (resp) {
          if (!resp.ok) throw new Error("HTTP " + resp.status);
          if (success) success.classList.add("show");
          form.reset();
        })
        .catch(function () {
          if (btn) btn.textContent = "Couldn't send — try WhatsApp?";
          // Keep button disabled briefly so the message is visible
          setTimeout(function () {
            if (btn) {
              btn.disabled = false;
              btn.textContent = "Send message";
            }
          }, 3000);
          return;
        })
        .finally(function () {
          if (btn && success && success.classList.contains("show")) {
            btn.disabled = false;
            btn.textContent = "Send message";
          }
        });
    });
  }

  /* ===== Newsletter ===== */
  function newsletterForm() {
    document.querySelectorAll(".newsletter-form, .footer-newsletter-mini form").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var btn = form.querySelector("button");
        var original = btn ? btn.textContent : "Subscribe";
        if (btn) {
          btn.disabled = true;
          btn.textContent = "Sending…";
        }
        submitToNetlify(form)
          .then(function (resp) {
            if (!resp.ok) throw new Error("HTTP " + resp.status);
            if (btn) btn.textContent = "Thanks!";
            form.reset();
            // Lead magnet: deliver the self-audit checklist on subscribe
            var dl = document.createElement("a");
            dl.href = "assets/downloads/veridian-self-audit-checklist.pdf";
            dl.download = "veridian-self-audit-checklist.pdf";
            document.body.appendChild(dl);
            dl.click();
            dl.remove();
          })
          .catch(function () {
            if (btn) btn.textContent = "Try again";
          })
          .finally(function () {
            setTimeout(function () {
              if (btn) {
                btn.disabled = false;
                btn.textContent = original;
              }
            }, 2400);
          });
      });
    });
  }

  /* ===== Blog category filter ===== */
  function blogFilters() {
    var grid  = document.querySelector(".blog-grid");
    var chips = document.querySelectorAll(".blog-chip");
    var cards = document.querySelectorAll(".blog-grid .blog-card");
    if (!grid || !cards.length) return;

    // Always sync chip counts from current DOM cards
    // (covers both the static-HTML fallback and the post-WP-load path)
    var tally = {}, total = 0;
    cards.forEach(function (card) {
      var cat = (card.getAttribute("data-category") || "").trim();
      if (cat) { tally[cat] = (tally[cat] || 0) + 1; }
      total++;
    });

    // Only rebuild if counts differ from what's in the DOM
    var allChip = document.querySelector(".blog-chip[data-cat='all'] .blog-chip-count");
    if (allChip && parseInt(allChip.textContent, 10) !== total) {
      // counts are stale — rebuild
      var container = document.querySelector(".blog-filters");
      if (container) {
        var cats = Object.keys(tally).sort();
        var html = '<button class="blog-chip active" data-cat="all">All <span class="blog-chip-count">' + total + '</span></button>';
        cats.forEach(function (cat) {
          html += '<button class="blog-chip" data-cat="' + cat + '">' + cat +
                  ' <span class="blog-chip-count">' + tally[cat] + '</span></button>';
        });
        container.innerHTML = html;
      }
    }

    // Wire click handlers on (possibly new) chips
    document.querySelectorAll(".blog-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        var cat = chip.getAttribute("data-cat");
        document.querySelectorAll(".blog-chip").forEach(function (c) { c.classList.remove("active"); });
        chip.classList.add("active");
        document.querySelectorAll(".blog-grid .blog-card").forEach(function (card) {
          var cardCat = card.getAttribute("data-category") ||
                        (card.querySelector(".blog-card-category") || {}).textContent || "";
          card.classList.toggle("is-hidden", cat !== "all" && cardCat.trim() !== cat);
        });
      });
    });
  }
  /* ===== Image fallback swap =====
   * Any <img data-fallback="..."> whose primary src fails will silently
   * swap to its local fallback. Runs in capture phase so it catches
   * errors before they're swallowed (the `error` event doesn't bubble).
   * Works for both initial load and JS-hydrated swaps.
   */
  function imageFallbacks() {
    document.addEventListener("error", function (e) {
      var t = e.target;
      if (!t || t.tagName !== "IMG") return;
      var fb = t.getAttribute("data-fallback");
      if (!fb) return;
      // Prevent loop if the fallback itself fails
      if (t.src.indexOf(fb) !== -1) return;
      t.src = fb;
    }, /* capture */ true);
  }
})();
