import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Game, GameClock } from "../js/engine.js";
import { ENEMY_SPRITES, EnemySprites, walkFrame } from "../js/enemy-sprites.js";

class LoadedImage {
  set src(value) {
    const sprite = Object.values(ENEMY_SPRITES).find((s) => s.src === value);
    this.naturalWidth = sprite.frameWidth * sprite.frames;
    this.naturalHeight = sprite.frameHeight;
    queueMicrotask(() => this.onload());
  }
}

test("supplied PNG paths and horizontal frame layouts match the renderer", () => {
  assert.deepEqual(Object.keys(ENEMY_SPRITES), ["normal", "tank"]);
  for (const sprite of Object.values(ENEMY_SPRITES)) {
    const png = readFileSync(new URL(sprite.src));
    assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(png.readUInt32BE(16), sprite.frameWidth * sprite.frames);
    assert.equal(png.readUInt32BE(20), sprite.frameHeight);
    const frames = Array.from({ length: 9 }, (_, i) =>
      walkFrame(sprite, i * sprite.distancePerFrame),
    );
    assert.deepEqual(frames, [0, 1, 2, 3, 0, 1, 2, 3, 0]);
  }
});

function movingGame(speed = 1) {
  const game = new Game();
  game.wave = 1;
  game.status = "wave";
  game.encounters.set(1, { pending: 0, alive: 2 });
  const enemies = [game.spawn("normal", 1), game.spawn("tank", 1)];
  game.setSpeed(speed);
  return { game, enemies, clock: new GameClock() };
}

test("walk frames follow actual simulation movement through pause, speed and slow", () => {
  const normal = movingGame();
  const faster = movingGame(3);
  for (let i = 0; i < 3; i++) {
    normal.clock.advance(normal.game, 0.1);
    faster.clock.advance(faster.game, 0.1);
  }
  for (let i = 0; i < 2; i++) {
    assert.ok(Math.abs(faster.enemies[i].distance - normal.enemies[i].distance * 3) < 1e-8);
  }
  const frames = normal.enemies.map((e) => walkFrame(ENEMY_SPRITES[e.kind], e.distance));
  normal.game.setPaused(true);
  normal.clock.advance(normal.game, 0.25);
  assert.deepEqual(
    normal.enemies.map((e) => walkFrame(ENEMY_SPRITES[e.kind], e.distance)),
    frames,
  );
  const slowed = movingGame();
  for (const e of slowed.enemies) {
    e.slow = 0.5;
    e.slowUntil = 10;
  }
  for (let i = 0; i < 3; i++) slowed.clock.advance(slowed.game, 0.1);
  for (let i = 0; i < 2; i++) {
    const sprite = ENEMY_SPRITES[slowed.enemies[i].kind];
    assert.ok(Math.abs(slowed.enemies[i].distance - normal.enemies[i].distance / 2) < 1e-8);
    assert.equal(walkFrame(sprite, slowed.enemies[i].distance), [1, 0][i]);
    assert.equal(walkFrame(sprite, normal.enemies[i].distance), [2, 1][i]);
  }
});

test("sprite drawing crops one frame, disables smoothing locally, and keeps side-view facing", async () => {
  const sprites = new EnemySprites(LoadedImage);
  assert.equal(sprites.get("normal"), undefined, "Loading should allow procedural fallback");
  assert.equal(await sprites.ready, true);
  const calls = [];
  const context = {
    imageSmoothingEnabled: true,
    save() { this.previousSmoothing = this.imageSmoothingEnabled; },
    restore() { this.imageSmoothingEnabled = this.previousSmoothing; },
    scale(x, y) { calls.push(["scale", x, y]); },
    drawImage(...args) {
      assert.equal(this.imageSmoothingEnabled, false);
      calls.push(["image", ...args.slice(1)]);
    },
  };
  for (const [kind, sprite] of Object.entries(ENEMY_SPRITES)) {
    const enemy = { kind, distance: sprite.distancePerFrame * 3, angle: Math.PI };
    const snapshot = { ...enemy };
    assert.equal(sprites.draw(context, enemy), true);
    assert.deepEqual(calls.at(-2), ["scale", -1, 1]);
    assert.deepEqual(calls.at(-1), [
      "image", sprite.frameWidth * 3, 0, sprite.frameWidth, sprite.frameHeight,
      -sprite.size / 2, -sprite.size / 2, sprite.size, sprite.size,
    ]);
    assert.equal(context.imageSmoothingEnabled, true);
    assert.deepEqual(enemy, snapshot, "Rendering must not mutate simulation fields");
    enemy.angle = -Math.PI / 2;
    sprites.draw(context, enemy);
    assert.deepEqual(calls.at(-2), ["scale", -1, 1], "Vertical travel retains left facing");
    enemy.angle = 0;
    sprites.draw(context, enemy);
    assert.deepEqual(calls.at(-2), ["scale", 1, 1]);
    enemy.angle = Math.PI / 2;
    sprites.draw(context, enemy);
    assert.deepEqual(calls.at(-2), ["scale", 1, 1], "Vertical travel retains right facing");
    sprites.clear();
    sprites.draw(context, enemy);
    assert.deepEqual(calls.at(-2), ["scale", 1, 1]);
  }
  assert.equal(sprites.draw(context, { kind: "boss" }), false);
});

test("unavailable or invalid sheets preserve a usable procedural fallback", async (t) => {
  const warnings = t.mock.method(console, "warn", () => {});
  class UnavailableImage {
    set src(value) {
      queueMicrotask(() => {
        if (value.includes("goblin")) this.onerror();
        else {
          this.naturalWidth = 1;
          this.naturalHeight = 1;
          this.onload();
        }
      });
    }
  }
  const sprites = new EnemySprites(UnavailableImage);
  assert.equal(await sprites.ready, false);
  assert.equal(sprites.get("normal"), undefined);
  assert.equal(sprites.get("tank"), undefined);
  assert.equal(sprites.draw({}, { kind: "normal" }), false);
  assert.equal(warnings.mock.calls.length, 2);
});
