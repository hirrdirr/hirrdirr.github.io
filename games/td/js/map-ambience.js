import { Renderer } from "./renderer.js";
import { WORLD } from "./data.js";
import { ROAD, BLOCKED } from "./map.js";

const TAU = Math.PI * 2;
const LANTERNS = [
  [205, 360], [320, 195], [510, 85], [690, 210],
  [700, 400], [790, 530], [920, 410], [920, 240],
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
      rise: 2 + random() * 5,
      size: 0.9 + random() * 1.4,
      glow: random() > 0.58,
    });
  }
  return motes;
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

  // Lantern glow breathes very gently; the static lamp art still lives in map-theme.js.
  for (let i = 0; i < LANTERNS.length; i++) {
    const [x, y] = LANTERNS[i],
      pulse = this.reduced ? 0.82 : 0.72 + Math.sin(time * 2.15 + i * 1.7) * 0.1,
      radius = 18 + pulse * 8;
    const glow = c.createRadialGradient(x, y, 1, x, y, radius);
    glow.addColorStop(0, `rgba(255,214,120,${0.16 + pulse * 0.08})`);
    glow.addColorStop(0.42, `rgba(241,168,72,${0.08 + pulse * 0.04})`);
    glow.addColorStop(1, "rgba(241,168,72,0)");
    c.fillStyle = glow;
    c.beginPath();
    c.arc(x, y, radius, 0, TAU);
    c.fill();
  }

  if (!this.reduced) {
    this.mapAmbienceMotes ??= makeMotes(18);
    for (const mote of this.mapAmbienceMotes) {
      const t = time * mote.speed + mote.phase,
        x = mote.x + Math.sin(t * 1.3) * mote.drift,
        y = mote.y - ((time * mote.rise + mote.phase * 7) % 28) + 14,
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
