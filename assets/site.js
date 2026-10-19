// Site navigation, theme preference and the shared header's rendered height.
(() => {
  const THEME_KEY = "hirrdirr_theme";
  const normPath = (path) => path.replace(/index\.html$/, "").replace(/\/?$/, "/");

  function preferredTheme() {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === "light" || saved === "dark") return saved;
    } catch { /* Storage can be blocked; the controls must still work. */ }
    return "dark";
  }

  function setTheme(mode) {
    const isLight = mode === "light";
    document.body.classList.toggle("light", isLight);
    try { localStorage.setItem(THEME_KEY, mode); } catch { /* Session-only choice. */ }
    const button = document.getElementById("themeBtn");
    if (button) {
      button.setAttribute("aria-label", isLight ? "Byt till mörkt tema" : "Byt till ljust tema");
      button.title = button.getAttribute("aria-label");
    }
  }

  function initNavigation() {
    const path = normPath(location.pathname);
    document.querySelectorAll(".pixel-navigation a[data-route]").forEach((link) => {
      const route = normPath(link.dataset.route);
      const active = route === "/" ? path === route : path.startsWith(route);
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", path === route ? "page" : "location");
      else link.removeAttribute("aria-current");
    });
  }

  function observeHeader() {
    const header = document.querySelector(".pixel-topbar");
    if (!header) return;
    const measure = () => document.documentElement.style.setProperty(
      "--site-header-height", `${header.getBoundingClientRect().height}px`
    );
    measure();
    if (window.ResizeObserver) new ResizeObserver(measure).observe(header);
    else window.addEventListener("resize", measure);
  }

  const initIcons = () => { if (window.lucide?.createIcons) window.lucide.createIcons(); };
  document.getElementById("site-icons")?.addEventListener("load", initIcons);

  window.addEventListener("DOMContentLoaded", () => {
    initIcons();
    setTheme(preferredTheme());
    document.getElementById("themeBtn")?.addEventListener("click", () => {
      setTheme(document.body.classList.contains("light") ? "dark" : "light");
    });
    initNavigation();
    observeHeader();
  });
})();
