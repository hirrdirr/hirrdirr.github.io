// Presentation only: source frames and draw sizes never change enemy hitboxes.
export const ENEMY_SPRITES = {
  normal: {
    src: new URL("../assets/enemies/goblin_walk_4f.png", import.meta.url).href,
    frameWidth: 192,
    frameHeight: 192,
    frames: 4,
    size: 36,
    distancePerFrame: 8, // About 7 frames/second at the basic enemy's base speed.
  },
  tank: {
    src: new URL("../assets/enemies/ogre_walk_4f.png", import.meta.url).href,
    frameWidth: 256,
    frameHeight: 256,
    frames: 4,
    size: 52,
    distancePerFrame: 7, // About 5 frames/second at the tank's base speed.
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
    c.save();
    c.imageSmoothingEnabled = false;
    c.scale(facing, 1);
    c.drawImage(
      sprite.image,
      walkFrame(sprite, enemy.distance) * sprite.frameWidth,
      0,
      sprite.frameWidth,
      sprite.frameHeight,
      -sprite.size / 2,
      -sprite.size / 2,
      sprite.size,
      sprite.size,
    );
    c.restore();
    return true;
  }
}
