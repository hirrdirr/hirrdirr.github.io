import test from "node:test";
import assert from "node:assert/strict";
import { Game, GameClock, STEP } from "../js/engine.js";
import { TOWERS } from "../js/data.js";
import { applyDifficulty } from "../js/difficulty.js";
import { enableFreePlacement } from "../js/free-placement.js";
import { upgradePreview } from "../js/upgrade-preview.js";

class LiveGame extends Game {}
enableFreePlacement(LiveGame);
function build(game, kind, x = 200, y = 240) {
  const result = game.place(kind, x / 40 - 0.5, y / 40 - 0.5);
  assert.ok(result.ok, result.reason);
  return result.tower || result.trap;
}
const row = (preview, key) => preview.find((change) => change.key === key);

test("every previewed stat matches the actual purchase across all 42 tiers and crosspaths", () => {
  for (const kind of Object.keys(TOWERS)) for (const path of [0, 1]) {
    for (const crosspath of [false, true]) {
      const game = new LiveGame();
      game.gold = 10000;
      const tower = build(game, kind);
      if (crosspath) assert.ok(game.upgrade(tower.id, 1 - path).ok);
      for (let tier = 1; tier <= 3; tier++) {
        const before = game.effectiveStats(tower);
        const snapshot = structuredClone(game);
        const preview = upgradePreview(game, tower, path);
        assert.deepEqual(structuredClone(game), snapshot, "Reading must not spend, emit or mutate");
        assert.ok(preview.length > 0, `${kind} path ${path}, tier ${tier}`);
        assert.ok(game.upgrade(tower.id, path).ok);
        const after = game.effectiveStats(tower);
        const changed = Object.keys(after).filter((key) => after[key] !== before[key]);
        assert.deepEqual(preview.map(({ key }) => key).sort(), changed.sort(), "Every changed stat is visible");
        for (const change of preview) {
          assert.equal(change.before, before[change.key]);
          assert.equal(change.after, after[change.key]);
        }
      }
      assert.deepEqual(upgradePreview(game, tower, path), [], "No preview for a completed path");
    }
  }
});

test("previews include the strongest current relay bonus and update after upgrades and sales", () => {
  const game = new LiveGame();
  game.gold = 10000;
  const tower = build(game, "repeater");
  const relay = build(game, "relay", 200, 200);
  const second = build(game, "relay", 160, 240);
  const damage = () => row(upgradePreview(game, tower, 0), "damage");
  assert.equal(damage().before, 7 * 1.1);
  assert.equal(damage().after, 7 * 1.45 * 1.1);
  game.upgrade(relay.id, 0);
  assert.equal(damage().after, 7 * 1.45 * 1.18);
  game.sell(relay.id);
  assert.equal(damage().after, 7 * 1.45 * 1.1);
  game.sell(second.id);
  assert.equal(damage().after, 7 * 1.45);
});

test("zero credits still allows planning, while locked paths and traps have no preview", () => {
  const game = new LiveGame();
  const tower = build(game, "repeater");
  game.gold = 0;
  assert.equal(row(upgradePreview(game, tower, 0), "damage").after, 10.15);
  assert.equal(game.upgrade(tower.id, 0).ok, false);
  game.gold = 1000;
  game.upgrade(tower.id, 0);
  game.upgrade(tower.id, 0);
  assert.ok(upgradePreview(game, tower, 1).length, "Opposite first tier remains available");
  game.upgrade(tower.id, 1);
  assert.deepEqual(upgradePreview(game, tower, 1), [], "Opposite second tier is locked");
  const trap = build(game, "spike", 200, 300);
  assert.deepEqual(upgradePreview(game, trap, 0), []);
  assert.deepEqual(upgradePreview(game, null, 0), []);
  assert.deepEqual(upgradePreview(game, tower, -1), []);
});

test("status and support previews use actual totals, units and stat caps", () => {
  const game = new LiveGame();
  game.gold = 10000;
  const cryo = build(game, "cryo");
  assert.equal(row(upgradePreview(game, cryo, 0), "slow").unit, "%");
  assert.equal(row(upgradePreview(game, cryo, 0), "slowTime").unit, " s");
  const mortar = build(game, "mortar", 500, 220);
  assert.equal(row(upgradePreview(game, mortar, 1), "burn").after, 8);
  assert.equal(row(upgradePreview(game, mortar, 1), "burnTime").after, 3);
  const sniper = build(game, "sniper", 500, 300);
  game.upgrade(sniper.id, 0);
  assert.equal(row(upgradePreview(game, sniper, 0), "penetration").after, 1);
  const relay = build(game, "relay", 200, 200);
  assert.equal(row(upgradePreview(game, relay, 0), "buffDamage").after, 0.18);
  assert.deepEqual(upgradePreview(game, relay, 0).map(({ key }) => key), ["buffDamage"]);
});

test("reading previews throughout actual waves is inert at every speed and difficulty", () => {
  try {
    for (const difficulty of ["normal", "easy"]) for (const speed of [1, 2, 3]) {
      applyDifficulty(difficulty);
      const results = [];
      for (const inspect of [false, true]) {
        const game = new LiveGame(), clock = new GameClock();
        const tower = build(game, "repeater");
        build(game, "repeater", 500, 220);
        game.setSpeed(speed);
        for (let wave = 1; wave <= 3; wave++) {
          assert.ok(game.startWave().ok);
          let frames = 0;
          while (game.encounters.size && !game.terminal && frames++ < 10000) {
            if (inspect) {
              upgradePreview(game, tower, 0);
              upgradePreview(game, tower, 1);
            }
            // Purchase during combat, then compare the entire outcome.
            if (frames === 30 && wave === 1) assert.ok(game.upgrade(tower.id, 0).ok);
            clock.advance(game, STEP);
            game.drainEvents();
          }
          assert.ok(frames < 10000);
        }
        const snapshot = structuredClone(game);
        game.setPaused(true);
        const preview = upgradePreview(game, tower, 0);
        clock.advance(game, 0.2);
        assert.deepEqual(upgradePreview(game, tower, 0), preview);
        assert.equal(game.time, snapshot.time);
        results.push(snapshot);
        game.reset();
        assert.deepEqual(upgradePreview(game, game.selected, 0), []);
      }
      assert.deepEqual(results[1], results[0]);
    }
  } finally { applyDifficulty("normal"); }
});
