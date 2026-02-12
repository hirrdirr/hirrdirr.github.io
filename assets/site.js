// /assets/site.js
// Hirrdirr site helpers: Lucide init, theme toggle, and active topbar buttons.
(() => {
  const THEME_KEY = "hirrdirr_theme";

  const normPath = (p) => {
    if (!p) return "/";
    // Keep trailing slash for directory-style routes
    if (p === "/") return "/";
    return p.endsWith("/") ? p : p + "/";
  };

  const getPreferredTheme = () => {
    // If user has chosen before, respect it.
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;

    // Otherwise, follow OS preference.
    try {
      return window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark";
    } catch {
      return "dark";
    }
  };

  const setTheme = (mode) => {
    const isLight = mode === "light";
    document.body.classList.toggle("light", isLight);
    localStorage.setItem(THEME_KEY, isLight ? "light" : "dark");

    // Toggle the theme icons (works whether they're <i> placeholders or <svg> after Lucide)
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
      btn.title = isLight ? "Switch to dark mode" : "Switch to light mode";
    }
  };

  const initTheme = () => {
    const btn = document.getElementById("themeBtn");
    setTheme(getPreferredTheme());

    if (btn) {
      btn.addEventListener("click", () => {
        const next = document.body.classList.contains("light") ? "dark" : "light";
        setTheme(next);
      });
    }
  };

  const initActiveNav = () => {
    const path = normPath(location.pathname);

    document.querySelectorAll(".iconbtn[data-route]").forEach((a) => {
      const r = normPath(a.getAttribute("data-route"));
      if (r === path) a.classList.add("active");
      else a.classList.remove("active");
    });

    // Optional breadcrumb fallback: only change if it's empty/missing
    const label = document.getElementById("pageLabel");
    if (label && !label.textContent.trim()) {
      if (path.startsWith("/games/")) label.textContent = "games";
      else if (path.startsWith("/videos/")) label.textContent = "videos";
      else label.textContent = "home";
    }
  };

  const initLucide = () => {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  };

  // Run once the DOM is ready, in an order that keeps theme icons consistent:
  // 1) Render Lucide icons (so placeholders become SVG)
  // 2) Apply theme (so sun/moon opacity hits the final elements)
  // 3) Mark active nav
  window.addEventListener("DOMContentLoaded", () => {
    initLucide();
    initTheme();
    initActiveNav();
  });
})();
