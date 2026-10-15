import test from "node:test";
import assert from "node:assert/strict";
import { Game, GameClock, STEP } from "../js/engine.js";
import { TOWERS, ENEMIES, WORLD } from "../js/data.js";
import { enableFreePlacement } from "../js/free-placement.js";
import { PATH_LENGTH, pointOnPath } from "../js/map.js";
import { TRAPS, trapState, updateTraps, trapSlowFor } from "../js/traps.js";
import { trapFrame } from "../js/trap-sprites.js";
import { applyDifficulty } from "../js/difficulty.js";

class LiveGame extends Game {}
enableFreePlacement(LiveGame);
const def = TRAPS.spike;
const coord = (x, y) => [x / WORLD.tile - 0.5, y / WORLD.tile - 0.5];
const build = (game, x = 200, y = 300) => game.place("spike", ...coord(x, y));
function run(game, seconds) {
  for (let i = 0; i < Math.round(seconds / STEP); i++) game.update(STEP);
}
function battle(kinds = ["normal"], wave = 1) {
  const game = new LiveGame();
  const trap = build(game).trap;
  game.wave = wave;
  game.status = "wave";
  game.encounters.set(wave, { pending: 0, alive: kinds.length });
  const enemies = kinds.map((kind) => {
    const e = game.spawn(kind, wave);
    e.distance = trap.distance;
    Object.assign(e, pointOnPath(e.distance));
    e.speed = 0;
    return e;
  });
  return { game, trap, enemies };
}

test("Spike Trap is a consumable utility separate from the seven towers", () => {
  assert.deepEqual(Object.keys(TRAPS), ["spike"]);
  assert.equal(Object.keys(TOWERS).length, 7);
  assert.equal(TOWERS.spike, undefined);
  assert.equal(def.cost, 20);
  assert.equal(def.dps, 12);
  assert.equal(def.slow, 0.1);
  assert.equal(def.hp, 5);
  assert.equal(def.rearm, undefined);
});

test("live placement snaps only road clicks to its centre and spends once", () => {
  const game = new LiveGame();
  const result = build(game, 204, 315);
  assert.equal(result.ok, true);
  const trap = result.trap;
  assert.equal(trap.x, 204);
  assert.equal(trap.y, 300);
  assert.equal(trap.distance, 184);
  assert.equal(game.gold, 220);
  assert.equal(game.traps.length, 1);
  assert.equal(game.towers.length, 0);
  assert.equal(game.selected, trap);
  assert.equal(trap.entityType, "trap");
  assert.equal(trap.hp, 5);
  assert.equal(trap.maxHp, 5);
  assert.equal(trapFrame(trap, game.time), 3);
  assert.equal(trap.readyAt, undefined);
  assert.equal(trap.levels, undefined);
  assert.equal(trap.targeting, undefined);
  assert.equal(trapState(trap, game.time), "idle");
});

test("grass, invalid coordinates, gates, missing money and terminal placements are atomic", () => {
  const game = new LiveGame();
  for (const [x, y] of [[200, 260], [200, 327], [-1, 300], [NaN, 300],
    [Infinity, 300], [200, 601], [20, 300], [940, 300]]) {
    assert.equal(build(game, x, y).ok, false, `${x},${y}`);
  }
  for (const value of [null, undefined, "4", {}, false]) {
    assert.equal(game.place("spike", value, 7).ok, false);
    assert.equal(game.place("spike", 4, value).ok, false);
  }
  assert.equal(game.gold, 240);
  assert.equal(game.nextId, 1);
  assert.equal(game.events.length, 0);
  game.gold = def.cost - 1;
  assert.equal(build(game).ok, false);
  assert.equal(game.gold, 19);
  game.gold = 240;
  game.finish("lost");
  assert.equal(build(game).ok, false);
  assert.equal(game.traps.length, 0);
});

