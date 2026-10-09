import { Game, GameClock } from "./js/engine.js";
import { WORLD } from "./js/data.js";
import { applyDifficulty } from "./js/difficulty.js";
import { Renderer } from "./js/renderer.js";
import { UI } from "./js/ui.js";
const canvas = document.getElementById("c"),
  app = document.getElementById("td-app");
const difficulty = applyDifficulty(sessionStorage.getItem("tdDifficulty"));
app.dataset.difficulty = difficulty.key;
const game = new Game(),
  clock = new GameClock(),
  renderer = new Renderer(canvas);
const input = {
  placing: null,
  cursor: null,
  hoverId: null,
  allRanges: false,
  touch: false,
  keyboard: false,
  shopOpen: false,
};
const ui = new UI(game, input, () => {
  clock.reset();
  renderer.clear();
});
const cursorFrom = (event) => {
  const r = canvas.getBoundingClientRect();
  const x = ((event.clientX - r.left) * WORLD.width) / r.width,
    y = ((event.clientY - r.top) * WORLD.height) / r.height;
  return { gx: Math.floor(x / WORLD.tile), gy: Math.floor(y / WORLD.tile) };
};
const atCursor = () =>
  input.cursor
    ? game.towers.find(
        (t) => t.gx === input.cursor.gx && t.gy === input.cursor.gy,
      )
    : null;
canvas.addEventListener("pointermove", (ev) => {
  if (ev.pointerType === "touch") return;
  input.cursor = cursorFrom(ev);
  input.touch = false;
  input.keyboard = false;
  input.hoverId = atCursor()?.id ?? null;
  ui.refreshPlacement();
});
canvas.addEventListener("pointerleave", () => {
  input.hoverId = null;
  if (!input.touch && !input.keyboard) input.cursor = null;
  ui.refreshPlacement();
});
let down = null;
canvas.addEventListener("pointerdown", (ev) => {
  if (ev.button !== 0) return;
  down = { x: ev.clientX, y: ev.clientY, id: ev.pointerId };
});
canvas.addEventListener("pointercancel", () => {
  down = null;
});
canvas.addEventListener("pointerup", (ev) => {
  if (ev.button !== 0 || !down || down.id !== ev.pointerId) return;
  const moved = Math.hypot(ev.clientX - down.x, ev.clientY - down.y);
  down = null;
  if (moved > 12) return;
  input.touch = ev.pointerType === "touch" || ev.pointerType === "pen";
  input.keyboard = false;
  input.cursor = cursorFrom(ev);
  input.hoverId = null;
  if (game.terminal) return;
  const t = atCursor();
  if (t) {
    input.placing = null;
    game.select(t.id);
    input.shopOpen = false;
    ui.refresh(true);
  } else if (input.placing) {
    if (input.touch) ui.refreshPlacement();
    else ui.place(ev.shiftKey);
  } else {
    game.select(null);
    ui.refresh(true);
  }
});
canvas.addEventListener("contextmenu", (ev) => {
  ev.preventDefault();
  ui.cancel();
});
window.addEventListener("keydown", (ev) => {
  if (document.querySelector(".td-dialog[open]")) return;
  const active = document.activeElement;
  if (active !== document.body && !app.contains(active)) return;
  if (active?.matches('input,select,textarea,[contenteditable="true"]')) return;
  if (ev.key === " " && active?.closest("button,a")) return;
  if (ev.repeat) {
    if (ev.key === " ") ev.preventDefault();
    if (!ev.key.startsWith("Arrow")) return;
  }
  if (ev.key === "Escape") {
    ui.cancel();
    return;
  }
  if (ev.key === " ") {
    ev.preventDefault();
    game.setPaused(!game.paused);
    ui.refresh();
    return;
  }
  if (ev.key.toLowerCase() === "r") {
    input.allRanges = !input.allRanges;
    ui.refresh();
    return;
  }
  if (["1", "2", "3"].includes(ev.key)) {
    game.setSpeed(Number(ev.key));
    ui.refresh();
    return;
  }
  if (active !== canvas || game.terminal) return;
  if (ev.key.startsWith("Arrow")) {
    ev.preventDefault();
    input.keyboard = true;
    input.touch = false;
    input.cursor ??= { gx: 5, gy: 6 };
    const dx = ev.key === "ArrowLeft" ? -1 : ev.key === "ArrowRight" ? 1 : 0,
      dy = ev.key === "ArrowUp" ? -1 : ev.key === "ArrowDown" ? 1 : 0;
    input.cursor.gx = Math.max(0, Math.min(23, input.cursor.gx + dx));
    input.cursor.gy = Math.max(0, Math.min(14, input.cursor.gy + dy));
    ui.refreshPlacement();
  }
  if (ev.key === "Enter") {
    ev.preventDefault();
    if (input.placing) ui.place(ev.shiftKey);
    else {
      game.select(atCursor()?.id ?? null);
      input.shopOpen = false;
      ui.refresh(true);
    }
  }
});
let previous = performance.now(),
  hudTime = 0,
  coreImpact = 0;
