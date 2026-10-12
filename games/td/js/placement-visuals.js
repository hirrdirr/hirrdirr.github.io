import { Renderer } from "./renderer.js";

// Presentation-only polish for free placement. Keep gameplay validation in
// free-placement.js; this module only changes how placement/ranges are drawn.
Renderer.prototype.range = function themedRange(c, t, s, strong = false) {
  c.save();
  c.fillStyle = strong ? "rgba(214,169,87,.07)" : "rgba(139,137,82,.025)";
  c.strokeStyle = strong ? "#d3a657" : "#747a55";
  c.lineWidth = strong ? 1.6 : 0.8;
  c.beginPath();
  c.arc(t.x, t.y, s.range, 0, Math.PI * 2);
  c.fill();
  c.setLineDash([5, 6]);
  c.stroke();
  if (s.minRange) {
    c.fillStyle = "rgba(184,104,78,.055)";
    c.strokeStyle = "#b9755f";
    c.beginPath();
    c.arc(t.x, t.y, s.minRange, 0, Math.PI * 2);
    c.fill();
    c.stroke();
  }
  c.restore();
};

const originalRender = Renderer.prototype.render;

Renderer.prototype.render = function renderWithCleanPlacement(game, input, elapsed) {
  const placing = !!(input.placing && input.cursor);
  if (!placing) return originalRender.call(this, game, input, elapsed);

  const c = this.ctx;
  const check = game.placement(input.placing, input.cursor.gx, input.cursor.gy);
  const originalFillRect = c.fillRect;
  const originalStrokeRect = c.strokeRect;
  const originalDrawImage = c.drawImage;

  // The legacy renderer still draws a 40x40 placement cell. Free placement no
  // longer uses cells, so suppress only those two preview rectangles.
  c.fillRect = function cleanPlacementFill(x, y, w, h) {
    if (w === 40 && h === 40) return;
    return originalFillRect.call(this, x, y, w, h);
  };
  c.strokeRect = function cleanPlacementStroke(x, y, w, h) {
    if (w === 38 && h === 38) return;
    return originalStrokeRect.call(this, x, y, w, h);
  };

  // Keep the tower's own colours/details and blend a warm red warning over the
  // invalid preview instead of replacing the sprite with a flat red silhouette.
  if (!check.ok) {
    c.drawImage = function invalidPlacementSprite(...args) {
      if (this.globalAlpha > 0.64 && this.globalAlpha < 0.66) {
        const previousFilter = this.filter;
        this.filter =
          "sepia(28%) saturate(185%) hue-rotate(318deg) brightness(92%) contrast(108%)";
        try {
          return originalDrawImage.apply(this, args);
        } finally {
          this.filter = previousFilter;
        }
      }
      return originalDrawImage.apply(this, args);
    };
  }

  try {
    return originalRender.call(this, game, input, elapsed);
  } finally {
    c.fillRect = originalFillRect;
    c.strokeRect = originalStrokeRect;
    c.drawImage = originalDrawImage;
  }
};
