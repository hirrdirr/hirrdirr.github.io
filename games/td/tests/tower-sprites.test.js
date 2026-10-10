import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { TOWERS } from "../js/data.js";
import { TowerSprites, TOWER_SPRITES, firingFrame, getTowerSprites } from "../js/tower-sprites.js";
import { drawTower, paintIcons } from "../js/renderer.js";

class LoadedImage {
  set src(value) {
    const sprite = Object.values(TOWER_SPRITES).find((s) => s.src === value);
    this.naturalWidth = sprite.frameWidth * sprite.frames;
    this.naturalHeight = sprite.frameHeight;
    queueMicrotask(() => this.onload());
  }
}

function recordingContext() {
  const calls = [];
  const stack = [];
  return {
    calls,
    imageSmoothingEnabled: true,
    save() { stack.push(this.imageSmoothingEnabled); },
    restore() { this.imageSmoothingEnabled = stack.pop(); },
    translate(...args) { calls.push(["translate", ...args]); },
    scale(...args) { calls.push(["scale", ...args]); },
    rotate(...args) { calls.push(["rotate", ...args]); },
    clearRect() {},
    drawImage(image, ...args) {
      assert.equal(this.imageSmoothingEnabled, false);
      calls.push(["image", ...args]);
    },
  };
}

test("every existing tower name maps to exactly one supplied, unchanged four-frame PNG", () => {
  const names = readdirSync(new URL("../assets/towers/", import.meta.url))
    .filter((name) => name.endsWith(".png")).sort();
  assert.deepEqual(Object.keys(TOWER_SPRITES), Object.keys(TOWERS));
  assert.deepEqual(names, Object.values(TOWERS).map((t) => `${t.name}_4f.png`).sort());
  for (const [kind, sprite] of Object.entries(TOWER_SPRITES)) {
    const file = new URL(sprite.src);
    assert.equal(decodeURIComponent(file.pathname.split("/").at(-1)), `${TOWERS[kind].name}_4f.png`);
    const png = readFileSync(file);
    assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(png.readUInt32BE(16), sprite.frameWidth * sprite.frames);
    assert.equal(png.readUInt32BE(20), sprite.frameHeight);
    assert.ok(sprite.size >= 40 && sprite.size <= 50);
  }
});

test("firing artwork follows the existing recoil from flash to recovery to idle", () => {
  assert.deepEqual([1, 0.8, 0.6, 0.4, 0.2, 0, -1].map(firingFrame), [2, 2, 3, 3, 1, 0, 0]);
});

test("idle previews keep the full sprite centered, undistorted and free of muzzle flashes", async () => {
  const sprites = new TowerSprites(LoadedImage);
  assert.equal(sprites.draw({}, "repeater", 20, 20, 0), false, "Loading permits fallback");
  assert.equal(await sprites.ready, true);
  for (const [kind, sprite] of Object.entries(TOWER_SPRITES)) {
    const c = recordingContext();
    sprites.draw(c, kind, 180, 260, Math.PI, 1, 2, false);
    assert.deepEqual(c.calls, [
      ["translate", 180, 260],
      ["scale", 2 * sprite.size / sprite.frameHeight, 2 * sprite.size / sprite.frameHeight],
      ["image", 0, 0, 543, 724, -271.5, -362, 543, 724],
    ]);
    assert.equal(c.imageSmoothingEnabled, true);
  }
});

test("aiming uses calibrated offsets and recoil; source parts cover each frame exactly once", async () => {
  const sprites = new TowerSprites(LoadedImage);
  await sprites.ready;
  for (const [kind, sprite] of Object.entries(TOWER_SPRITES)) {
    for (const angle of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      const c = recordingContext();
      const levels = [3, 1];
      const tower = { kind, x: 180, y: 260, angle, recoil: 0.8, levels };
      const before = structuredClone(tower);
      sprites.draw(c, tower.kind, tower.x, tower.y, tower.angle, tower.recoil);
      const images = c.calls.filter((call) => call[0] === "image");
      let area = 0;
      for (const [, sx, sy, w, h, , , dw, dh] of images) {
        assert.ok(sx >= 543 * 2 && sx + w <= 543 * 3);
        assert.ok(sy >= 0 && sy + h <= 724);
        assert.equal(w, dw);
        assert.equal(h, dh);
        area += w * h;
      }
      assert.equal(area, 543 * 724, "No duplicate source art or missing frame pixels");
      if (sprite.aimPart) {
        assert.deepEqual(c.calls.filter((call) => call[0] === "rotate"), [["rotate", angle - sprite.aimPart.facing]]);
        const factor = sprite.size / sprite.frameHeight;
        const translated = c.calls.filter((call) => call[0] === "translate").at(-1);
        assert.deepEqual(translated, [
          "translate",
          sprite.aimPart.pivotX - 271.5 - Math.cos(angle) * 0.8 * 2 / factor,
          sprite.aimPart.pivotY - 362 - Math.sin(angle) * 0.8 * 2 / factor,
        ]);
      } else {
        assert.equal(kind, "relay");
        assert.equal(images.length, 1);
        assert.equal(c.calls.some((call) => call[0] === "rotate"), false);
      }
      assert.deepEqual(tower, before, "Rendering does not mutate tower state or upgrade levels");
      assert.equal(c.imageSmoothingEnabled, true);
    }
  }
});

test("loaded battlefield and UI sprites bypass all procedural tower artwork", async (t) => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "Image");
  Object.defineProperty(globalThis, "Image", { value: LoadedImage, configurable: true });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, "Image", previous);
    else delete globalThis.Image;
  });
  await getTowerSprites().ready;
  for (const kind of Object.keys(TOWERS)) {
    const c = recordingContext(); // No fill/path methods: any old art would throw.
    drawTower(c, kind, 20, 20, 0, [3, 1], 0.8);
    assert.ok(c.calls.some((call) => call[0] === "image"));
    const root = {
      isConnected: true,
      querySelectorAll() {
        return [{ width: 96, height: 96, dataset: { towerIcon: kind }, getContext: () => c }];
      },
    };
    c.calls.length = 0;
    paintIcons(root);
    await Promise.resolve();
    const images = c.calls.filter((call) => call[0] === "image");
    assert.ok(images.length > 0);
    assert.ok(images.every((call) => call[1] === 0 && call[3] === 543 && call[4] === 724));
  }
});

test("failed downloads and invalid sheet sizes remain eligible for the original fallback", async (t) => {
  const warnings = t.mock.method(console, "warn", () => {});
  class BadImage {
    set src(value) {
      queueMicrotask(() => {
        if (value.includes("Repeater")) this.onerror();
        else {
          this.naturalWidth = 1;
          this.naturalHeight = 1;
          this.onload();
        }
      });
    }
  }
  const sprites = new TowerSprites(BadImage);
  assert.equal(await sprites.ready, false);
  for (const kind of Object.keys(TOWERS)) assert.equal(sprites.draw({}, kind), false);
  assert.equal(warnings.mock.calls.length, Object.keys(TOWERS).length);
});