document.addEventListener("visibilitychange", () => {
  previous = performance.now();
  clock.reset();
  if (document.hidden) {
    game.setPaused(true);
    ui.refresh();
  }
});
const observer = new ResizeObserver(() => renderer.resize());
observer.observe(canvas.parentElement);
function drawBrandedCore() {
  const c = renderer.ctx,
    critical = game.lives <= 10,
    impact = coreImpact,
    glow = critical ? "#db6a4b" : "#d9a33e",
    bright = critical ? "#f08a63" : "#ffd36a",
    pulse =
      (renderer.reduced ? 0 : Math.sin(renderer.visualTime * 2.4) * 1.2) +
      impact * 3.5,
    scaleX = canvas.width / WORLD.width,
    scaleY = canvas.height / WORLD.height,
    clearX = 900,
    clearY = 267,
    clearW = 60,
    clearH = 66;

  // Restore only the map pixels needed to erase the legacy teal core.
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.drawImage(
    renderer.background,
    clearX * scaleX,
    clearY * scaleY,
    clearW * scaleX,
    clearH * scaleY,
    clearX * scaleX,
    clearY * scaleY,
    clearW * scaleX,
    clearH * scaleY,
  );
  c.restore();

  // Restoring the background covers the final stretch of the road, so redraw
  // every enemy that overlaps the core area. Absorbing enemies additionally
  // shrink and fade while travelling into the crystal.
  c.save();
  c.setTransform(scaleX, 0, 0, scaleY, 0, 0);
  for (const enemy of game.enemies) {
    const inCoreArea =
      enemy.x >= clearX - 40 &&
      enemy.x <= clearX + clearW + 40 &&
      enemy.y >= clearY - 40 &&
      enemy.y <= clearY + clearH + 40;
    if (!inCoreArea) continue;

    const absorbing = enemy.status === "absorbing",
      progress = absorbing ? enemy.absorbProgress ?? 0 : 0,
      scale = absorbing ? Math.max(0.12, 1 - progress * 0.88) : 1,
      alpha = absorbing ? Math.max(0.08, 1 - progress * 0.9) : 1;
    c.save();
    c.globalAlpha = alpha;
    c.translate(enemy.x, enemy.y);
    c.scale(scale, scale);
    c.translate(-enemy.x, -enemy.y);
    renderer.drawEnemy(c, enemy, game);
    c.restore();
  }
  c.restore();

  c.save();
  c.setTransform(scaleX, 0, 0, scaleY, 0, 0);
  c.translate(933, 300);

  // Branded amber crystal inspired by the diamond in the CORE logo.
  c.shadowColor = impact > 0.05 ? "#ff9a45" : glow;
  c.shadowBlur = 14 + impact * 18;
  c.fillStyle = impact > 0.05 ? "#e5a843" : glow;
  c.strokeStyle = bright;
  c.lineWidth = 2 + impact;
  c.beginPath();
  c.moveTo(0, -17 - pulse);
  c.lineTo(15 + pulse * 0.4, 0);
  c.lineTo(0, 17 + pulse);
  c.lineTo(-15 - pulse * 0.4, 0);
  c.closePath();
  c.fill();
  c.stroke();

  c.shadowBlur = 0;
  c.fillStyle = bright;
  c.globalAlpha = 0.75 + impact * 0.2;
  c.beginPath();
  c.moveTo(0, -12 - pulse * 0.5);
  c.lineTo(5 + impact * 2, 0);
  c.lineTo(0, 6 + impact * 2);
  c.lineTo(-3 - impact, 0);
  c.closePath();
  c.fill();
  c.globalAlpha = 1;
  c.restore();
}
function frame(now) {
  const elapsed = Math.max(0, (now - previous) / 1000);
  previous = now;
  clock.advance(game, elapsed);
  const events = game.drainEvents();
  if (events.some((e) => e.type === "leak")) coreImpact = 1;
  else coreImpact = Math.max(0, coreImpact - elapsed * 4.5);
  renderer.accept(events);
  ui.events(events);
  renderer.render(game, input, elapsed);
  drawBrandedCore();
  hudTime += elapsed;
  if (
    hudTime >= 0.1 ||
    events.some((e) =>
      ["wave", "clear", "finish", "build", "upgrade"].includes(e.type),
    )
  ) {
    ui.refresh();
    hudTime = 0;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