test("spacing prevents duplicate/overlapping traps, including around a bend", () => {
  const game = new LiveGame();
  assert.equal(build(game, 200).ok, true);
  assert.equal(build(game, 200, 315).ok, false);
  assert.equal(build(game, 243.9).ok, false);
  assert.equal(build(game, 244).ok, true);
  const corner = new LiveGame();
  assert.equal(build(corner, 232, 300).ok, true);
  assert.equal(build(corner, 260, 272).ok, false, "Corner footprints must not overlap");
  assert.equal(build(corner, 260, 260).ok, true);
});

test("invalid road previews retain the snapped point for money and spacing feedback", () => {
  const game = new LiveGame();
  game.gold = def.cost - 1;
  const unavailable = game.placement("spike", ...coord(204, 315));
  assert.equal(unavailable.ok, false);
  assert.equal(unavailable.x, 204);
  assert.equal(unavailable.y, 300);
  game.gold = WORLD.gold;
  build(game, 204, 315);
  const overlap = game.placement("spike", ...coord(204, 285));
  assert.equal(overlap.ok, false);
  assert.equal(overlap.x, 204);
  assert.equal(overlap.y, 300);
});

test("all road segments support traps away from gates without changing tower clearance", () => {
  for (const distance of [64, 240, 320, 500, 800, 1000, 1200, 1400]) {
    if (distance > PATH_LENGTH - def.gateMargin) continue;
    const game = new LiveGame(), point = pointOnPath(distance);
    assert.equal(build(game, point.x, point.y).ok, true);
    assert.equal(game.place("repeater", ...coord(point.x, point.y)).ok, false);
  }
  for (const kind of Object.keys(TOWERS)) {
    const game = new LiveGame();
    assert.equal(build(game).ok, true);
    game.gold = 1000;
    assert.equal(game.place(kind, ...coord(200, 240)).ok, true, kind);
    assert.equal(game.place(kind, ...coord(200, 260)).ok, false, "Existing 43px road clearance");
    assert.equal(game.place(kind, ...coord(200, 300)).ok, false);
    assert.equal(game.place(kind, ...coord(60, 60)).ok, false, "Existing blocked terrain");
  }
  const legacy = new Game();
  assert.equal(legacy.place("repeater", 5, 6).ok, true);
  assert.equal(legacy.place("repeater", 5, 7).ok, false);
});

const near = (actual, expected, tolerance = 1e-8) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);

test("damage is proportional to overlap time, with no entry burst or cooldown", () => {
  const { game, trap, enemies: [enemy] } = battle();
  game.update(STEP);
  near(enemy.hp, 38 - 0.2);
  assert.equal(trap.hp, 4);
  assert.equal(trap.triggers, 1);
  run(game, 0.5 - STEP);
  near(trap.totalDamage, 6);
  assert.equal(trap.hp, 4);
  assert.equal(trapFrame(trap, game.time), 0, "Stay raised throughout contact");
  const second = game.spawn("normal", 1);
  second.distance = trap.distance;
  second.speed = 0;
  game.update(STEP);
  near(second.hp, 37.8);
  assert.equal(trap.hp, 3);
});

test("100 overlapping enemies reserve only five paid contacts in stable ID order", () => {
  const { game, trap, enemies } = battle(Array(100).fill("normal"));
  game.enemies.reverse();
  run(game, 0.5);
  assert.ok(enemies.slice(0, 5).every((e) => Math.abs(e.hp - 32) < 1e-8));
  assert.ok(enemies.slice(5).every((e) => e.hp === 38));
  assert.equal(trap.hp, 0);
  assert.equal(trap.triggers, 5);
  near(trap.totalDamage, 30);
  assert.equal(trapSlowFor(game, enemies[0]), 0.1);
  assert.equal(trapSlowFor(game, enemies[5]), 0);
  run(game, 1);
  near(trap.totalDamage, 60, 1e-6);
  assert.equal(game.traps.length, 0, "No free crowd damage after paid contact expires");
});

