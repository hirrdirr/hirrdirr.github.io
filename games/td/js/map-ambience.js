import { Renderer } from "./renderer.js";
import { WORLD } from "./data.js";
import { ROAD, BLOCKED } from "./map.js";

const TAU = Math.PI * 2;
const LANTERNS = [
  [205, 360], [320, 195], [510, 85], [690, 210],
  [700, 400], [790, 530], [920, 410], [920, 240],
];
const GRASS_PATCHES = [
  [132, 92, 1.0, 0.2],
  [262, 510, 1.15, 1.1],
  [405, 112, 0.9, 2.0],
  [565, 515, 1.05, 2.8],
  [752, 102, 1.1, 3.6],
  [845, 455, 0.95, 4.3],
];

function makeMotes(count, seed = 4242) {
  let state = seed >>> 0;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const motes = [];
  let guard = 0;
  while (motes.length < count && guard++ < count * 40) {
    const x = 30 + random() * (WORLD.width - 60),
      y = 25 + random() * (WORLD.height - 50),
      gx = Math.floor(x / WORLD.tile),
      gy = Math.floor(y / WORLD.tile),
      key = `${gx},${gy}`;
    if (ROAD.has(key) || BLOCKED.has(key)) continue;
    motes.push({
      x,
      y,
      phase: random() * TAU,
      speed: 0.28 + random() * 0.42,
      drift: 5 + random() * 10,
      rise: 4 + random() * 9,
      sway: 2 + random() * 5,
      size: 0.9 + random() * 1.4,
      glow: random() > 0.58,
    });
  }
  return motes;
}

function drawGrassPatch(c, x, y, scale, phase, time, reduced) {
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  c.lineCap = "round";
  const sway = reduced ? 0 : Math.sin(time * 1.25 + phase) * 2.4;
  const blades = [
    [-8, 0, -10, -11],
    [-4, 1, -3, -15],
    [0, 1, 1, -18],
    [4, 1, 7, -14],
    [8, 0, 11, -10],
  ];
  for (let i = 0; i < blades.length; i++) {
    const [x1, y1, x2, y2] = blades[i];
    c.strokeStyle = i % 2 ? "rgba(137,150,88,.28)" : "rgba(95,126,73,.34)";
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(x1, y1);
    c.quadraticCurveTo((x1 + x2) / 2 + sway * (0.45 + i * 0.08), y2 * 0.55, x2 + sway, y2);
    c.stroke();
  }
  c.restore();
}

const originalRender = Renderer.prototype.render;
Renderer.prototype.render = function renderWithMapAmbience(game, input, elapsed) {
  const result = originalRender.call(this, game, input, elapsed);
  const c = this.ctx;
  const time = this.visualTime;

  c.save();
  c.setTransform(
    this.canvas.width / WORLD.width,
    0,
    0,
    this.canvas.height / WORLD.height,
    0,
    0,
  );

  // Keep the existing lantern footprint, but make the light itself feel more alive.
  for (let i = 0; i < LANTERNS.length; i++) {
    const [x, y] = LANTERNS[i],
      slow = Math.sin(time * 2.1 + i * 1.7),
      flicker = Math.sin(time * 6.8 + i * 2.37) * 0.55 + Math.sin(time * 11.3 + i) * 0.2,
      energy = this.reduced ? 0.82 : 0.78 + slow * 0.11 + flicker * 0.045,
      radius = 24 + slow * 1.3;

    const glow = c.createRadialGradient(x, y, 1, x, y, radius);
    glow.addColorStop(0, `rgba(255,224,145,${0.28 + energy * 0.18})`);
    glow.addColorStop(0.34, `rgba(247,180,83,${0.14 + energy * 0.10})`);
    glow.addColorStop(0.72, `rgba(224,133,54,${0.055 + energy * 0.035})`);
    glow.addColorStop(1, "rgba(224,133,54,0)");
    c.fillStyle = glow;
    c.beginPath();
    c.arc(x, y, radius, 0, TAU);
    c.fill();

    // Small hot core so the light reads as a flame rather than a static halo.
    c.save();
    c.globalAlpha = this.reduced ? 0.72 : 0.68 + energy * 0.22;
    c.fillStyle = "#ffd887";
    c.shadowColor = "#ffb44f";
    c.shadowBlur = 7 + energy * 3;
    c.beginPath();
    c.ellipse(
      x + (this.reduced ? 0 : Math.sin(time * 7.4 + i) * 0.55),
      y - 0.4,
      2.4,
      3.2 + (this.reduced ? 0 : Math.max(0, flicker) * 0.55),
      0,
      0,
      TAU,
    );
    c.fill();
    c.restore();

    // Only every second lantern throws a tiny spark now and then, avoiding noise.
    if (!this.reduced && i % 2 === 0) {
      const cycle = (time * 0.62 + i * 0.19) % 1,
        sparkAlpha = Math.max(0, 1 - cycle * 1.35);
      if (sparkAlpha > 0) {
        c.save();
        c.globalAlpha = sparkAlpha * 0.38;
        c.fillStyle = "#f6ca74";
        c.shadowColor = "#f0a84b";
        c.shadowBlur = 4;
        c.beginPath();
        c.arc(x + Math.sin(i + cycle * 7) * 2.6, y - 5 - cycle * 10, 0.9, 0, TAU);
        c.fill();
        c.restore();
      }
    }
  }

  for (const [x, y, scale, phase] of GRASS_PATCHES) {
    drawGrassPatch(c, x, y, scale, phase, time, this.reduced);
  }

  if (!this.reduced) {
    this.mapAmbienceMotes ??= makeMotes(18);
    for (const mote of this.mapAmbienceMotes) {
      const t = time * mote.speed + mote.phase,
        x = mote.x + Math.sin(t * 1.3) * mote.drift + Math.sin(t * 0.47 + mote.phase) * mote.sway,
        y = mote.y + Math.sin(t * 0.9 + mote.phase * 0.6) * mote.rise + Math.sin(t * 1.8 + 1.4) * 1.8,
        alpha = 0.16 + (Math.sin(t * 2.4) * 0.5 + 0.5) * 0.2;
      c.globalAlpha = alpha;
      c.fillStyle = mote.glow ? "#f2c66f" : "#c2c88a";
      c.shadowColor = mote.glow ? "#f2b85f" : "transparent";
      c.shadowBlur = mote.glow ? 5 : 0;
      c.beginPath();
      c.arc(x, y, mote.size, 0, TAU);
      c.fill();
    }

    // A few slow breeze streaks give the open grassland subtle movement.
    c.shadowBlur = 0;
    c.globalAlpha = 0.12;
    c.strokeStyle = "#d7d19a";
    c.lineWidth = 0.8;
    for (let i = 0; i < 5; i++) {
      const y = 70 + i * 112 + Math.sin(time * 0.35 + i) * 16,
        x = ((time * (10 + i * 1.6) + i * 170) % (WORLD.width + 150)) - 100;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + 20 + i * 2, y - 2);
      c.stroke();
    }
  }

  c.restore();
  return result;
};
