/* ============================================================
   MAINSTREET MODERN — interactions ("Built on Main Street" v5)
   Dependency-free, progressively enhanced, motion-safe.
   ------------------------------------------------------------
   loader · page wipes · hero sign intro + parallax · glide
   scroll · reveals · scroll-scrub manifesto · carousel ·
   services peek · stacking steps · custom cursor · magnetic
   buttons · count-ups · footer wordmark · faq · contact form
   ============================================================ */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  /* ---- year stamps ---- */
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---- LOADER (once per session) + hero intro trigger ---- */
  var loader = $(".loader");
  var setReady = function () { document.body.classList.add("is-ready"); };
  if (loader) {
    var seen = false;
    try { seen = sessionStorage.getItem("msm_seen") === "1"; } catch (e) {}
    if (reduce || seen) {
      loader.parentNode && loader.parentNode.removeChild(loader);
      loader = null;
    } else {
      document.body.style.overflow = "hidden";
      var bar = $(".loader__bar span", loader);
      var pct = $(".loader__pct", loader);
      var p = 0;
      var iv = setInterval(function () {
        p += Math.random() * 14 + 6;
        if (p >= 100) { p = 100; clearInterval(iv); finish(); }
        if (bar) bar.style.width = p + "%";
        if (pct) pct.textContent = Math.round(p) + "%";
      }, 130);
    }
  }
  function finish() {
    setTimeout(function () {
      loader.classList.add("done");
      document.body.style.overflow = "";
      setReady();
      try { sessionStorage.setItem("msm_seen", "1"); } catch (e) {}
      setTimeout(function () { loader.parentNode && loader.parentNode.removeChild(loader); loader = null; }, 1100);
    }, 280);
  }

  /* ---- PAGE-WIPE transitions between pages ---- */
  var wipe = $(".page-wipe");
  var arriving = false;
  try { arriving = sessionStorage.getItem("msm_wipe") === "1"; sessionStorage.removeItem("msm_wipe"); } catch (e) {}
  if (wipe && !reduce) {
    if (arriving && !loader) {
      // cover instantly, then slide away
      wipe.classList.add("wipe-out");
      wipe.addEventListener("animationend", function (e) {
        if (e.target === wipe) { wipe.classList.remove("wipe-out"); setReady(); }
      });
    }
    // leave: intercept same-origin page links
    document.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest && e.target.closest("a[href]");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      var href = a.getAttribute("href");
      if (!href || href.charAt(0) === "#" || /^(https?:|mailto:|tel:)/i.test(href)) return;
      e.preventDefault();
      try { sessionStorage.setItem("msm_wipe", "1"); } catch (err) {}
      document.body.style.overflow = "hidden";
      wipe.classList.add("wipe-in");
      setTimeout(function () { window.location.href = href; }, 480);
    });
    // restore if the page comes back from bfcache
    window.addEventListener("pageshow", function (e) {
      if (e.persisted) { wipe.classList.remove("wipe-in"); document.body.style.overflow = ""; setReady(); }
    });
  }
  // no loader and no arrival wipe → hero intro plays immediately
  if (!loader && !(wipe && arriving && !reduce)) { setReady(); }
  // belt-and-braces: never leave the hero un-revealed
  setTimeout(setReady, 2600);

  /* ---- enable the hover "push" on the shop sign ONLY after its intro swing has
     settled, so hovering during the drop-in can't restart/glitch the entrance ---- */
  var heroSign = $(".hero-sign");
  var signSwingEl = $(".sign-swing");
  if (heroSign && signSwingEl) {
    var enableSignHover = function () { heroSign.classList.add("swing-ready"); };
    if (reduce) {
      enableSignHover();
    } else {
      signSwingEl.addEventListener("animationend", function (e) {
        if (e.animationName === "signSwing") enableSignHover();
      });
      // fallback: intro swing is delay(0.75s) + duration(3.6s); enable a bit after
      setTimeout(enableSignHover, 4600);
    }
  }

  /* ---- sticky header + scroll cue + homepage nav reveal ---- */
  var header = $(".site-header");
  var cue = $(".scroll-cue");
  var homeHeader = $(".site-header--home");
  var heroLogo = $(".hero-logo");
  // reveal the nav exactly when the hero logo has fully faded out (see hero
  // parallax below — the logo reaches opacity 0 at 0.8 of a viewport of scroll)
  var revealPoint = function () { return heroLogo ? window.innerHeight * 0.8 : 500; };
  var onScroll = function () {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 24);
    if (cue) cue.classList.toggle("is-hidden", window.scrollY > 20);
    // homepage: reveal the full nav bar once you've scrolled past the logo section
    if (homeHeader) homeHeader.classList.toggle("is-revealed", window.scrollY > revealPoint());
  };
  onScroll(); window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);

  /* ---- hero parallax: the sign drifts as the statement rises over it ---- */
  var heroInner = $(".hero-logo__inner");
  if (heroInner && !reduce) {
    var heroTick = false;
    var heroFrame = function () {
      heroTick = false;
      var y = window.scrollY;
      var vh = window.innerHeight;
      if (y < vh * 1.2) {
        // fade the logo out a bit sooner (fully gone by ~0.8 of a viewport of scroll)
        var pr = clamp(y / (vh * 0.8), 0, 1);
        heroInner.style.transform = "translateY(" + (y * 0.34).toFixed(1) + "px) scale(" + (1 - pr * 0.06).toFixed(4) + ")";
        heroInner.style.opacity = String(1 - pr);
      }
    };
    window.addEventListener("scroll", function () {
      if (!heroTick) { heroTick = true; requestAnimationFrame(heroFrame); }
    }, { passive: true });
  }

  /* ---- smooth "gliding" scroll (mouse wheel only; slower + eased).
     Drives the native scroll position, so position:sticky keeps working. ---- */
  if (fine && !reduce) {
    var GLIDE = 0.10;
    var STEP  = 0.85;
    document.documentElement.style.scrollBehavior = "auto";
    var sTarget = window.scrollY, sCurrent = sTarget, sTicking = false, sWheeling = false;
    var sMax = function () { return document.documentElement.scrollHeight - window.innerHeight; };
    var sFrame = function () {
      sCurrent += (sTarget - sCurrent) * GLIDE;
      if (Math.abs(sTarget - sCurrent) < 0.5) { sCurrent = sTarget; window.scrollTo(0, sTarget); sTicking = false; sWheeling = false; return; }
      window.scrollTo(0, sCurrent); requestAnimationFrame(sFrame);
    };
    window.addEventListener("wheel", function (e) {
      if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (document.body.style.overflow === "hidden") return;
      e.preventDefault();
      if (!sWheeling) { sCurrent = sTarget = window.scrollY; sWheeling = true; }
      var d = e.deltaY * (e.deltaMode === 1 ? 16 : 1);
      sTarget = clamp(sTarget + d * STEP, 0, sMax());
      if (!sTicking) { sTicking = true; requestAnimationFrame(sFrame); }
    }, { passive: false });
    window.addEventListener("scroll", function () { if (!sWheeling) { sTarget = sCurrent = window.scrollY; } }, { passive: true });
  }

  /* ---- mobile menu ---- */
  var toggle = $(".nav-toggle"), menu = $(".mobile-menu");
  if (toggle && menu) {
    var setMenu = function (open) {
      toggle.setAttribute("aria-expanded", String(open));
      menu.classList.toggle("is-open", open);
      document.body.style.overflow = open ? "hidden" : "";
    };
    toggle.addEventListener("click", function () { setMenu(toggle.getAttribute("aria-expanded") !== "true"); });
    $$("a", menu).forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
  }

  /* ---- split big headlines into rising words ---- */
  $$(".rise").forEach(function (el) {
    var words = el.textContent.trim().split(/\s+/);
    el.textContent = "";
    words.forEach(function (w, i) {
      var word = document.createElement("span"); word.className = "word";
      var inner = document.createElement("span"); inner.textContent = w;
      inner.style.setProperty("--i", i);
      word.appendChild(inner);
      el.appendChild(word);
      el.appendChild(document.createTextNode(" "));
    });
  });

  /* ---- reveals ---- */
  var reveals = $$(".reveal, .rise");
  var lineGroups = $$(".reveal-lines");
  if (reduce || !("IntersectionObserver" in window)) {
    reveals.concat(lineGroups).forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.16, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { io.observe(el); });

    // line-by-line groups fire once the panel has risen to fill most of the screen
    var lio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); lio.unobserve(e.target); } });
    }, { threshold: 0, rootMargin: "0px 0px -80% 0px" });
    lineGroups.forEach(function (el) { lio.observe(el); });
  }
  $$("[data-stagger]").forEach(function (group) {
    var step = parseFloat(group.getAttribute("data-stagger")) || 0.09;
    $$(":scope > .reveal", group).forEach(function (child, i) { child.style.setProperty("--d", (i * step) + "s"); });
  });

  /* ---- scroll-scrub manifesto: words ignite as you scroll ---- */
  $$("[data-scrub]").forEach(function (el) {
    // wrap every word in a span, preserving <em> emphasis groups
    var wrapWords = function (node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
            var s = document.createElement("span");
            s.className = "sw"; s.textContent = part;
            frag.appendChild(s);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          wrapWords(child);
        }
      });
    };
    wrapWords(el);
    var words = $$(".sw", el);
    if (reduce) { words.forEach(function (w) { w.classList.add("on"); }); return; }
    var pin = el.closest(".scrub-pin") || el;
    var lit = -1;
    var scrubTick = false;
    var scrubFrame = function () {
      scrubTick = false;
      var r = pin.getBoundingClientRect();
      var vh = window.innerHeight;
      var total = r.height - vh;
      var pr = total > 40 ? clamp(-r.top / total, 0, 1) : clamp((vh * 0.75 - r.top) / (r.height * 0.9), 0, 1);
      var n = Math.round(pr * (words.length + 1)) - 1;
      if (n === lit) return;
      lit = n;
      words.forEach(function (w, i) { w.classList.toggle("on", i <= n); });
    };
    window.addEventListener("scroll", function () {
      if (!scrubTick) { scrubTick = true; requestAnimationFrame(scrubFrame); }
    }, { passive: true });
    scrubFrame();
  });

  /* ---- count-up ---- */
  function countUp(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var dec = (el.getAttribute("data-decimals") | 0);
    if (reduce) { el.textContent = target.toFixed(dec); return; }
    var dur = 1500, start = null;
    function tick(ts) {
      if (start === null) start = ts;
      var pr = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - pr, 3);
      el.textContent = (target * eased).toFixed(dec);
      if (pr < 1) requestAnimationFrame(tick); else el.textContent = target.toFixed(dec);
    }
    requestAnimationFrame(tick);
  }
  var counters = $$("[data-count]");
  if (counters.length) {
    if (!("IntersectionObserver" in window)) { counters.forEach(countUp); }
    else {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { countUp(e.target); cio.unobserve(e.target); } });
      }, { threshold: 0.6 });
      counters.forEach(function (el) { cio.observe(el); });
    }
  }

  /* ---- carousel: drag + dots + arrows ---- */
  $$("[data-carousel]").forEach(function (root) {
    var track = $(".carousel", root);
    var dotsWrap = $(".carousel-dots", root);
    if (!track) return;
    var cards = $$(".card-work", track);

    if (dotsWrap && cards.length) {
      cards.forEach(function (c, i) {
        var b = document.createElement("button");
        b.setAttribute("aria-label", "Go to item " + (i + 1));
        b.addEventListener("click", function () { cards[i].scrollIntoView({ behavior: reduce ? "auto" : "smooth", inline: "center", block: "nearest" }); });
        dotsWrap.appendChild(b);
      });
      var dots = $$("button", dotsWrap);
      var setActive = function () {
        var center = track.scrollLeft + track.clientWidth / 2;
        var best = 0, bestD = Infinity;
        cards.forEach(function (c, i) {
          var cc = c.offsetLeft + c.clientWidth / 2;
          var d = Math.abs(cc - center);
          if (d < bestD) { bestD = d; best = i; }
        });
        dots.forEach(function (d, i) { d.classList.toggle("is-active", i === best); });
      };
      setActive();
      track.addEventListener("scroll", setActive, { passive: true });
    }

    var arrows = $$(".carousel-arrow", root);
    if (arrows.length) {
      var step = function () { var c = cards[0]; return c ? c.offsetWidth + 24 : track.clientWidth * 0.8; };
      arrows.forEach(function (btn) {
        btn.addEventListener("click", function () {
          var dir = parseInt(btn.getAttribute("data-dir"), 10) || 1;
          // while the section is scroll-jacked, an arrow nudges the PAGE by one card's
          // worth of vertical scroll — which the jack then translates into card motion.
          if (track.classList.contains("is-jacked")) {
            var hmax = track.scrollWidth - track.clientWidth;
            var frac = hmax > 0 ? step() / hmax : 0.16;
            var range = track._jackRange || window.innerHeight;
            window.scrollBy({ top: dir * frac * range, behavior: reduce ? "auto" : "smooth" });
            return;
          }
          track.scrollBy({ left: dir * step(), behavior: reduce ? "auto" : "smooth" });
        });
      });
      var updateArrows = function () {
        var max = track.scrollWidth - track.clientWidth - 2;
        arrows.forEach(function (btn) {
          var dir = parseInt(btn.getAttribute("data-dir"), 10);
          btn.toggleAttribute("disabled", dir < 0 ? track.scrollLeft <= 2 : track.scrollLeft >= max);
        });
      };
      updateArrows();
      track.addEventListener("scroll", updateArrows, { passive: true });
      window.addEventListener("resize", updateArrows);
    }

    var down = false, startX = 0, startLeft = 0, moved = 0;
    track.addEventListener("pointerdown", function (e) { if (track.classList.contains("is-jacked")) return; down = true; moved = 0; startX = e.clientX; startLeft = track.scrollLeft; track.classList.add("is-dragging"); });
    window.addEventListener("pointermove", function (e) { if (!down || track.classList.contains("is-jacked")) return; var dx = e.clientX - startX; moved = Math.abs(dx); track.scrollLeft = startLeft - dx; });
    window.addEventListener("pointerup", function () { down = false; track.classList.remove("is-dragging"); });
    track.addEventListener("click", function (e) { if (moved > 6) e.preventDefault(); }, true);
  });

  /* ---- Recent Looks: scroll-jack the cards horizontally on desktop ----
     The cream panel gets extra height (via .is-jack) so that, once it has
     risen to fill the screen and pinned, there's a stretch of scrolling during
     which we map scroll progress → the carousel's horizontal position. When the
     last card is reached the panel releases and the page continues normally.
     Gated to hover + fine pointer + no reduced-motion; everyone else swipes. */
  (function () {
    var hRoot = $("[data-hscroll]");
    if (!hRoot || reduce) return;
    var hTrack = $(".carousel", hRoot);
    if (!hTrack) return;
    var bar = $(".work-progress span", hRoot);
    var jackMedia = window.matchMedia("(min-width: 900px) and (hover: hover) and (pointer: fine)");
    var active = false, S_start = 0, S_range = 1, H_max = 0, tick = false;

    // robust pin-start (immune to the garbage offsetTop a stuck sticky reports):
    // the non-sticky .stack top plus the heights of the panels before this one.
    function stackTop(panel) {
      var stack = panel.closest(".stack") || panel.parentNode;
      var y = stack.getBoundingClientRect().top + window.scrollY;
      var sib = panel.previousElementSibling;
      while (sib) { y += sib.offsetHeight; sib = sib.previousElementSibling; }
      return y;
    }

    function measure() {
      active = jackMedia.matches;
      hRoot.classList.toggle("is-jack", active);
      hTrack.classList.toggle("is-jacked", active);
      if (!active) { hTrack._jackRange = 0; hTrack.style.scrollLeft = ""; return; }
      S_start = stackTop(hRoot);
      S_range = Math.max(1, hRoot.offsetHeight - window.innerHeight);
      H_max = Math.max(0, hTrack.scrollWidth - hTrack.clientWidth);
      hTrack._jackRange = S_range;
    }
    function frame() {
      tick = false;
      if (!active) return;
      var raw = clamp((window.scrollY - S_start) / S_range, 0, 1);
      var p = clamp(raw / 0.92, 0, 1); // hold the final card briefly before releasing
      hTrack.scrollLeft = p * H_max;
      if (bar) bar.style.width = (p * 100).toFixed(1) + "%";
    }
    function onScroll() { if (active && !tick) { tick = true; requestAnimationFrame(frame); } }

    measure(); frame();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", function () { measure(); frame(); });
    window.addEventListener("load", function () { measure(); frame(); });
    if (jackMedia.addEventListener) jackMedia.addEventListener("change", function () { measure(); frame(); });
  })();

  /* ---- services ledger: the peek card chases the cursor ---- */
  var ledger = $("[data-ledger]");
  var peek = $(".svc-peek");
  if (ledger && peek && fine && !reduce) {
    var panes = $$(".svc-peek__pane", peek);
    var px = 0, py = 0, tx = 0, ty = 0, peekRaf = null, peekOn = false;
    var peekLoop = function () {
      px += (tx - px) * 0.16;
      py += (ty - py) * 0.16;
      peek.style.transform = "translate(" + (px - 115).toFixed(1) + "px," + (py - 85).toFixed(1) + "px)";
      var settled = Math.abs(tx - px) < 0.3 && Math.abs(ty - py) < 0.3;
      if (peekOn || !settled) { peekRaf = requestAnimationFrame(peekLoop); } else { peekRaf = null; }
    };
    // note: .svc-peek uses transform for position; the show/hide scale lives on an inner wrapper-free
    // opacity transition, so we drive left/top via translate only.
    peek.style.willChange = "transform";
    ledger.addEventListener("pointermove", function (e) {
      tx = e.clientX + 40; ty = e.clientY;
      if (!peekRaf) { px = tx; py = ty; peekRaf = requestAnimationFrame(peekLoop); }
    });
    $$(".svcrow", ledger).forEach(function (row) {
      row.addEventListener("pointerenter", function (e) {
        var i = parseInt(row.getAttribute("data-peek"), 10) || 0;
        panes.forEach(function (p, j) { p.classList.toggle("on", j === i); });
        // seed the position at the cursor so it doesn't flash in at the top-left
        // when a row scrolls under a stationary pointer (enter without a prior move)
        tx = e.clientX + 40; ty = e.clientY;
        if (!peekRaf) { px = tx; py = ty; peekRaf = requestAnimationFrame(peekLoop); }
        peekOn = true;
        peek.classList.add("show");
      });
      row.addEventListener("pointerleave", function () {
        peekOn = false;
        peek.classList.remove("show");
      });
    });
  }

  /* ---- stacking step cards: earlier cards sink + dim as the next arrives ---- */
  var stepsWrap = $("[data-steps]");
  if (stepsWrap && !reduce) {
    var stepCards = $$(".step-card", stepsWrap);
    var stepsTick = false;
    var stepsFrame = function () {
      stepsTick = false;
      if (window.innerWidth < 900) { stepCards.forEach(function (c) { c.style.setProperty("--cov", 0); }); return; }
      var vh = window.innerHeight;
      for (var i = 0; i < stepCards.length - 1; i++) {
        var next = stepCards[i + 1].getBoundingClientRect();
        var cov = clamp(1 - (next.top - vh * 0.28) / (vh * 0.62), 0, 1);
        stepCards[i].style.setProperty("--cov", cov.toFixed(3));
      }
    };
    window.addEventListener("scroll", function () {
      if (!stepsTick) { stepsTick = true; requestAnimationFrame(stepsFrame); }
    }, { passive: true });
    window.addEventListener("resize", stepsFrame);
    stepsFrame();
  }

  /* ---- FOLK SHOWCASE: ambient spotlight cycler ----
     One person at a time on the charcoal stage, crossfaded on a gentle timer. The
     timer only runs while the section is on screen (IntersectionObserver) and pauses
     while you hover the figure, so visitors can linger; the dots jump directly.
     Reduced-motion (or a lone person) simply shows the first, with no cycling. */
  (function () {
    var root = $("[data-folk]");
    if (!root) return;
    var persons = $$(".folk-person", root);
    var caps = $$(".folk-cap", root);
    var dots = $$(".folk-dots span", root);
    var N = persons.length;
    if (!N) return;
    var current = 0;

    function show(i) {
      i = ((i % N) + N) % N;
      if (i === current) return;
      current = i;
      persons.forEach(function (p, j) { p.classList.toggle("is-active", j === i); });
      caps.forEach(function (c, j) { c.classList.toggle("is-active", j === i); });
      dots.forEach(function (d, j) { d.classList.toggle("on", j === i); });
    }

    var DWELL = 5500, timer = null, onScreen = false, hovering = false;
    function running() { return onScreen && !hovering; }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function restart() { stop(); if (running()) timer = setInterval(function () { show(current + 1); }, DWELL); }

    // dots jump directly, and reset the dwell so your pick gets a full beat
    dots.forEach(function (d, j) { d.addEventListener("click", function () { show(j); restart(); }); });

    if (reduce || N < 2) { show(0); return; }

    var zone = root.querySelector(".folk-left") || root;
    zone.addEventListener("pointerenter", function () { hovering = true; stop(); });
    zone.addEventListener("pointerleave", function () { hovering = false; restart(); });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        onScreen = entries[0].isIntersecting;
        restart();
      }, { threshold: 0.3 }).observe(root);
    } else {
      onScreen = true; restart();
    }
  })();

  /* ---- custom cursor: disabled — the site uses the normal OS mouse cursor ---- */

  /* ---- magnetic buttons ---- */
  if (fine && !reduce) {
    $$("[data-magnetic]").forEach(function (el) {
      var strength = 0.32;
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var mx = e.clientX - (r.left + r.width / 2);
        var my = e.clientY - (r.top + r.height / 2);
        el.style.transform = "translate(" + (mx * strength).toFixed(1) + "px," + (my * strength).toFixed(1) + "px)";
      });
      el.addEventListener("pointerleave", function () {
        el.style.transition = "transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1)";
        el.style.transform = "";
        setTimeout(function () { el.style.transition = ""; }, 560);
      });
    });
  }

  /* ---- footer wordmark: letters lift on hover ---- */
  $$(".footer__wordmark").forEach(function (wm) {
    var text = wm.textContent;
    wm.textContent = "";
    text.split("").forEach(function (ch) {
      if (ch === " ") { wm.appendChild(document.createTextNode(" ")); return; }
      var s = document.createElement("span");
      s.className = "fl"; s.textContent = ch;
      wm.appendChild(s);
    });
  });

  /* ---- FAQ: single-open accordion ---- */
  var faqItems = $$(".faq__item");
  faqItems.forEach(function (item) {
    item.addEventListener("toggle", function () {
      if (item.open) { faqItems.forEach(function (o) { if (o !== item) o.open = false; }); }
    });
  });

  /* ---- contact form: validation + friendly success ---- */
  var form = $("#contact-form");
  if (form) {
    var success = $("#form-success");
    var validators = {
      name:    function (v) { return v.trim().length >= 2 ? "" : "Please tell us your name."; },
      email:   function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? "" : "Enter a valid email address."; },
      message: function (v) { return v.trim().length >= 10 ? "" : "A sentence or two helps us help you."; }
    };
    function validateField(field) {
      var input = $("input, textarea, select", field);
      if (!input) return true;
      var fn = validators[input.getAttribute("name")];
      if (!fn) return true;
      var err = fn(input.value);
      field.classList.toggle("field--error", !!err);
      var errEl = $(".field__err", field);
      if (errEl && err) errEl.textContent = err;
      return !err;
    }
    $$(".field", form).forEach(function (field) {
      var input = $("input, textarea, select", field);
      if (input) {
        input.addEventListener("blur", function () { validateField(field); });
        input.addEventListener("input", function () { if (field.classList.contains("field--error")) validateField(field); });
      }
    });
    form.addEventListener("submit", function (e) {
      var hp = $(".hp input", form);
      if (hp && hp.value) { e.preventDefault(); return; }
      var ok = true;
      $$(".field", form).forEach(function (field) { if (!validateField(field)) ok = false; });
      if (!ok) {
        e.preventDefault();
        var firstErr = $(".field--error", form);
        if (firstErr) { firstErr.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" }); var fi = $("input, textarea, select", firstErr); if (fi) fi.focus({ preventScroll: true }); }
        return;
      }
      var action = form.getAttribute("action") || "";
      var isLive = action && action.indexOf("REPLACE") === -1;
      if (!isLive) {
        e.preventDefault();
        if (success) { form.style.display = "none"; success.classList.add("show"); success.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" }); }
      }
    });
  }
})();
