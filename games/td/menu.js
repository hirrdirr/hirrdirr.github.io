const menu = document.getElementById("td-menu");
const app = document.getElementById("td-app");
const start = document.getElementById("menu-start");
const difficultyButton = document.querySelector('[data-menu-action="difficulty"]');
const message = document.getElementById("menu-message");
let starting = false;
let difficulty = sessionStorage.getItem("tdDifficulty") === "easy" ? "easy" : "normal";

function refreshDifficultyButton(announce = false) {
  const easy = difficulty === "easy";
  difficultyButton.removeAttribute("aria-describedby");
  difficultyButton.setAttribute("aria-label", `Difficulty: ${easy ? "Easy" : "Normal"}`);
  difficultyButton.title = `Difficulty: ${easy ? "Easy" : "Normal"}`;
  if (announce) {
    message.textContent = easy
      ? "Difficulty: Easy — more starting credits, more core integrity and gentler enemies."
      : "Difficulty: Normal — original Core Defense balance.";
  }
}

refreshDifficultyButton();

difficultyButton.addEventListener("click", () => {
  difficulty = difficulty === "normal" ? "easy" : "normal";
  sessionStorage.setItem("tdDifficulty", difficulty);
  refreshDifficultyButton(true);
});

start.addEventListener("click", async () => {
  if (starting) return;
  starting = true;
  start.disabled = true;
  message.textContent = "";
  sessionStorage.setItem("tdDifficulty", difficulty);

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

// Map, settings and Back to Site intentionally have no behavior yet.
