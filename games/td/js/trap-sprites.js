import { TRAPS } from "./traps.js";

// The uploaded artwork is NOT four equal 543px cells: the first silhouette
// crosses that boundary. These measured crops isolate the four drawings and
// remove faint transparent padding without editing the source PNG.
export const SPIKE_SPRITE = Object.freeze({
  src: new URL("../assets/towers/spiketrap-sprite-sheet.png", import.meta.url).href,
  width: 2172, height: 724, drawWidth: 38, anchorY: 525,
  frames: [
    { x: 55, y: 127, width: 534, height: 485 },
    { x: 609, y: 178, width: 489, height: 429 },
    { x: 1129, y: 267, width: 497, height: 344 },
    { x: 1646, y: 382, width: 507, height: 227 },
  ],
});

export function trapFrame(trap, time) {
  const elapsed = trap.triggeredAt === null ? Infinity : time - trap.triggeredAt;
  const duration = TRAPS[trap.kind].attackTime;
  if (elapsed >= duration || elapsed < 0) return 3;
  // Overlap refreshes triggeredAt, holding the raised pose while dealing damage.
  // Retract after contact; animation never gates damage or HP consumption.
  return elapsed < duration / 2 ? 0 : elapsed < duration * 5 / 6 ? 1 : 2;
}

export class TrapSprites {
  constructor(ImageClass = Image) {
    this.image = null;
    this.failed = false;
    this.ready = new Promise((resolve) => {
      const image = new ImageClass();
      let retries = 0;
      image.onload = () => {
        if (image.naturalWidth !== SPIKE_SPRITE.width ||
            image.naturalHeight !== SPIKE_SPRITE.height) {
          this.failed = true;
          console.warn(`Unexpected trap spritesheet dimensions: ${SPIKE_SPRITE.src}`);
          resolve(false);
          return;
        }
        this.image = image;
        resolve(true);
      };
      image.onerror = () => {
        if (retries++ === 0) {
          image.src = `${SPIKE_SPRITE.src}?retry=1`;
          return;
        }
        this.failed = true;
        console.warn(`Could not load trap spritesheet: ${SPIKE_SPRITE.src}`);
        resolve(false);
      };
      image.src = SPIKE_SPRITE.src;
    });
  }

  draw(c, trap, time, x = trap.x, y = trap.y, scale = 1, icon = false) {
    if (!TRAPS[trap.kind]) return false;
    if (!this.image) return !this.failed; // No procedural-art flash during loading.
    const frame = SPIKE_SPRITE.frames[icon ? 0 : trapFrame(trap, time)];
    const factor = SPIKE_SPRITE.drawWidth / SPIKE_SPRITE.frames[0].width;
    const width = frame.width * factor, height = frame.height * factor;
    c.save();
    c.imageSmoothingEnabled = false;
    c.translate(x, y);
    c.scale(scale, scale);
    c.drawImage(this.image, frame.x, frame.y, frame.width, frame.height,
      -width / 2, icon ? -height / 2 : (frame.y - SPIKE_SPRITE.anchorY) * factor,
      width, height);
    c.restore();
    return true;
  }
}

let sharedSprites;
export function getTrapSprites() {
  return sharedSprites ??= new TrapSprites();
}

export function drawTrap(c, trap, time, x = trap.x, y = trap.y, scale = 1, icon = false) {
  if (getTrapSprites().draw(c, trap, time, x, y, scale, icon)) return;
  // Emergency image-failure fallback only. Loaded artwork always bypasses this.
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  c.fillStyle = "#69533b";
  c.fillRect(-16, -4, 32, 9);
  c.fillStyle = "#b6b8ad";
  if (icon || trapFrame(trap, time) !== 3) {
    for (const sx of [-10, 0, 10]) {
      c.beginPath(); c.moveTo(sx - 3, 0); c.lineTo(sx, -12);
      c.lineTo(sx + 3, 0); c.closePath(); c.fill();
    }
  }
  c.restore();
}
