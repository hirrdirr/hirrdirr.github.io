import { Renderer } from "./renderer.js";
import { WORLD } from "./data.js";

const TAU = Math.PI * 2;

function drawTowerOutline(c, x, y, color, strong = true) {
  const radius = strong ? 23 : 22;
  c.save();
  c.translate(x, y);

  // Soft continuous halo keeps the tower readable without looking like a UI box.
  c.globalAlpha = strong ? 0.34 : 0.26;
  c.strokeStyle = color;
  c.lineWidth = strong ? 3.2 : 2.6;
  c.shadowColor = color;
  c.shadowBlur = strong ? 8 : 6;
  c.beginPath();
  c.arc(0, 0, radius, 0, TAU);
  c.stroke();

  // Four brighter arc segments give the marker a subtle reticle character.
  c.globalAlpha = strong ? 0.92 : 0.76;
  c.lineWidth = strong ? 1.7 : 1.4;
  c.shadowBlur = 3;
  for (let i = 0; i < 4; i++) {
    const start = -Math.PI / 2 + i * (Math.PI / 2) - 0.24;
    c.beginPath();
    c.arc(0, 0, radius, start, start + 0.48);
    c.stroke();
  }

  c.restore();
}

const originalRender = Renderer.prototype.render;
Renderer.prototype.render = function renderWithTowerSelectionOutline(game, input, elapsed) {
  const c = this.ctx;
  const originalStrokeRect = c.strokeRect;

  // Suppress the legacy 44x44 square around the selected tower only.
  c.strokeRect = function suppressLegacySelection(x, y, w, h) {
    if (w === 44 && h === 44) return;
    return originalStrokeRect.call(this, x, y, w, h);
  };

  let result;
  try {
    result = originalRender.call(this, game, input, elapsed);
  } finally {
    c.strokeRect = originalStrokeRect;
  }

  c.save();
  c.setTransform(
    this.canvas.width / WORLD.width,
    0,
    0,
    this.canvas.height / WORLD.height,
    0,
    0,
  );

  if (game.selected) {
    drawTowerOutline(c, game.selected.x, game.selected.y, "#d3a657", true);
  }

  if (input.placing && input.cursor) {
    const check = game.placement(input.placing, input.cursor.gx, input.cursor.gy),
      x = (input.cursor.gx + 0.5) * WORLD.tile,
      y = (input.cursor.gy + 0.5) * WORLD.tile;
    drawTowerOutline(c, x, y, check.ok ? "#d3a657" : "#cf6657", false);
  }

  c.restore();
  return result;
};
