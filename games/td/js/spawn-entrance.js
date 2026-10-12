import { Renderer } from "./renderer.js";
import { WORLD } from "./data.js";
import { PATH } from "./map.js";

const stateByRenderer = new WeakMap();

function stateFor(renderer) {
  let state = stateByRenderer.get(renderer);
  if (!state) {
    state = {
      knownEnemies: new Set(),
      pulses: [],
      lastWave: 0,
      lastGameTime: 0,
      serial: 0,
    };
    stateByRenderer.set(renderer, state);
  }
  return state;
}

function addPulse(state, kind) {
  const life = kind === "wave" ? 1.15 : 0.62;
  state.pulses.push({ kind, age: 0, life, seed: state.serial++ });
  if (state.pulses.length > 18) state.pulses.splice(0, state.pulses.length - 18);
}

function updateSpawnState(state, game, elapsed) {
  // A restart resets game time. Clear visual bookkeeping so old IDs never leak
  // into the new run.
  if (game.time + 1e-6 < state.lastGameTime || game.wave === 0) {
    state.knownEnemies.clear();
    state.pulses.length = 0;
    state.lastWave = 0;
  }
  state.lastGameTime = game.time;

  if (game.wave > 0 && game.wave !== state.lastWave) {
    state.lastWave = game.wave;
    addPulse(state, "wave");
  }

  const current = new Set();
  for (const enemy of game.enemies) {
    if (enemy.status === "escaped" || enemy.status === "dead") continue;
    current.add(enemy.id);
    if (!state.knownEnemies.has(enemy.id)) addPulse(state, "spawn");
  }
  state.knownEnemies = current;

  for (const pulse of state.pulses) pulse.age += elapsed;
  state.pulses = state.pulses.filter((pulse) => pulse.age < pulse.life);
}

function drawSpawnEntrance(c, state, reduced) {
  if (!state.pulses.length) return;

  const x = Math.max(26, PATH[0].x + 6);
  const y = PATH[0].y;

  c.save();

  for (const pulse of state.pulses) {
    const t = Math.min(1, pulse.age / pulse.life);
    const fade = Math.sin(Math.PI * t);
    const wave = pulse.kind === "wave";

    // Warm ground rune/pulse. Kept narrow and low-opacity so it reads as an
    // entrance cue rather than another gameplay range indicator.
    c.save();
    c.translate(x, y);
    c.globalAlpha = fade * (wave ? 0.34 : 0.18);
    c.strokeStyle = wave ? "#d3a657" : "#b98755";
    c.lineWidth = wave ? 1.25 : 0.8;
    c.shadowColor = "#c98743";
    c.shadowBlur = wave ? 5 : 2.5;
    c.beginPath();
    c.arc(0, 0, 12 + t * (wave ? 18 : 9), -0.9, 0.9);
    c.stroke();
    c.beginPath();
    c.arc(0, 0, 7 + t * (wave ? 10 : 5), Math.PI - 0.65, Math.PI + 0.65);
    c.stroke();
    c.restore();

    if (reduced) continue;

    // Soft smoke/dust wisps drift inward along the first path segment. They are
    // intentionally dark and translucent so enemy silhouettes stay readable.
    const count = wave ? 4 : 2;
    for (let i = 0; i < count; i++) {
      const phase = pulse.seed * 1.71 + i * 2.19;
      const drift = t * (18 + i * 4);
      const px = x - 13 + drift + Math.sin(phase + t * 2.4) * 4;
      const py = y + Math.cos(phase + t * 2.1) * (8 + i * 2) - t * 5;
      const radius = (wave ? 10 : 7) + t * 5 + i * 1.5;
      const alpha = fade * (wave ? 0.11 : 0.07);
      const gradient = c.createRadialGradient(px, py, 0, px, py, radius);
      gradient.addColorStop(0, `rgba(18,24,22,${alpha})`);
      gradient.addColorStop(0.58, `rgba(40,43,34,${alpha * 0.55})`);
      gradient.addColorStop(1, "rgba(18,24,22,0)");
      c.fillStyle = gradient;
      c.beginPath();
      c.ellipse(px, py, radius * 1.35, radius * 0.75, -0.18, 0, Math.PI * 2);
      c.fill();
    }

    // A few tiny warm motes make individual spawns feel magical without creating
    // a flash for every enemy.
    const motes = wave ? 5 : 2;
    for (let i = 0; i < motes; i++) {
      const phase = pulse.seed * 0.83 + i * 1.91;
      const px = x - 5 + t * (12 + i * 1.5) + Math.sin(phase) * 5;
      const py = y + Math.cos(phase + t * 3) * 9 - t * (5 + i);
      c.globalAlpha = fade * (wave ? 0.28 : 0.15);
      c.fillStyle = "#d7a558";
      c.beginPath();
      c.arc(px, py, wave ? 1.15 : 0.8, 0, Math.PI * 2);
      c.fill();
    }
  }

  c.restore();
}

const originalRender = Renderer.prototype.render;
Renderer.prototype.render = function renderWithSpawnEntrance(game, input, elapsed) {
  const result = originalRender.call(this, game, input, elapsed);
  const state = stateFor(this);
  updateSpawnState(state, game, elapsed);

  if (state.pulses.length) {
    const c = this.ctx;
    c.save();
    c.setTransform(
      this.canvas.width / WORLD.width,
      0,
      0,
      this.canvas.height / WORLD.height,
      0,
      0,
    );
    drawSpawnEntrance(c, state, this.reduced);
    c.restore();
  }

  return result;
};
