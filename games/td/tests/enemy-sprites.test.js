import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Game, GameClock } from "../js/engine.js";
import { ENEMIES } from "../js/data.js";
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
  const files = {
    normal: "goblin_walk_4f.png",
    fast: "fast_goblin_runner_4f.png",
    swift: "swift_goblin_scout_4f.png",
    tank: "ogre_walk_4f.png",
    armored: "armored_orc_4f.png",
    regen: "regen_goblin_shaman_4f.png",
    elite: "elite_orc_brute_4f.png",
    boss: "boss_ogre_warlord_4f.png",
  };
  assert.deepEqual(Object.keys(ENEMY_SPRITES).sort(), Object.keys(ENEMIES).sort());
  for (const [kind, sprite] of Object.entries(ENEMY_SPRITES)) {
    assert.equal(new URL(sprite.src).pathname.split("/").at(-1), files[kind]);
    const png = readFileSync(new URL(sprite.src));
    assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(png.readUInt32BE(16), sprite.frameWidth * sprite.frames);
    assert.equal(png.readUInt32BE(20), sprite.frameHeight);
    const {
      x = 0, y = 0,
      width = sprite.frameWidth, height = sprite.frameHeight,
    } = sprite.crop ?? {};
    assert.ok(x >= 0 && y >= 0 && width > 0 && height > 0);
    assert.ok(x + width <= sprite.frameWidth && y + height <= sprite.frameHeight);
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
  const kinds = Object.keys(ENEMIES);
  game.encounters.set(1, { pending: 0, alive: kinds.length });
  const enemies = kinds.map((kind) => game.spawn(kind, 1));
  game.setSpeed(speed);
  return { game, enemies, clock: new GameClock() };
}

test("walk frames follow actual simulation movement through pause, speed and slow", () => {
  const normal = movingGame();
  const double = movingGame(2);
  const faster = movingGame(3);
  for (let i = 0; i < 3; i++) {
    normal.clock.advance(normal.game, 0.1);
    double.clock.advance(double.game, 0.1);
    faster.clock.advance(faster.game, 0.1);
  }
  for (let i = 0; i < normal.enemies.length; i++) {
    assert.ok(Math.abs(double.enemies[i].distance - normal.enemies[i].distance * 2) < 1e-8);
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
  const expectedFrames = {
    normal: 2, fast: 2, swift: 3, tank: 1,
    armored: 1, regen: 2, elite: 1, boss: 1,
  };
  const expectedSlowFrames = {
    normal: 1, fast: 1, swift: 1, tank: 0,
    armored: 0, regen: 1, elite: 1, boss: 0,
  };
  for (let i = 0; i < normal.enemies.length; i++) {
    const kind = slowed.enemies[i].kind;
    const sprite = ENEMY_SPRITES[slowed.enemies[i].kind];
    const factor = 1 - 0.5 * (1 - slowed.enemies[i].slowResist);
    assert.ok(Math.abs(slowed.enemies[i].distance - normal.enemies[i].distance * factor) < 1e-8);
    assert.equal(walkFrame(sprite, slowed.enemies[i].distance), expectedSlowFrames[kind]);
    assert.equal(walkFrame(sprite, normal.enemies[i].distance), expectedFrames[kind]);
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
    const {
      x = 0, y = 0,
      width = sprite.frameWidth, height = sprite.frameHeight,
    } = sprite.crop ?? {};
    const drawWidth = sprite.size * width / height;
    assert.deepEqual(calls.at(-2), ["scale", -1, 1]);
    assert.deepEqual(calls.at(-1), [
      "image", sprite.frameWidth * 3 + x, y, width, height,
      -drawWidth / 2, -sprite.size / 2, drawWidth, sprite.size,
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
  assert.equal(sprites.draw(context, { kind: "unknown" }), false);
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
  for (const kind of Object.keys(ENEMIES)) {
    assert.equal(sprites.get(kind), undefined);
    assert.equal(sprites.draw({}, { kind }), false);
  }
  assert.equal(warnings.mock.calls.length, Object.keys(ENEMIES).length);
});