test("prolonged overlap spends another HP per second and has a finite damage budget", () => {
  const { game, trap, enemies: [enemy] } = battle(["tank"]);
  run(game, 1);
  near(trap.totalDamage, 10.8);
  assert.equal(trap.hp, 4);
  game.update(STEP);
  assert.equal(trap.hp, 3);
  run(game, 6);
  near(trap.totalDamage, 54, 1e-6);
  assert.equal(trap.triggers, 1, "A stationary enemy is still one distinct passage");
  assert.equal(trap.hp, 0);
  assert.equal(game.traps.length, 0);
  assert.equal(enemy.status, "active");
});

test("swept entry and departure deal only the fraction actually on the footprint", () => {
  const { game, trap, enemies: [enemy] } = battle();
  enemy.distance = trap.distance - 50;
  enemy.speed = 6000;
  game.update(STEP);
  near(trap.totalDamage, 12 * 28 / 6000);
  assert.equal(trap.hp, 4);
  assert.equal(trapSlowFor(game, enemy), 0);
  const damage = trap.totalDamage;
  game.update(STEP);
  near(trap.totalDamage, damage);
  assert.equal(trap.contacts.size, 0);
});

test("a swept bend crossing assigns the last HP to the first arrival", () => {
  const game = new LiveGame(), trap = build(game, 260, 300).trap;
  trap.hp = 1;
  const later = game.spawn("swift", 1), earlier = game.spawn("swift", 1);
  later.distance = trap.distance - 25;
  earlier.distance = trap.distance - 18;
  later.speed = earlier.speed = 1800;
  game.update(STEP);
  assert.ok(earlier.hp < earlier.maxHp);
  assert.equal(later.hp, later.maxHp);
  assert.equal(trap.triggers, 1);
});

test("damage and slow end at the footprint boundary, without afterburn or a second HP", () => {
  const { game, trap, enemies: [enemy] } = battle();
  game.update(STEP);
  enemy.distance = trap.distance + def.contactHalfLength - 0.1;
  enemy.speed = 58;
  const before = trap.totalDamage;
  game.update(STEP);
  near(trap.totalDamage - before, 12 * 0.1 / (58 * 0.9));
  assert.equal(trapSlowFor(game, enemy), 0);
  const damage = trap.totalDamage, distance = enemy.distance;
  game.update(STEP);
  near(enemy.distance - distance, 58 * STEP);
  near(trap.totalDamage, damage);
  assert.equal(trap.hp, 4);
  run(game, 0.3);
  assert.equal(trapFrame(trap, game.time), 3);
});

test("trap slow is modest, respects resistance, and never weakens or multiplies cryo", () => {
  for (const [kind, towerSlow] of [["normal", 0], ["normal", 0.32], ["elite", 0], ["boss", 0]]) {
    const { game, trap, enemies: [enemy] } = battle([kind]);
    game.update(STEP); // Establish contact without movement.
    enemy.speed = 50;
    enemy.slow = towerSlow;
    enemy.slowUntil = 10;
    const distance = enemy.distance;
    game.update(STEP);
    near(enemy.distance - distance, 50 * (1 - Math.max(0.1, towerSlow) * (1 - enemy.slowResist)) * STEP);
    assert.equal(enemy.slow, towerSlow);
    assert.equal(enemy.slowUntil, 10);
    game.sell(trap.id);
    const after = enemy.distance;
    game.update(STEP);
    near(enemy.distance - after, 50 * (1 - towerSlow * (1 - enemy.slowResist)) * STEP);
  }
});

test("faster enemies naturally take less damage on a complete passage", () => {
  const damage = [];
  for (const kind of ["normal", "fast", "swift"]) {
    const { game, trap, enemies: [enemy] } = battle([kind]);
    enemy.distance = trap.distance - 30;
    enemy.speed = ENEMIES[kind].speed;
    run(game, 2);
    assert.equal(trap.hp, 4);
    assert.equal(trap.triggers, 1);
    damage.push(trap.totalDamage);
  }
  assert.ok(damage[0] > damage[1] && damage[1] > damage[2]);
  near(damage[0], 6.43, 0.1);
  near(damage[1], 3.87, 0.1);
  near(damage[2], 2.51, 0.1);
});

