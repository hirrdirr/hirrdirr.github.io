// Presentation only: size the desktop shell around the unchanged 8:5 battlefield.
// Measuring real controls also handles wrapped wave previews and placement text.
export function fitGameToViewport(app) {
  const canvas = app.querySelector(".td-canvas-wrap");
  const main = app.closest("main");
  const desktop = window.matchMedia("(min-width: 851px)");
  const property = "--td-canvas-fit-width";
  let pending = false;

  function fit() {
    pending = false;
    if (!desktop.matches || app.hidden) {
      app.style.removeProperty(property);
      return;
    }

    const bounds = app.getBoundingClientRect();
    const controlsHeight = bounds.height - canvas.getBoundingClientRect().height;
    const bottomPadding = parseFloat(getComputedStyle(main).paddingBottom) || 0;
    const viewportHeight = document.documentElement.clientHeight;
    const top = bounds.top + window.scrollY;
    // Very short windows may still scroll, keeping the board and controls usable.
    const height = Math.max(160, viewportHeight - top - controlsHeight - bottomPadding - 4);
    const width = `${Math.floor(height * 1.6)}px`;
    if (app.style.getPropertyValue(property) !== width) {
      app.style.setProperty(property, width);
    }
  }

  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(fit);
  }

  const observer = new ResizeObserver(schedule);
  for (const element of [app, main, document.querySelector(".gh-topbar")]) {
    if (element) observer.observe(element);
  }
  window.addEventListener("resize", () => {
    // Start at full width so a previously wrapped HUD can expand again.
    app.style.removeProperty(property);
    schedule();
  });
  document.fonts.ready.then(schedule);
  fit();
}
