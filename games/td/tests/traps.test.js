import test from "node:test";
import assert from "node:assert/strict";
import { Game, GameClock, STEP } from "../js/engine.js";
import { TOWERS, ENEMIES, WORLD } from "../js/data.js";
import { enableFreePlacement } from "../js/free-placement.js";
import { PATH_LENGTH, pointOnPath } from "../js/map.js";
import { TRAPS, trapState, updateTraps } from "../js/traps.js";
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

test("Spike Trap keeps its cost/damage and replaces cooldown with ten consumable HP", () => {
  assert.deepEqual(Object.keys(TRAPS), ["spike"]);
  assert.equal(Object.keys(TOWERS).length, 7);
  assert.equal(TOWERS.spike, undefined);
  assert.equal(def.cost, 50);
  assert.equal(def.damage, 32);
  assert.equal(def.hp, 10);
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
  assert.equal(game.gold, 190);
  assert.equal(game.traps.length, 1);
  assert.equal(game.towers.length, 0);
  assert.equal(game.selected, trap);
  assert.equal(trap.entityType, "trap");
  assert.equal(trap.hp, 10);
  assert.equal(trap.maxHp, 10);
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
  assert.equal(game.gold, 49);
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

test("100 overlapping enemies consume only the available HP in deterministic ID order", () => {
  const { game, trap, enemies } = battle(Array(100).fill("normal"));
  game.enemies.reverse();
  game.update(STEP);
  assert.ok(enemies.slice(0, def.hp).every((e) => e.hp === 6));
  assert.ok(enemies.slice(def.hp).every((e) => e.hp === 38));
  assert.equal(trap.hp, 0);
  assert.equal(trap.triggers, def.hp);
  assert.equal(trap.totalDamage, def.hp * def.damage);
  assert.equal(game.totalDamage, def.hp * def.damage);
  assert.equal(game.projectiles.length, 0);
  game.update(STEP);
  assert.equal(trap.hp, 0);
  assert.equal(trap.triggers, def.hp, "A depleted trap cannot deal another hit");
});

test("consecutive contacts hit immediately, including during the strike animation", () => {
  const { game, trap, enemies: [first, second] } = battle(["normal", "normal"]);
  second.distance = trap.distance - 50;
  game.update(STEP);
  assert.equal(first.hp, 6);
  assert.equal(second.hp, 38);
  assert.equal(trap.hp, 9);
  assert.equal(trapFrame(trap, game.time), 0);
  second.speed = 6000;
  game.update(STEP);
  assert.equal(second.hp, 6);
  assert.equal(trap.hp, 8);
  assert.equal(trap.triggers, 2);
  assert.equal(trap.triggeredAt, game.time);
  run(game, 0.3);
  assert.equal(trapFrame(trap, game.time), 3);
  assert.equal(trap.hp, 8, "Retraction does not regenerate HP");
});

test("a stationary/very slow enemy is hit only once in the same pass", () => {
  const { game, trap, enemies } = battle();
  run(game, 12);
  assert.equal(trap.triggers, 1);
  assert.equal(trap.hp, 9);
  assert.equal(enemies[0].hp, 6);
  assert.equal(trapState(trap, game.time), "idle");
});

test("a previously hit enemy cannot spend another HP on its departure tick", () => {
  const { game, trap, enemies: [enemy] } = battle();
  run(game, 5);
  assert.equal(trapState(trap, game.time), "idle");
  enemy.speed = 1800;
  game.update(STEP);
  assert.equal(trap.triggers, 1);
  assert.equal(enemy.hp, 6);
  game.update(STEP);
  assert.equal(trap.hitIds.size, 0);
});

test("swept contact catches fast enemies crossing the whole footprint in a tick", () => {
  const { game, trap, enemies: [swift, idle] } = battle(["swift", "normal"]);
  swift.distance = trap.distance - 50;
  swift.speed = 6000;
  idle.distance = 0;
  const gold = game.gold;
  game.update(STEP);
  assert.equal(swift.status, "dead");
  assert.equal(game.gold, gold + ENEMIES.swift.reward);
  assert.equal(trap.kills, 1);
  assert.equal(trap.totalDamage, ENEMIES.swift.hp, "Overkill is not credited twice");
  assert.equal(trap.triggers, 1);
  game.update(STEP);
  assert.equal(trap.hitIds.size, 0, "Departed/dead victim IDs are pruned");
});

test("a swept bend crossing chooses the first arrival, independent of array order", () => {
  const game = new LiveGame();
  const trap = build(game, 260, 300).trap;
  trap.hp = 1;
  const later = game.spawn("swift", 1), earlier = game.spawn("swift", 1);
  later.distance = trap.distance - 25;
  earlier.distance = trap.distance - 18;
  later.speed = earlier.speed = 1800;
  game.update(STEP);
  assert.equal(earlier.status, "dead");
  assert.equal(later.hp, later.maxHp);
  assert.equal(trap.triggers, 1);
});

test("another passing enemy is hit without waiting for a cooldown", () => {
  const { game, trap, enemies: [first, second] } = battle(["normal", "normal"]);
  second.distance = trap.distance - 50;
  game.update(STEP);
  second.speed = 148;
  run(game, 5);
  assert.equal(trap.triggers, 2);
  assert.equal(trap.hp, 8);
  assert.equal(first.hp, 6);
  assert.equal(second.hp, 6);
});

for (const kind of Object.keys(ENEMIES)) {
  test(`trap contact follows existing damage/armor rules for ${kind}`, () => {
    const { game, trap, enemies: [enemy] } = battle([kind]);
    const initial = enemy.hp;
    const expected = Math.min(initial, def.damage * (1 - game.armorFor(enemy)));
    game.update(STEP);
    assert.ok(Math.abs(enemy.hp - Math.max(0, initial - expected)) < 1e-8);
    assert.ok(Math.abs(trap.totalDamage - expected) < 1e-8);
    assert.equal(trap.triggers, 1);
    assert.equal(trap.hp, 9, "Every enemy type costs exactly one HP");
    assert.equal(enemy.lastHit, game.time);
  });
}

test("boss pulse, vulnerability and regeneration keep their existing semantics", () => {
  const bossBattle = battle(["boss"]);
  bossBattle.enemies[0].age = 4;
  bossBattle.game.update(STEP);
  assert.ok(Math.abs(bossBattle.trap.totalDamage - 22.4) < 1e-8);
  const vulnerable = battle();
  vulnerable.enemies[0].vulnerability = 0.12;
  vulnerable.enemies[0].vulnerableUntil = 10;
  vulnerable.game.update(STEP);
  assert.ok(Math.abs(vulnerable.trap.totalDamage - 35.84) < 1e-8);
  const regen = battle(["regen"]);
  regen.game.update(STEP);
  const damagedHp = regen.enemies[0].hp;
  run(regen.game, 1.9);
  assert.equal(regen.enemies[0].hp, damagedHp);
  run(regen.game, 0.3);
  assert.ok(regen.enemies[0].hp > damagedHp);
  assert.equal(regen.trap.triggers, 1);
});

test("traps cannot target/upgrade and do not receive relay auras", () => {
  const { game, trap } = battle();
  game.gold = 1000;
  assert.equal(game.place("relay", ...coord(200, 220)).ok, true);
  assert.equal(game.upgrade(trap.id, 0).ok, false);
  assert.equal(game.setTargeting(trap.id, "Strong"), false);
  game.update(STEP);
  assert.equal(trap.totalDamage, 32);
  assert.equal(game.towers.length, 1);
});

test("dead, absorbing and off-footprint enemies cannot activate a trap", () => {
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
  assert.equal(trap.triggers, 0, "Boss sprite/radius does not enlarge the trigger zone");
});

test("pause freezes trap HP, animation and damage but permits planning and sales", () => {
  const { game, trap, enemies } = battle();
  game.update(STEP);
  const state = { time: game.time, hp: enemies[0].hp, trapHp: trap.hp,
    triggers: trap.triggers, frame: trapFrame(trap, game.time) };
  game.setPaused(true);
  new GameClock().advance(game, 20);
  game.update(20);
  updateTraps(game);
  assert.deepEqual({ time: game.time, hp: enemies[0].hp, trapHp: trap.hp,
    triggers: trap.triggers, frame: trapFrame(trap, game.time) }, state);
  const second = build(game, 244).trap;
  assert.ok(second);
  assert.equal(second.triggers, 0);
  assert.equal(game.sell(second.id).value, 35);
  game.setPaused(false);
  run(game, 0.3);
  assert.equal(trapFrame(trap, game.time), 3);
});

test("1x/2x/3x at 20/60/120 FPS produce identical trap combat and animation state", () => {
  const snapshots = [];
  for (const speed of [1, 2, 3]) for (const fps of [20, 60, 120]) {
    const game = new LiveGame(), clock = new GameClock();
    for (const x of [84, 128, 172, 216]) assert.equal(build(game, x).ok, true);
    game.startWave();
    game.setSpeed(speed);
    for (let i = 0; i < 24 * fps / speed; i++) clock.advance(game, 1 / fps);
    snapshots.push({ time: game.time, gold: game.gold, kills: game.kills,
      totalDamage: game.totalDamage, lives: game.lives,
      enemies: game.enemies.map((e) => [e.id, e.hp, e.distance]),
      traps: game.traps.map((t) => [t.id, t.triggers, t.totalDamage, t.hp,
        [...t.hitIds], trapFrame(t, game.time)]) });
  }
  for (const state of snapshots.slice(1)) assert.deepEqual(state, snapshots[0]);
});

test("selling an unused trap refunds 70% once and preserves another selection", () => {
  const { game, trap } = battle();
  const tower = game.place("repeater", ...coord(200, 240)).tower;
  assert.equal(game.selected, tower);
  assert.equal(game.sell(trap.id).value, 35);
  assert.equal(game.selected, tower);
  assert.equal(game.sell(trap.id).ok, false);
  game.update(STEP);
  assert.equal(trap.triggers, 0);
  assert.equal(game.traps.length, 0);
});

test("restart removes all trap state and terminal games stop trigger/sell/build actions", () => {
  const { game, trap } = battle();
  game.update(STEP);
  game.finish("lost");
  run(game, 10);
  assert.equal(trap.triggers, 1);
  assert.equal(game.sell(trap.id).ok, false);
  assert.equal(build(game, 244).ok, false);
  game.reset();
  assert.equal(game.traps.length, 0);
  assert.equal(game.towers.length, 0);
  assert.equal(game.enemies.length, 0);
  assert.equal(game.selectedId, null);
  assert.equal(game.gold, 240);
  assert.equal(game.time, 0);
  assert.equal(game.nextId, 1);
  assert.equal(build(game).trap.id, 1);
});

test("Easy naturally changes resources, enemy HP and rewards without altering the trap", () => {
  applyDifficulty("easy");
  const { game, trap, enemies: [enemy] } = battle();
  assert.equal(game.gold, 250);
  assert.equal(enemy.maxHp, 38 * 0.82);
  game.update(STEP);
  assert.equal(trap.kills, 1);
  assert.equal(trap.totalDamage, 38 * 0.82);
  assert.equal(def.cost, 50);
  assert.equal(def.hp, 10);
  assert.equal(trap.hp, 9);
  applyDifficulty("normal");
});


test("the final hit is credited, then depletion removes the trap and frees its road space", () => {
  const { game, trap, enemies: [enemy] } = battle(["swift"]);
  trap.hp = 1;
  game.update(STEP);
  assert.equal(enemy.status, "dead");
  assert.equal(trap.hp, 0);
  assert.equal(trap.kills, 1);
  assert.equal(trap.totalDamage, enemy.maxHp);
  assert.equal(trapState(trap, game.time), "depleted");
  assert.equal(trapFrame(trap, game.time), 0, "The final strike is visible");
  assert.equal(game.sellValue(trap), 0);
  assert.equal(game.selected, trap);
  run(game, (Math.ceil(def.attackTime / STEP) - 1) * STEP);
  assert.equal(game.traps.length, 1);
  game.update(STEP);
  assert.equal(game.traps.length, 0);
  assert.equal(game.selected, null);
  assert.equal(game.selectedId, null);
  assert.equal(build(game, trap.x, trap.y).ok, true);
});

test("depletion keeps a different selection and cannot regenerate or grant a refund", () => {
  const { game, trap } = battle();
  trap.hp = 1;
  const other = build(game, 244).trap;
  const credits = game.gold;
  game.update(STEP);
  run(game, 5);
  assert.equal(game.selected, other);
  assert.equal(game.traps.includes(trap), false);
  assert.equal(game.gold, credits);
  assert.equal(game.sell(trap.id).ok, false);
  assert.equal(trap.triggers, 1);
});

test("pause freezes the final strike and defers depletion cleanup until resume", () => {
  const { game, trap } = battle();
  trap.hp = 1;
  game.update(STEP);
  game.setPaused(true);
  new GameClock().advance(game, 10);
  updateTraps(game);
  assert.equal(game.traps[0], trap);
  assert.equal(trapFrame(trap, game.time), 0);
  game.setPaused(false);
  run(game, Math.ceil(def.attackTime / STEP) * STEP);
  assert.equal(game.traps.length, 0);
});

test("a used trap's resale value follows remaining HP, while tower refunds stay unchanged", () => {
  const { game, trap } = battle();
  const tower = game.place("repeater", ...coord(200, 240)).tower;
  game.update(STEP);
  assert.equal(trap.hp, 9);
  assert.equal(game.sellValue(trap), 31);
  assert.equal(game.sellValue(tower), 42);
  const credits = game.gold;
  assert.equal(game.sell(trap.id).value, 31);
  assert.equal(game.gold, credits + 31);
  assert.equal(game.sell(trap.id).ok, false);
});
