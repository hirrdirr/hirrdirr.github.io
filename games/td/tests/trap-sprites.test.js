import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TrapSprites, SPIKE_SPRITE, trapFrame, drawTrap, getTrapSprites } from "../js/trap-sprites.js";
import { trapState } from "../js/traps.js";

class LoadedImage {
  set src(value) {
    this.naturalWidth = SPIKE_SPRITE.width;
    this.naturalHeight = SPIKE_SPRITE.height;
    queueMicrotask(() => this.onload());
  }
}
const trap = { kind: "spike", x: 200, y: 300, triggeredAt: 0, readyAt: 4 };
function context() {
  const calls = [], stack = [];
  return { calls, imageSmoothingEnabled: true,
    save() { stack.push(this.imageSmoothingEnabled); },
    restore() { this.imageSmoothingEnabled = stack.pop(); },
    translate(...args) { calls.push(["translate", ...args]); },
    scale(...args) { calls.push(["scale", ...args]); },
    drawImage(image, ...args) {
      assert.equal(this.imageSmoothingEnabled, false);
      calls.push(["image", ...args]);
    },
  };
}

test("the exact supplied PNG and its four non-uniform frame crops match the inspected sheet", () => {
  assert.equal(new URL(SPIKE_SPRITE.src).pathname.split("/").at(-1), "spiketrap-sprite-sheet.png");
  const png = readFileSync(new URL(SPIKE_SPRITE.src));
  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(png.readUInt32BE(16), 2172);
  assert.equal(png.readUInt32BE(20), 724);
  assert.equal(SPIKE_SPRITE.frames.length, 4);
  let previousEnd = 0;
  for (const frame of SPIKE_SPRITE.frames) {
    assert.ok(frame.x >= previousEnd);
    assert.ok(frame.x + frame.width <= SPIKE_SPRITE.width);
    assert.ok(frame.y >= 0 && frame.y + frame.height <= SPIKE_SPRITE.height);
    assert.ok(frame.width > 0 && frame.height > 0);
    previousEnd = frame.x + frame.width;
  }
  assert.ok(SPIKE_SPRITE.frames[0].x + SPIKE_SPRITE.frames[0].width > 543,
    "The first drawing crosses a naive equal-cell boundary");
});

test("armed, trigger, flat cooldown and rearm frames follow simulation time", () => {
  const times = [0, 0.11, 0.13, 0.24, 2, 3.19, 3.21, 3.61, 4, 8];
  assert.deepEqual(times.map((time) => trapFrame(trap, time)), [0, 0, 1, 3, 3, 3, 2, 1, 0, 0]);
  assert.equal(trapState(trap, 0.1), "triggered");
  assert.equal(trapState(trap, 1), "rearming");
  assert.equal(trapState(trap, 4), "armed");
  assert.equal(trapFrame({ ...trap, triggeredAt: null, readyAt: 0 }, 0), 0);
});

test("cropped sprites stay undistorted, centred on the ground anchor, and pixel-sharp", async () => {
  const sprites = new TrapSprites(LoadedImage);
  assert.equal(sprites.draw({}, trap, 0), true, "Loading suppresses procedural flashing");
  assert.equal(await sprites.ready, true);
  for (const time of [0, 0.13, 1, 3.3]) {
    const c = context(), before = structuredClone(trap);
    sprites.draw(c, trap, time);
    const frame = SPIKE_SPRITE.frames[trapFrame(trap, time)];
    const factor = SPIKE_SPRITE.drawWidth / SPIKE_SPRITE.frames[0].width;
    assert.deepEqual(c.calls[0], ["translate", 200, 300]);
    const image = c.calls.at(-1);
    assert.deepEqual(image.slice(1, 5), [frame.x, frame.y, frame.width, frame.height]);
    assert.equal(image[5], -frame.width * factor / 2);
    assert.equal(image[6], (frame.y - SPIKE_SPRITE.anchorY) * factor);
    assert.ok(Math.abs(image[7] / image[8] - frame.width / frame.height) < 1e-10);
    assert.equal(c.imageSmoothingEnabled, true);
    assert.deepEqual(trap, before);
  }
});

test("shop/inspector icons always use the readable intact frame and centre the whole artwork", async () => {
  const sprites = new TrapSprites(LoadedImage);
  await sprites.ready;
  const c = context();
  sprites.draw(c, trap, 2, 48, 48, 2, true);
  const image = c.calls.at(-1);
  assert.deepEqual(image.slice(1, 5), [55, 127, 534, 485]);
  assert.equal(image[5], -image[7] / 2);
  assert.equal(image[6], -image[8] / 2);
});

test("loaded sprite rendering bypasses all procedural artwork", async (t) => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "Image");
  Object.defineProperty(globalThis, "Image", { value: LoadedImage, configurable: true });
  t.after(() => descriptor ? Object.defineProperty(globalThis, "Image", descriptor) : delete globalThis.Image);
  await getTrapSprites().ready;
  const c = context(); // Any fallback fill/path drawing would throw.
  drawTrap(c, trap, 1);
  assert.equal(c.calls.filter((call) => call[0] === "image").length, 1);
});

test("failed sheets retry once; malformed sheets allow an emergency fallback", async (t) => {
  const warnings = t.mock.method(console, "warn", () => {});
  let attempts = 0;
  class MissingImage {
    set src(value) { attempts++; queueMicrotask(() => this.onerror()); }
  }
  class WrongImage {
    set src(value) {
      this.naturalWidth = 1; this.naturalHeight = 1;
      queueMicrotask(() => this.onload());
    }
  }
  for (const ImageClass of [MissingImage, WrongImage]) {
    const sprites = new TrapSprites(ImageClass);
    assert.equal(await sprites.ready, false);
    assert.equal(sprites.draw({}, trap, 0), false);
  }
  assert.equal(attempts, 2);
  assert.equal(warnings.mock.calls.length, 2);
});

test("the actual draw wrapper renders a state-aware fallback only after loading fails", async (t) => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "Image");
  class MissingImage {
    set src(value) { queueMicrotask(() => this.onerror()); }
  }
  Object.defineProperty(globalThis, "Image", { value: MissingImage, configurable: true });
  t.after(() => descriptor ? Object.defineProperty(globalThis, "Image", descriptor) : delete globalThis.Image);
  t.mock.method(console, "warn", () => {});
  // An isolated cache exercises the production wrapper without changing its API.
  const fallback = await import("../js/trap-sprites.js?failed-sheet");
  assert.equal(await fallback.getTrapSprites().ready, false);
  const calls = [];
  const c = Object.fromEntries(["save", "restore", "translate", "scale", "fillRect",
    "beginPath", "moveTo", "lineTo", "closePath", "fill"].map((name) =>
    [name, (...args) => calls.push([name, ...args])]));
  fallback.drawTrap(c, trap, 1);
  assert.equal(calls.filter(([name]) => name === "fillRect").length, 1);
  assert.equal(calls.filter(([name]) => name === "fill").length, 0, "Cooldown base stays flat");
  calls.length = 0;
  fallback.drawTrap(c, trap, 4);
  assert.equal(calls.filter(([name]) => name === "fill").length, 3, "Armed fallback shows spikes");
});
