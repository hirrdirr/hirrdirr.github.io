// Gameplay regressions use the real wave schedule, movement, combat and economy.
import test from "node:test";
import assert from "node:assert/strict";
import { Game, GameClock, STEP } from "../js/engine.js";
import { WORLD, ENEMIES } from "../js/data.js";
import { applyDifficulty } from "../js/difficulty.js";
import { enableFreePlacement } from "../js/free-placement.js";
import { PATH_LENGTH, pointOnPath } from "../js/map.js";
import { TRAPS } from "../js/traps.js";

class LiveGame extends Game {}
enableFreePlacement(LiveGame);
const coord = (x, y) => [x / WORLD.tile - 0.5, y / WORLD.tile - 0.5];
const place = (game, distance) => {
  const p = pointOnPath(distance), result = game.place("spike", ...coord(p.x, p.y));
  assert.ok(result.ok, result.reason);
  return result.trap;
};
function finishWave(game, speed = 1) {
  const clock = new GameClock();
  game.setSpeed(speed);
  for (let frames = 0; frames < 20000; frames++) {
    clock.advance(game, STEP);
    game.drainEvents();
    if (!game.encounters.size || game.terminal) return;
  }
  assert.fail("Wave did not finish");
}

for (const difficulty of ["normal", "easy"]) {
  test(`${difficulty}: one trap alone leaks all ten wave-1 enemies at every game speed`, () => {
    applyDifficulty(difficulty);
    try {
      // Entrance, bend and exit: the result is not dependent on a convenient slot.
      for (const distance of [64, 240, PATH_LENGTH - 60]) for (const speed of [1, 2, 3]) {
        const game = new LiveGame(), trap = place(game, distance);
        game.startWave(); finishWave(game, speed);
        assert.equal(game.kills, 0);
        assert.equal(game.leaked, 10);
        assert.equal(game.lives, WORLD.lives - 10);
        assert.equal(trap.triggers, 5);
        assert.equal(trap.hp, 0);
        assert.equal(game.traps.length, 0);
        assert.ok(trap.totalDamage > 30 && trap.totalDamage < 35);
      }
    } finally { applyDifficulty("normal"); }
  });

  test(`${difficulty}: a rear trap finishes a real tower-damaged wave-2 leak`, () => {
    applyDifficulty(difficulty);
    try {
      const results = [];
      for (const withTrap of [false, true]) {
        const game = new LiveGame();
        for (const [x, y] of [[200, 240], [500, 220]])
          assert.ok(game.place("repeater", ...coord(x, y)).ok);
        const trap = withTrap ? place(game, PATH_LENGTH - 60) : null;
        game.wave = 1; game.startWave(); finishWave(game);
        results.push({ leaks: game.leaked, kills: game.kills });
        if (trap) {
          assert.equal(trap.kills, 1);
          assert.ok(trap.totalDamage > 3 && trap.totalDamage < 25);
        }
      }
      assert.equal(results[1].leaks, results[0].leaks - 1);
      assert.equal(results[1].kills, results[0].kills + 1);
      assert.equal(results[0].leaks, difficulty === "normal" ? 4 : 1);
    } finally { applyDifficulty("normal"); }
  });

  test(`${difficulty}: three consecutive traps cost a Repeater but cannot kill fresh wave-1 enemies`, () => {
    applyDifficulty(difficulty);
    try {
      const game = new LiveGame();
      const traps = [64, 108, 152].map((distance) => place(game, distance));
      assert.equal(WORLD.gold - game.gold, 60);
      assert.equal(game.place("spike", ...coord(traps[0].x, traps[0].y)).ok, false);
      game.startWave(); finishWave(game);
      assert.equal(game.kills, 0);
      assert.equal(game.leaked, 10);
      assert.ok(game.totalDamage < 102);
      assert.ok(traps.every((t) => t.hp === 0));
    } finally { applyDifficulty("normal"); }
  });

  test(`${difficulty}: all enemy types survive full-health crossings in all three campaign acts`, () => {
    applyDifficulty(difficulty);
    try {
      for (const wave of [1, 11, 21]) for (const kind of Object.keys(ENEMIES)) {
        const game = new LiveGame(), trap = place(game, 180), enemy = game.spawn(kind, wave);
        enemy.distance = trap.distance - 30;
        for (let i = 0; i < 600 && enemy.distance <= trap.distance + 30; i++) {
          game.update(STEP); game.drainEvents();
        }
        assert.equal(enemy.status, "active");
        assert.ok(trap.totalDamage > 0 && trap.totalDamage < enemy.maxHp / 4);
        assert.ok(trap.totalDamage < 10, `${kind} must not get a large burst`);
        assert.ok(trap.hp >= 3 && trap.hp < TRAPS.spike.hp);
      }
    } finally { applyDifficulty("normal"); }
  });
}
