import { DIFFICULTIES, resolveDifficulty } from "./js/difficulty.js";

// Only the existing map is selectable. Add future map entries here when playable.
const MAPS = [{ key: "relay-station", name: "Relay Station" }];
const menu = document.getElementById("td-menu");
const app = document.getElementById("td-app");
const start = document.getElementById("menu-start");
const mapSelect = document.getElementById("menu-map");
const difficultySelect = document.getElementById("menu-difficulty");
const optionsButton = document.getElementById("menu-options");
const optionsDialog = document.getElementById("menu-options-dialog");
const optionsDifficulty = document.getElementById("menu-options-difficulty");
const description = document.getElementById("menu-difficulty-description");
const summary = document.getElementById("menu-difficulty-summary");
const message = document.getElementById("menu-message");
let starting = false;
let difficulty = resolveDifficulty(sessionStorage.getItem("tdDifficulty"));

function populateSelect(select, entries) {
  select.replaceChildren(...entries.map(({ key, name }) => new Option(name, key)));
}

populateSelect(mapSelect, MAPS);
for (const select of [difficultySelect, optionsDifficulty]) {
  populateSelect(select, Object.values(DIFFICULTIES));
  select.addEventListener("change", () => {
    difficulty = resolveDifficulty(select.value);
    sessionStorage.setItem("tdDifficulty", difficulty.key);
    refreshDifficulty();
  });
}

function refreshDifficulty() {
  difficultySelect.value = difficulty.key;
  optionsDifficulty.value = difficulty.key;
  description.textContent = difficulty.description;
  summary.textContent = `${difficulty.gold} starting credits · ${difficulty.lives} core integrity`;
}

refreshDifficulty();
optionsButton.addEventListener("click", () => optionsDialog.showModal());

start.addEventListener("click", async () => {
  if (starting) return;
  starting = true;
  start.disabled = true;
  start.textContent = "Starting…";
  message.textContent = "";
  sessionStorage.setItem("tdDifficulty", difficulty.key);
  app.dataset.map = mapSelect.value;

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
    // A module that failed partway through initialization needs a clean reload.
    start.textContent = "Reload to retry";
    start.disabled = false;
    start.onclick = () => window.location.reload();
    message.textContent =
      "The game could not start. Reload this page to try again.";
    console.error("Core Defense could not start:", error);
  }
});
