import { TOWERS } from "./data.js";

// Presentation only. Source rectangles never change placement or combat geometry.
const SHEET = { frameWidth: 543, frameHeight: 724, frames: 4, size: 48 };
const AIM_PARTS = {
  repeater: { height: 260, pivotX: 340, pivotY: 210, facing: -3.0 },
  sniper: { height: 250, pivotX: 325, pivotY: 205, facing: -2.9 },
  cannon: { height: 340, pivotX: 330, pivotY: 280, facing: -2.8 },
  mortar: {
    x: 148, y: 270, width: 245, height: 185,
    pivotX: 272, pivotY: 365, facing: -Math.PI / 2,
  },
  cryo: { height: 295, pivotX: 270, pivotY: 270, facing: -Math.PI / 2 },
  gatling: { height: 240, pivotX: 285, pivotY: 170, facing: 0.08 },
};

// Uploaded filenames use the existing display names, including case and accents.
export const TOWER_SPRITES = Object.fromEntries(
  Object.entries(TOWERS).map(([kind, tower]) => [kind, {
    ...SHEET,
    src: new URL(`../assets/towers/${tower.name}_4f.png`, import.meta.url).href,
    size: kind === "repeater" ? 46 : kind === "cannon" ? 50 : SHEET.size,
    aimPart: AIM_PARTS[kind], // Relä is a stationary support tower.
  }]),
);

export function firingFrame(recoil) {
  // The engine's existing 1 -> 0 recoil drives the flash and recovery, including
  // pause and game speed. Idle previews never display a muzzle flash.
  return recoil > 2 / 3 ? 2 : recoil > 1 / 3 ? 3 : recoil > 0 ? 1 : 0;
}

export class TowerSprites {
  constructor(ImageClass = Image) {
    this.loaded = new Map();
    this.failed = new Set();
    this.outlineCanvas = null;
    this.outlineCtx = null;
    this.ready = Promise.all(
      Object.entries(TOWER_SPRITES).map(([kind, sprite]) =>
        new Promise((resolve) => {
          let retries = 0;
          const image = new ImageClass();

          image.onload = () => {
            if (
              image.naturalWidth !== sprite.frameWidth * sprite.frames ||
              image.naturalHeight !== sprite.frameHeight
            ) {
              console.warn(`Unexpected tower spritesheet dimensions: ${sprite.src}`);
              this.failed.add(kind);
              resolve(false);
              return;
            }
            this.loaded.set(kind, { ...sprite, image });
            this.failed.delete(kind);
            resolve(true);
          };

          image.onerror = () => {
            if (retries < 1) {
              retries++;
              // A hard refresh can briefly race static asset delivery. Retry once
              // before treating the sprite as genuinely unavailable.
              image.src = `${sprite.src}${sprite.src.includes("?") ? "&" : "?"}retry=1`;
              return;
            }
            console.warn(`Could not load tower spritesheet: ${sprite.src}`);
            this.failed.add(kind);
            resolve(false);
          };

          image.src = sprite.src;
        }),
      ),
    ).then((results) => results.every(Boolean));
  }

  draw(c, kind, x, y, angle = -Math.PI / 2, recoil = 0, scale = 1, aim = true) {
    const sprite = this.loaded.get(kind);

    // All current tower kinds have sprite assets. While an image is still
    // loading, claim the draw so the legacy procedural art never flashes in.
    // Return false only after a real load failure, allowing the old renderer to
    // remain as an emergency fallback.
    if (!sprite) return !this.failed.has(kind) && kind in TOWER_SPRITES;

    const { frameWidth: w, frameHeight: h, size, aimPart } = sprite;
    const frame = aim ? firingFrame(recoil) : 0;
    const factor = size / h;
    const part = (sx, sy, sw, sh, dx = sx - w / 2, dy = sy - h / 2) => {
      if (sw <= 0 || sh <= 0) return;
      c.drawImage(sprite.image, frame * w + sx, sy, sw, sh, dx, dy, sw, sh);
    };
    c.save();
    c.imageSmoothingEnabled = false;
    c.translate(x, y);
    c.scale(scale * factor, scale * factor);
    if (!aim || !aimPart) {
      part(0, 0, w, h);
    } else {
      const {
        x: sx = 0, y: sy = 0, width: sw = w, height: sh,
        pivotX, pivotY, facing,
      } = aimPart;
      // Draw only the sheet pixels outside the moving weapon/crystal. The base
      // stays upright, with no old procedural tower or duplicate sprite below it.
      part(0, 0, w, sy);
      part(0, sy + sh, w, h - sy - sh);
      part(0, sy, sx, sh);
      part(sx + sw, sy, w - sx - sw, sh);
      c.translate(
        pivotX - w / 2 - Math.cos(angle) * recoil * 2 / factor,
        pivotY - h / 2 - Math.sin(angle) * recoil * 2 / factor,
      );
      c.rotate(angle - facing);
      part(sx, sy, sw, sh, sx - pivotX, sy - pivotY);
    }
    c.restore();
    return true;
  }

  ensureOutlineCanvas() {
    if (this.outlineCanvas && this.outlineCtx) return true;
    if (typeof document === "undefined") return false;

    this.outlineCanvas = document.createElement("canvas");
    this.outlineCanvas.width = 112;
    this.outlineCanvas.height = 112;
    this.outlineCtx = this.outlineCanvas.getContext("2d");
    return !!this.outlineCtx;
  }

  outline(c, kind, x, y, angle = -Math.PI / 2, recoil = 0, scale = 1, aim = true, color = "#d3a657", width = 2) {
    if (!this.loaded.has(kind) || !this.ensureOutlineCanvas()) return false;

    const oc = this.outlineCanvas;
    const o = this.outlineCtx;
    const cx = oc.width / 2;
    const cy = oc.height / 2;
    o.setTransform(1, 0, 0, 1, 0, 0);
    o.clearRect(0, 0, oc.width, oc.height);
    o.globalCompositeOperation = "source-over";
    o.globalAlpha = 1;
    o.filter = "none";
    o.shadowBlur = 0;

    // Render the current tower frame to an offscreen alpha mask. This keeps the
    // outline attached to the actual PNG silhouette, including rotating parts.
    this.draw(o, kind, cx, cy, angle, recoil, scale, aim);
    o.globalCompositeOperation = "source-in";
    o.fillStyle = color;
    o.fillRect(0, 0, oc.width, oc.height);
    o.globalCompositeOperation = "source-over";

    c.save();
    c.globalAlpha = 0.92;
    c.shadowColor = color;
    c.shadowBlur = 3;
    const steps = 12;
    for (let i = 0; i < steps; i++) {
      const a = (i * Math.PI * 2) / steps;
      const dx = Math.cos(a) * width;
      const dy = Math.sin(a) * width;
      c.drawImage(oc, x - cx + dx, y - cy + dy);
    }
    c.restore();
    return true;
  }
}

let sharedSprites;
export function getTowerSprites() {
  return sharedSprites ??= new TowerSprites();
}