for (const kind of Object.keys(ENEMIES)) {
  test(`continuous trap damage obeys the existing armor rules for ${kind}`, () => {
    const { game, trap, enemies: [enemy] } = battle([kind]);
    const expected = 0.2 * (1 - game.armorFor(enemy));
    game.update(STEP);
    near(enemy.maxHp - enemy.hp, expected);
    near(trap.totalDamage, expected);
    assert.equal(trap.hp, 4);
    assert.equal(enemy.lastHit, game.time);
  });
}

test("boss pulses and vulnerability use the same physical damage rules", () => {
  const { game, trap, enemies: [boss] } = battle(["boss"]);
  game.update(STEP);
  near(trap.totalDamage, 0.1);
  boss.age = 4;
  game.update(STEP);
  near(trap.totalDamage, 0.24);
  const vulnerable = battle();
  vulnerable.enemies[0].vulnerability = 0.12;
  vulnerable.enemies[0].vulnerableUntil = 10;
  vulnerable.game.update(STEP);
  near(vulnerable.trap.totalDamage, 0.224);
});

test("regen is suppressed only by actual overlap hits and resumes normally after leaving", () => {
  const { game, trap, enemies: [enemy] } = battle(["regen"]);
  run(game, 0.5);
  near(trap.totalDamage, 5.7);
  enemy.distance = trap.distance + 40;
  const hp = enemy.hp;
  run(game, 1.9);
  near(enemy.hp, hp);
  run(game, 0.3);
  assert.ok(enemy.hp > hp);
  assert.equal(trap.triggers, 1);
});

test("traps remain outside upgrades, targeting and relay auras", () => {
  const { game, trap } = battle();
  game.gold = 1000;
  assert.equal(game.place("relay", ...coord(200, 220)).ok, true);
  assert.equal(game.upgrade(trap.id, 0).ok, false);
  assert.equal(game.setTargeting(trap.id, "Strong"), false);
  run(game, 0.5);
  near(trap.totalDamage, 6);
});

test("dead, absorbing and off-footprint enemies cannot damage or slow through a trap", () => {
  for (const status of ["dead", "absorbing"]) {
    const { game, trap, enemies: [enemy] } = battle();
    enemy.status = status;
    game.update(STEP);
    assert.equal(trap.triggers, 0);
    assert.equal(trap.totalDamage, 0);
  }
  const { game, trap, enemies: [enemy] } = battle(["boss"]);
  enemy.distance = trap.distance - def.contactHalfLength - 1;
  game.update(STEP);
  assert.equal(trap.triggers, 0, "Large sprites do not enlarge the collision zone");
});

test("pause freezes continuous damage, HP, slow, animation and depletion; resume continues", () => {
  const { game, trap, enemies: [enemy] } = battle();
  game.update(STEP);
  const state = () => [game.time, enemy.hp, trap.hp, trap.totalDamage,
    trap.contacts.get(enemy.id)?.remaining, trapFrame(trap, game.time), trapSlowFor(game, enemy)];
  const before = state();
  game.setPaused(true);
  new GameClock().advance(game, 20);
  game.update(20);
  updateTraps(game, 20);
  assert.deepEqual(state(), before);
  const second = build(game, 244).trap;
  assert.equal(game.sell(second.id).value, 14);
  game.setPaused(false);
  game.update(STEP);
  near(enemy.hp, before[1] - 0.2);
});

