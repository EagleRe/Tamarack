(function () {
  "use strict";

  var data = window.__BRAND__ || {};
  var root = document.documentElement;

  // ---------- helpers ----------
  var $ = function (sel, scope) { return (scope || document).querySelector(sel); };
  var $$ = function (sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); };
  var escHTML = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  function safe(fn, name) { try { fn(); } catch (e) { console.warn("[" + name + "]", e); } }
  var hasDialog = typeof window.HTMLDialogElement === "function" &&
    typeof document.createElement("dialog").showModal === "function";

  // ---------- nav: solid background after scrolling ----------
  function initNav() {
    var nav = $("[data-nav]");
    if (!nav) return;
    var onScroll = function () { nav.classList.toggle("is-solid", window.scrollY > 24); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  // ---------- reveal on scroll (threshold ≤ 0.05 + safety timeout) ----------
  function initReveals() {
    var els = $$(".reveal");
    if (!els.length) return;
    if (!("IntersectionObserver" in window)) { els.forEach(function (el) { el.classList.add("is-in"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.05, rootMargin: "0px 0px -6% 0px" });
    els.forEach(function (el) { io.observe(el); });
    setTimeout(function () { els.forEach(function (el) { el.classList.add("is-in"); }); }, 6000);
  }

  // ---------- mobile "Make an offer" bar ----------
  function initOfferBar() {
    var bar = $("[data-offer-bar]");
    var hero = $(".hero");
    var offer = $("#offer");
    if (!bar || !hero) return;
    var offerVisible = false;
    if (offer && "IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        offerVisible = entries[0].isIntersecting;
        update();
      }, { threshold: 0.05 }).observe(offer);
    }
    function update() {
      var past = window.scrollY > hero.offsetHeight * 0.55;
      bar.classList.toggle("is-visible", past && !offerVisible);
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  // ---------- footer: optional public contact + year ----------
  function initFooter() {
    var y = $("[data-year]");
    if (y) y.textContent = String(new Date().getFullYear());
    var c = data.contact || {};
    var slot = $("[data-contact]");
    if (!slot || (!c.phone && !c.email)) return;
    var parts = [];
    if (c.phone) parts.push('<a href="tel:' + escHTML(c.phone.replace(/[^0-9+]/g, "")) + '">' + escHTML(c.phone) + "</a>");
    if (c.email) parts.push('<a href="mailto:' + escHTML(c.email) + '">' + escHTML(c.email) + "</a>");
    slot.innerHTML = "Questions? Contact " + escHTML(data.contactName || "us") + ": " + parts.join(" · ");
  }

  // ---------- gallery lightbox ----------
  function initLightbox() {
    var lb = $("#lightbox");
    var tiles = $$("[data-gallery] .tile");
    if (!lb || !tiles.length || !hasDialog) return; // without it, tiles simply open the image

    var img = $(".lb-img", lb), text = $(".lb-text", lb), count = $(".lb-count", lb);
    var items = tiles.map(function (a) {
      var im = $("img", a);
      return { src: a.getAttribute("href"), caption: a.getAttribute("data-caption") || "", alt: im ? im.alt : "" };
    });
    var index = 0;
    var pad = function (n) { return (n < 10 ? "0" : "") + n; };

    function show(i) {
      index = (i + items.length) % items.length;
      var it = items[index];
      img.src = it.src;
      img.alt = it.alt;
      text.textContent = it.caption;
      count.textContent = pad(index + 1) + " / " + pad(items.length);
      [index + 1, index - 1].forEach(function (k) {         // preload neighbours
        var n = items[(k + items.length) % items.length];
        var pre = new Image(); pre.src = n.src;
      });
    }

    tiles.forEach(function (a, i) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        show(i);
        lb.showModal();
      });
    });
    $(".lb-prev", lb).addEventListener("click", function () { show(index - 1); });
    $(".lb-next", lb).addEventListener("click", function () { show(index + 1); });
    $(".lb-close", lb).addEventListener("click", function () { lb.close(); });
    lb.addEventListener("click", function (e) { if (e.target === lb) lb.close(); });
    lb.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); show(index + 1); }
      if (e.key === "ArrowLeft")  { e.preventDefault(); show(index - 1); }
    });

    // swipe on touch
    var x0 = null;
    img.addEventListener("pointerdown", function (e) { x0 = e.clientX; });
    img.addEventListener("pointerup", function (e) {
      if (x0 == null) return;
      var dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) show(index + (dx < 0 ? 1 : -1));
    });
  }

  // ---------- offer dialog: every "Make an offer" button opens the form ----------
  function initOfferDialog() {
    var dialog = $("#offerDialog");
    var card = $("#offerCard");
    var home = $("[data-offer-home]");
    var body = dialog ? $("[data-offer-dialog-body]", dialog) : null;
    if (!dialog || !card || !home || !body || !hasDialog) return; // fallback: buttons scroll to #offer

    function open(e) {
      if (e) e.preventDefault();
      body.appendChild(card);          // move the single form into the dialog
      dialog.showModal();
      var success = $(".offer-success", card);
      var first = success && !success.hidden ? success : $("input[name=name]", card);
      if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 60);
    }
    dialog.addEventListener("close", function () { home.appendChild(card); });
    dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); });
    $("[data-offer-close]", dialog).addEventListener("click", function () { dialog.close(); });
    $$("[data-offer-open]").forEach(function (btn) { btn.addEventListener("click", open); });
  }

  // ---------- offer form ----------
  function initOfferForm() {
    var form = $("#offerForm");
    if (!form) return;
    var card = $("#offerCard");
    var status = $(".form-status", form);
    var success = $(".offer-success", card);
    var startedAt = Date.now();
    var offerCfg = data.offer || {};
    var mode = offerCfg.mode || "php";                       // "php" (own server) or "web3forms" (static hosting)
    var endpoint = offerCfg.endpoint || form.getAttribute("action") || "offer.php";
    var accessKey = offerCfg.accessKey || "";
    var propertyAddress = (data.property && data.property.address) || "";

    // money inputs: digits only, formatted with commas
    $$("[data-money]", form).forEach(function (inp) {
      inp.addEventListener("input", function () {
        var digits = inp.value.replace(/[^0-9]/g, "").slice(0, 9);
        inp.value = digits ? Number(digits).toLocaleString("en-US") : "";
      });
    });

    function setErr(name, msg) {
      var slot = $('[data-err="' + name + '"]', form);
      if (slot) slot.textContent = msg || "";
      var field = form.elements[name];
      var wrap = field && field.closest ? field.closest(".field") : null;
      if (wrap) wrap.classList.toggle("has-error", !!msg);
    }
    var num = function (v) { return Number(String(v || "").replace(/[^0-9.]/g, "")) || 0; };

    function validate() {
      var f = form.elements, ok = true, first = null;
      function check(name, cond, msg) {
        setErr(name, cond ? "" : msg);
        if (!cond) { ok = false; if (!first) first = f[name]; }
      }
      check("name", f.name.value.trim().length >= 2, "Please enter your name.");
      check("phone", f.phone.value.replace(/[^0-9]/g, "").length >= 10, "Please enter a phone number with area code.");
      check("email", /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.value.trim()), "Please enter a valid email.");
      check("offer", num(f.offer.value) >= 1000, "Please enter your offer amount.");
      check("funding", !!f.funding.value, "Please choose how you're funding it.");
      check("consent", f.consent.checked, "Please check this box so " + (data.contactName || "we") + " can contact you.");
      if (first && first.focus) first.focus();
      return ok;
    }

    function showStatus(msg) { status.textContent = msg || ""; }

    function fallbackMsg() {
      var c = data.contact || {};
      var extra = c.phone ? " or call " + c.phone : (c.email ? " or email " + c.email : "");
      return "Your offer couldn't be sent right now. Please try again in a minute" + extra + ".";
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      showStatus("");
      if (!validate()) return;

      if (location.protocol === "file:") {
        showStatus("Preview mode: offers are emailed once the site is online on your hosting.");
        return;
      }

      var f = form.elements;
      var offerAmount = num(f.offer.value);
      var emdAmount = num(f.emd.value);
      var usd = function (n) { return n ? "$" + Number(n).toLocaleString("en-US") : "—"; };
      var body;

      if (mode === "web3forms") {
        if (!accessKey || accessKey.indexOf("PASTE") === 0) {
          showStatus("The offer form isn't connected yet — add the access key in lib/manifest.js.");
          return;
        }
        if (f.website.value) { form.hidden = true; success.hidden = false; return; }   // spam trap
        body = {
          access_key: accessKey,
          subject: "New offer " + usd(offerAmount) + " - " + propertyAddress + " - " + f.name.value.trim(),
          from_name: (data.name || "Property site"),
          replyto: f.email.value.trim(),
          botcheck: "",
          Property: propertyAddress,
          "Offer price": usd(offerAmount),
          Funding: f.funding.value,
          "Earnest money": usd(emdAmount),
          "Target closing": f.close.value,
          "Proof of funds": f.pof.checked ? "Yes, available on request" : "Not indicated",
          Name: f.name.value.trim(),
          Email: f.email.value.trim(),
          Phone: f.phone.value.trim(),
          Notes: f.notes.value.trim() || "—",
          "Agreed to be contacted": f.consent.checked ? "Yes" : "No"
        };
      } else {
        body = {
          name: f.name.value.trim(),
          phone: f.phone.value.trim(),
          email: f.email.value.trim(),
          offer: offerAmount,
          funding: f.funding.value,
          emd: emdAmount || null,
          close: f.close.value,
          notes: f.notes.value.trim(),
          pof: f.pof.checked,
          consent: f.consent.checked,
          website: f.website.value,        // spam trap
          t: Date.now() - startedAt         // time spent on the page before sending
        };
      }

      form.classList.add("is-sending");
      var ctrl = "AbortController" in window ? new AbortController() : null;
      var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 20000) : null;

      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl ? ctrl.signal : undefined
      })
        .then(function (r) { return r.json().catch(function () { return { ok: false, success: false, reason: "bad_response" }; }); })
        .then(function (res) {
          if (res && (res.ok || res.success)) {
            form.hidden = true;
            success.hidden = false;
            success.focus();
          } else {
            showStatus((res && res.message) || fallbackMsg());
          }
        })
        .catch(function () { showStatus(fallbackMsg()); })
        .then(function () {
          if (timer) clearTimeout(timer);
          form.classList.remove("is-sending");
        });
    });

    var again = $("[data-offer-again]", card);
    if (again) again.addEventListener("click", function () {
      form.reset();
      $$(".err", form).forEach(function (el) { el.textContent = ""; });
      $$(".has-error", form).forEach(function (el) { el.classList.remove("has-error"); });
      success.hidden = true;
      form.hidden = false;
      startedAt = Date.now();
      var first = form.elements.name; if (first) first.focus();
    });
  }

  function boot() {
    safe(initNav, "initNav");
    safe(initReveals, "initReveals");
    safe(initOfferBar, "initOfferBar");
    safe(initFooter, "initFooter");
    safe(initLightbox, "initLightbox");
    safe(initOfferDialog, "initOfferDialog");
    safe(initOfferForm, "initOfferForm");
    root.classList.add("is-ready");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
