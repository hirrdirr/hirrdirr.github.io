const menu = document.getElementById("td-menu");
const app = document.getElementById("td-app");
const start = document.getElementById("menu-start");
const message = document.getElementById("menu-message");
let starting = false;

start.addEventListener("click", async () => {
  if (starting) return;
  starting = true;
  start.disabled = true;
  message.textContent = "";

  // The existing renderer measures the visible canvas during initialization.
  app.hidden = false;
  menu.hidden = true;
  try {
    await import("./td.js");
    menu.remove();
    document.getElementById("c").focus({ preventScroll: true });
  } catch (error) {
    app.hidden = true;
    menu.hidden = false;
    message.textContent =
      "The game could not start. Reload this page to try again.";
    console.error("Core Defense could not start:", error);
  }
});

// Other data-menu-action buttons intentionally have no behavior yet.
