// Presentation only: source frames and draw sizes never change enemy hitboxes.
const PORTRAIT_WALK_SHEET = { frameWidth: 543, frameHeight: 724, frames: 4 };

export const ENEMY_SPRITES = {
  normal: {
    src: new URL("../assets/enemies/goblin_walk_4f.png", import.meta.url).href,
    frameWidth: 192,
    frameHeight: 192,
    frames: 4,
    size: 36,
    distancePerFrame: 8, // About 7 frames/second at the basic enemy's base speed.
  },
  fast: {
    ...PORTRAIT_WALK_SHEET,
    src: new URL("../assets/enemies/fast_goblin_runner_4f.png", import.meta.url).href,
    crop: { y: 192, height: 392 },
    size: 34,
    distancePerFrame: 10, // About 10 frames/second at base speed.
  },
  swift: {
    ...PORTRAIT_WALK_SHEET,
    src: new URL("../assets/enemies/swift_goblin_scout_4f.png", import.meta.url).href,
    crop: { y: 184, height: 408 },
    size: 30,
    distancePerFrame: 12, // About 12 frames/second at base speed.
  },
  tank: {
    src: new URL("../assets/enemies/ogre_walk_4f.png", import.meta.url).href,
    frameWidth: 256,
    frameHeight: 256,
    frames: 4,
    size: 52,
    distancePerFrame: 7, // About 5 frames/second at the tank's base speed.
  },
  armored: {
    ...PORTRAIT_WALK_SHEET,
    src: new URL("../assets/enemies/armored_orc_4f.png", import.meta.url).href,
    crop: { y: 144, height: 480 },
    size: 44,
    distancePerFrame: 9, // About 6 frames/second at base speed.
  },
  regen: {
    ...PORTRAIT_WALK_SHEET,
    src: new URL("../assets/enemies/regen_goblin_shaman_4f.png", import.meta.url).href,
    crop: { y: 144, height: 448 },
    size: 38,
    distancePerFrame: 9, // About 7 frames/second at base speed.
  },
  elite: {
    ...PORTRAIT_WALK_SHEET,
    src: new URL("../assets/enemies/elite_orc_brute_4f.png", import.meta.url).href,
    crop: { y: 96, height: 584 },
    size: 58,
    distancePerFrame: 9, // About 6 frames/second at base speed.
  },
  boss: {
    ...PORTRAIT_WALK_SHEET,
    src: new URL("../assets/enemies/boss_ogre_warlord_4f.png", import.meta.url).href,
    crop: { y: 72, height: 600 },
    size: 78,
    distancePerFrame: 7, // About 4 frames/second at base speed.
  },
};

export function walkFrame(sprite, distance) {
  // Movement drives the cycle: pause freezes it, slow reduces it, speed scales it.
  return Math.floor(Math.max(0, distance) / sprite.distancePerFrame) % sprite.frames;
}

export function horizontalFacing(angle, previous = 1) {
  const x = Math.cos(angle);
  // Side-view art stays upright; vertical segments retain the last horizontal face.
  return Math.abs(x) < 0.001 ? previous : x < 0 ? -1 : 1;
}

export class EnemySprites {
  constructor(ImageClass = Image) {
    this.loaded = new Map();
    this.facing = new WeakMap();
    this.ready = Promise.all(
      Object.entries(ENEMY_SPRITES).map(([kind, sprite]) =>
        new Promise((resolve) => {
          const image = new ImageClass();
          image.onload = () => {
            if (
              image.naturalWidth !== sprite.frameWidth * sprite.frames ||
              image.naturalHeight !== sprite.frameHeight
            ) {
              console.warn(`Unexpected enemy spritesheet dimensions: ${sprite.src}`);
              resolve(false);
              return;
            }
            this.loaded.set(kind, { ...sprite, image });
            resolve(true);
          };
          image.onerror = () => {
            console.warn(`Could not load enemy spritesheet: ${sprite.src}`);
            resolve(false);
          };
          image.src = sprite.src;
        }),
      ),
    ).then((results) => results.every(Boolean));
  }

  get(kind) {
    return this.loaded.get(kind);
  }

  clear() {
    this.facing = new WeakMap();
  }

  draw(c, enemy, sprite = this.get(enemy.kind)) {
    if (!sprite) return false;
    const facing = horizontalFacing(enemy.angle, this.facing.get(enemy) ?? 1);
    this.facing.set(enemy, facing);
    // Trim transparent frame padding in code, using one stable crop for the cycle.
    // Keep the original aspect ratio; size is the cropped frame's drawn height.
    const {
      x = 0,
      y = 0,
      width = sprite.frameWidth,
      height = sprite.frameHeight,
    } = sprite.crop ?? {};
    const drawWidth = (sprite.size * width) / height;
    c.save();
    c.imageSmoothingEnabled = false;
    c.scale(facing, 1);
    c.drawImage(
      sprite.image,
      walkFrame(sprite, enemy.distance) * sprite.frameWidth + x,
      y,
      width,
      height,
      -drawWidth / 2,
      -sprite.size / 2,
      drawWidth,
      sprite.size,
    );
    c.restore();
    return true;
  }
}