test("1x/2x/3x at 20/60/120 FPS are identical in both difficulties", () => {
  for (const difficulty of ["normal", "easy"]) {
    applyDifficulty(difficulty);
    const snapshots = [];
    for (const speed of [1, 2, 3]) for (const fps of [20, 60, 120]) {
      const game = new LiveGame(), clock = new GameClock();
      for (const x of [84, 128, 172, 216]) assert.equal(build(game, x).ok, true);
      game.startWave(); game.setSpeed(speed);
      for (let i = 0; i < 12 * fps / speed; i++) clock.advance(game, 1 / fps);
      snapshots.push({ time: game.time, gold: game.gold, kills: game.kills,
        totalDamage: game.totalDamage, lives: game.lives,
        enemies: game.enemies.map((e) => [e.id, e.hp, e.distance]),
        traps: game.traps.map((t) => [t.id, t.hp, t.totalDamage, [...t.contacts], trapFrame(t, game.time)]) });
    }
    for (const state of snapshots.slice(1)) assert.deepEqual(state, snapshots[0]);
  }
  applyDifficulty("normal");
});

test("the last paid contact finishes at zero HP, then retracts and frees its road space", () => {
  const { game, trap, enemies: [enemy] } = battle();
  trap.hp = 1;
  run(game, 0.5);
  assert.equal(trap.hp, 0);
  near(trap.totalDamage, 6);
  assert.equal(game.traps[0], trap);
  assert.equal(trapFrame(trap, game.time), 0);
  game.setPaused(true);
  new GameClock().advance(game, 10);
  assert.equal(game.traps[0], trap);
  game.setPaused(false);
  run(game, 0.5);
  near(trap.totalDamage, 12);
  assert.equal(trapSlowFor(game, enemy), 0);
  run(game, 0.3);
  assert.equal(game.traps.length, 0);
  assert.equal(game.selectedId, null);
  assert.equal(build(game).ok, true);
});

test("a weak leak dies during overlap with exact rewards and damage credit", () => {
  const { game, trap, enemies: [enemy] } = battle();
  trap.hp = 1; enemy.hp = 3;
  game.encounters.clear(); // Isolate kill credit from the separate wave completion reward.
  const gold = game.gold;
  run(game, 0.25);
  assert.equal(enemy.status, "dead");
  near(trap.totalDamage, 3);
  assert.equal(trap.kills, 1);
  assert.equal(game.kills, 1);
  assert.equal(game.gold, gold + enemy.reward);
  run(game, 0.5);
  assert.equal(game.traps.length, 0);
  assert.equal(game.kills, 1);
});

test("selling refunds only unspent HP and immediately removes overlap effects", () => {
  const { game, trap, enemies: [enemy] } = battle();
  const tower = game.place("repeater", ...coord(200, 240)).tower;
  assert.equal(game.sellValue(trap), 14);
  game.update(STEP);
  assert.equal(game.sellValue(trap), 11);
  assert.equal(game.sellValue(tower), 42);
  const gold = game.gold, hp = enemy.hp;
  assert.equal(game.sell(trap.id).value, 11);
  assert.equal(game.gold, gold + 11);
  assert.equal(game.selected, tower);
  assert.equal(game.sell(trap.id).ok, false);
  assert.equal(trapSlowFor(game, enemy), 0);
  updateTraps(game, STEP);
  assert.equal(enemy.hp, hp);
});

test("depletion preserves another selection and terminal/restart stop and clear all trap state", () => {
  const { game, trap } = battle(["tank"]);
  trap.hp = 1;
  const other = build(game, 244).trap;
  run(game, 1.3);
  assert.equal(game.traps.includes(trap), false);
  assert.equal(game.selected, other);
  game.finish("lost");
  const time = game.time;
  run(game, 10);
  assert.equal(game.time, time);
  assert.equal(game.sell(other.id).ok, false);
  assert.equal(build(game).ok, false);
  game.reset();
  assert.equal(game.traps.length, 0);
  assert.equal(game.enemies.length, 0);
  assert.equal(game.selectedId, null);
  assert.equal(game.gold, 240);
  assert.equal(game.time, 0);
  assert.equal(build(game).trap.id, 1);
});
