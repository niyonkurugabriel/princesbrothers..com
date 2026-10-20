/* =========================================================
   ORGANIC 3D — pointer tilt
   Include once, right before </body>, on every page. It finds
   every .organic-card-3d automatically, so you never call it
   by hand — new product cards added later work for free.
   Skips touch devices and users who asked for reduced motion.
   ========================================================= */
(function () {
  var prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  var isTouch = window.matchMedia("(hover: none)").matches;
  if (prefersReducedMotion || isTouch) return;

  var MAX_TILT = 6; // degrees — keep subtle, not a fairground ride

  function bind(card) {
    card.addEventListener("mousemove", function (e) {
      var rect = card.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width;  // 0 -> 1
      var y = (e.clientY - rect.top) / rect.height;  // 0 -> 1
      var rotateY = (x - 0.5) * MAX_TILT * 2;
      var rotateX = (0.5 - y) * MAX_TILT * 2;


      
      card.classList.add("is-tilting");
      card.style.transform =
        "translateY(-8px) rotateX(" + rotateX + "deg) rotateY(" + rotateY + "deg)";
    });

    card.addEventListener("mouseleave", function () {
      card.classList.remove("is-tilting");
      card.style.transform = "";
    });
  }

  // --- cursor spotlight for glass panels, glass buttons, and sections ---
  // sets --mx / --my (percentages) that the CSS radial-gradients read
  function bindSpotlight(el) {
    el.addEventListener("mousemove", function (e) {
      var rect = el.getBoundingClientRect();
      var mx = ((e.clientX - rect.left) / rect.width) * 100;
      var my = ((e.clientY - rect.top) / rect.height) * 100;
      el.style.setProperty("--mx", mx + "%");
      el.style.setProperty("--my", my + "%");
    });
  }

  // --- navbar: adds .is-scrolled past 40px so it reads as "lifted" glass ---
  function bindNavbarScroll(nav) {
    var toggle = function () {
      nav.classList.toggle("is-scrolled", window.scrollY > 40);
    };
    window.addEventListener("scroll", toggle, { passive: true });
    toggle();
  }

  function init() {
    document.querySelectorAll(".organic-card-3d").forEach(bind);
    document
      .querySelectorAll(".organic-glass, .organic-glass-dark, .btn-3d.btn-glass, .organic-section-3d")
      .forEach(bindSpotlight);
    document.querySelectorAll(".organic-navbar-3d").forEach(bindNavbarScroll);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
