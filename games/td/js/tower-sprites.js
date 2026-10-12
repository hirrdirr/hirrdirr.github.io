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
    this.ready = Promise.all(
      Object.entries(TOWER_SPRITES).map(([kind, sprite]) =>
        new Promise((resolve) => {
          const image = new ImageClass();
          image.onload = () => {
            if (
              image.naturalWidth !== sprite.frameWidth * sprite.frames ||
              image.naturalHeight !== sprite.frameHeight
            ) {
              console.warn(`Unexpected tower spritesheet dimensions: ${sprite.src}`);
              resolve(false);
              return;
            }
            this.loaded.set(kind, { ...sprite, image });
            resolve(true);
          };
          image.onerror = () => {
            console.warn(`Could not load tower spritesheet: ${sprite.src}`);
            resolve(false);
          };
          image.src = sprite.src;
        }),
      ),
    ).then((results) => results.every(Boolean));
  }

  draw(c, kind, x, y, angle = -Math.PI / 2, recoil = 0, scale = 1, aim = true) {
    const sprite = this.loaded.get(kind);
    if (!sprite) return false;
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
}

let sharedSprites;
export function getTowerSprites() {
  return sharedSprites ??= new TowerSprites();
}
