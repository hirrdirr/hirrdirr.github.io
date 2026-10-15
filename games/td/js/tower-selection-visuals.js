import { Renderer } from "./renderer.js";
import { WORLD } from "./data.js";
import { getTowerSprites } from "./tower-sprites.js";

const originalRender = Renderer.prototype.render;
Renderer.prototype.render = function renderWithTowerSelectionOutline(game, input, elapsed) {
  const c = this.ctx;
  const originalStrokeRect = c.strokeRect;
  const originalHoverId = input.hoverId;

  // Suppress the legacy 44x44 square around the selected tower only.
  c.strokeRect = function suppressLegacySelection(x, y, w, h) {
    if (w === 44 && h === 44) return;
    return originalStrokeRect.call(this, x, y, w, h);
  };

  // Renderer hover ranges are purely visual. Temporarily hide hoverId while the
  // base renderer draws so range circles only appear for explicitly selected towers.
  input.hoverId = game.traps.some((trap) => trap.id === originalHoverId) ? originalHoverId : null;

  let result;
  try {
    result = originalRender.call(this, game, input, elapsed);
  } finally {
    input.hoverId = originalHoverId;
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

  const sprites = getTowerSprites();

  // True sprite-contour outline: no ground ring or reticle. The mask is built
  // from the current rendered tower frame, so future upgrade sprites inherit it.
  if (game.selected) {
    sprites.outline(
      c,
      game.selected.kind,
      game.selected.x,
      game.selected.y,
      game.selected.angle,
      game.selected.recoil,
      1,
      true,
      "#d3a657",
      0.95,
    );
  }

  // Hover uses the same silhouette treatment, but only as a faint glint. It is
  // intentionally much thinner and dimmer than the explicit selected state.
  if (!input.placing && originalHoverId && originalHoverId !== game.selectedId) {
    const hovered = game.towers.find((tower) => tower.id === originalHoverId);
    if (hovered) {
      sprites.outline(
        c,
        hovered.kind,
        hovered.x,
        hovered.y,
        hovered.angle,
        hovered.recoil,
        1,
        true,
        "#d3a65766",
        0.5,
      );
    }
  }

  if (input.placing && input.cursor) {
    const check = game.placement(input.placing, input.cursor.gx, input.cursor.gy),
      x = (input.cursor.gx + 0.5) * WORLD.tile,
      y = (input.cursor.gy + 0.5) * WORLD.tile;
    sprites.outline(
      c,
      input.placing,
      x,
      y,
      -Math.PI / 2,
      0,
      1,
      false,
      check.ok ? "#d3a657" : "#cf6657",
      0.9,
    );
  }

  c.restore();
  return result;
};
