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
  hudTime = 0;
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
function drawAbsorbFx() {
  const absorbing = game.enemies.filter((e) => e.status === "absorbing");
  if (!absorbing.length) return;
  const c = renderer.ctx,
    scaleX = canvas.width / WORLD.width,
    scaleY = canvas.height / WORLD.height,
    coreX = 933,
    coreY = 300;
  c.save();
  c.setTransform(scaleX, 0, 0, scaleY, 0, 0);
  for (const enemy of absorbing) {
    const progress = enemy.absorbProgress ?? 0,
      fadeProgress = Math.max(0, (progress - 0.55) / 0.45),
      scaleProgress = Math.max(0, (progress - 0.35) / 0.65),
      enemyScale = Math.max(0.2, 1 - scaleProgress * 0.8),
      enemyAlpha = Math.max(0.24, 1 - fadeProgress * 0.76),
      glowAlpha = Math.max(0.18, 0.7 * (1 - progress));

    c.save();
    c.globalAlpha = glowAlpha;
    c.strokeStyle = "#f0a84b";
    c.lineWidth = 2.4;
    c.shadowColor = "#ffb454";
    c.shadowBlur = 10;
    c.beginPath();
    c.moveTo(enemy.x, enemy.y);
    c.lineTo(coreX, coreY);
    c.stroke();
    c.shadowBlur = 0;

    c.globalAlpha = 0.55 * (1 - progress * 0.65);
    c.strokeStyle = "#ffd36a";
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(enemy.x, enemy.y, 9 + (1 - progress) * 7, 0, Math.PI * 2);
    c.stroke();

    for (let i = 1; i <= 3; i++) {
      const travel = (i / 4 + renderer.visualTime * 1.8) % 1,
        x = enemy.x + (coreX - enemy.x) * travel,
        y = enemy.y + (coreY - enemy.y) * travel;
      c.globalAlpha = 0.25 + 0.45 * (1 - progress);
      c.fillStyle = "#ffd36a";
      c.beginPath();
      c.arc(x, y, 1.6 + (1 - travel) * 1.2, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();

    c.save();
    c.globalAlpha = enemyAlpha;
    c.shadowColor = "#ffb454";
    c.shadowBlur = 8 + (1 - progress) * 6;
    c.translate(enemy.x, enemy.y);
    c.scale(enemyScale, enemyScale);
    c.translate(-enemy.x, -enemy.y);
    renderer.drawEnemy(c, enemy, game);
    c.restore();
  }
  c.restore();
}
function frame(now) {
  const elapsed = Math.max(0, (now - previous) / 1000);
  previous = now;
  clock.advance(game, elapsed);
  const events = game.drainEvents();
  renderer.accept(events);
  ui.events(events);
  renderer.render(game, input, elapsed);
  drawAbsorbFx();
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
