// /assets/site.js
// Keeps theme + nav stable, and plays nicely with Lucide icons.
//
// IMPORTANT:
// If you moved lucide.createIcons() into your HTML layout, remove that inline init,
// and let this file handle it (prevents double-renders and timing issues).

(() => {
  const THEME_KEY = "hirrdirr_theme";

  function applyTheme(mode) {
    const isLight = mode === "light";
    document.body.classList.toggle("light", isLight);
    localStorage.setItem(THEME_KEY, isLight ? "light" : "dark");

    // Optional: if you use separate sun/moon icons, fade one out.
    // Works whether Lucide has swapped <i> -> <svg> or not.
    const sun =
      document.getElementById("sun") ||
      document.querySelector(".lucide-sun,[data-lucide='sun']");
    const moon =
      document.getElementById("moon") ||
      document.querySelector(".lucide-moon,[data-lucide='moon']");

    if (sun && moon) {
      sun.style.opacity = isLight ? "1" : "0";
      moon.style.opacity = isLight ? "0" : "1";
    }

    const btn = document.getElementById("themeBtn");
    if (btn) {
      btn.setAttribute(
        "aria-label",
        isLight ? "Switch to dark mode" : "Switch to light mode"
      );
    }
  }

  function initTheme() {
    const btn = document.getElementById("themeBtn");
    const saved = localStorage.getItem(THEME_KEY) || "dark";
    applyTheme(saved);

    if (btn) {
      btn.addEventListener("click", () => {
        const next = document.body.classList.contains("light") ? "dark" : "light";
        applyTheme(next);
      });
    }
  }

  function initActiveNavAndLabel() {
    const path = location.pathname.endsWith("/")
      ? location.pathname
      : location.pathname + "/";

    document.querySelectorAll(".iconbtn[data-route]").forEach((a) => {
      const r = a.getAttribute("data-route");
      if (r === path) a.classList.add("active");
    });

    const label = document.getElementById("pageLabel");
    if (label) {
      // Extend this mapping as you add sections.
      label.textContent = path.startsWith("/games/") ? "games" : "home";
    }
  }

  function initLucide() {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  // Run once DOM is ready. Render Lucide icons first so theme icon tweaks hit the final SVGs.
  window.addEventListener("DOMContentLoaded", () => {
    initLucide();
    initTheme();
    initActiveNavAndLabel();
  });
})();
