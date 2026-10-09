import test from "node:test";
import assert from "node:assert/strict";
import { WORLD, ENEMIES } from "../js/data.js";
import { applyDifficulty, DIFFICULTIES, resolveDifficulty } from "../js/difficulty.js";
import { Game } from "../js/engine.js";

test("Normal preserves the original Core Defense balance", () => {
  const difficulty = applyDifficulty("normal");
  const game = new Game();

  assert.equal(difficulty, DIFFICULTIES.normal);
  assert.equal(game.gold, 240);
  assert.equal(game.lives, 30);
  assert.equal(WORLD.gold, 240);
  assert.equal(WORLD.lives, 30);
  assert.equal(ENEMIES.normal.hp, 38);
  assert.equal(ENEMIES.normal.speed, 58);
  assert.equal(ENEMIES.normal.reward, 6);
  assert.equal(ENEMIES.boss.leak, 12);
});

test("Easy adds recovery room without changing tower or wave rules", () => {
  const difficulty = applyDifficulty("easy");
  const game = new Game();

  assert.equal(difficulty, DIFFICULTIES.easy);
  assert.equal(game.gold, 300);
  assert.equal(game.lives, 40);
  assert.equal(ENEMIES.normal.hp, 38 * 0.82);
  assert.equal(ENEMIES.normal.speed, 58 * 0.96);
  assert.equal(ENEMIES.normal.reward, 7);
  assert.equal(ENEMIES.tank.leak, 2);
  assert.equal(ENEMIES.elite.leak, 3);
  assert.equal(ENEMIES.boss.leak, 9);

  applyDifficulty("normal");
});

test("unknown difficulty safely falls back to Normal", () => {
  assert.equal(resolveDifficulty("missing"), DIFFICULTIES.normal);
  applyDifficulty("normal");
});
