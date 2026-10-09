import test from "node:test";
import assert from "node:assert/strict";
import { Game, GameClock, STEP } from "../js/engine.js";
import { TOWERS, ENEMIES, towerStats, upgradeOption } from "../js/data.js";
import { PATH_LENGTH, pointOnPath, ROAD } from "../js/map.js";
import { WAVES, previewWave, waveSpawns } from "../js/waves.js";
function fixture(kinds = ["normal"]) {
  const g = new Game();
  g.wave = 1;
  g.status = "wave";
  g.encounters.set(1, { pending: 0, alive: kinds.length });
  const enemies = kinds.map((k) => g.spawn(k, 1));
  return { g, enemies };
}
function run(g, seconds) {
  for (let i = 0; i < Math.round(seconds / STEP); i++) g.update(STEP);
}
test("startup and placement are validated atomically", () => {
  const g = new Game();
  assert.equal(g.gold, 240);
  assert.equal(g.lives, 30);
  for (const [kind, x, y] of [
    ["repeater", 0, 7],
    ["repeater", 1, 1],
    ["repeater", -1, 2],
    ["repeater", 24, 2],
    ["missing", 4, 4],
    ["repeater", 1.1, 2],
  ])
    assert.equal(g.place(kind, x, y).ok, false);
  assert.equal(g.gold, 240);
  const t = g.place("repeater", 5, 6).tower;
  assert.ok(t);
  assert.equal(g.gold, 180);
  assert.equal(g.place("sniper", 5, 6).ok, false);
  assert.equal(
    g.placement("repeater", 5, 6).reason,
    "Här står redan ett torn.",
  );
  g.gold = 0;
  assert.equal(g.place("sniper", 6, 6).ok, false);
});
test("stable selection survives removal of an earlier tower", () => {
  const g = new Game();
  const a = g.place("repeater", 5, 6).tower,
    b = g.place("repeater", 4, 6).tower;
  g.select(b.id);
  assert.equal(g.sell(a.id).value, 42);
  assert.equal(g.selected, b);
  assert.equal(g.sell(a.id).ok, false);
  assert.equal(g.sell(b.id).ok, true);
  assert.equal(g.selected, null);
});
test("both level-one upgrades coexist; tier two locks the other path", () => {
  const g = new Game();
  g.gold = 10000;
  const t = g.place("repeater", 5, 6).tower;
  for (const p of [0, 1, 0]) assert.equal(g.upgrade(t.id, p).ok, true);
  assert.deepEqual(t.levels, [2, 1]);
  assert.equal(upgradeOption(t, 1).locked, true);
  const gold = g.gold;
  assert.equal(g.upgrade(t.id, 1).ok, false);
  assert.equal(g.gold, gold);
  assert.equal(g.upgrade(t.id, 0).ok, true);
  assert.equal(g.upgrade(t.id, 0).ok, false);
  assert.equal(g.upgrade(t.id, 99).ok, false);
  assert.equal(g.sellValue(t), Math.floor(t.spent * 0.7));
});
test("all 42 tiers produce finite statistics and correct investment", () => {
  for (const kind of Object.keys(TOWERS))
    for (const path of [0, 1]) {
      const g = new Game();
      g.gold = 10000;
      const t = g.place(kind, 5, 6).tower;
      for (let level = 1; level <= 3; level++) {
        assert.equal(g.upgrade(t.id, path).ok, true);
        const s = towerStats(t);
        for (const value of Object.values(s))
          assert.ok(typeof value === "boolean" || Number.isFinite(value));
        assert.equal(t.levels[path], level);
      }
      assert.ok(t.spent > TOWERS[kind].cost);
    }
});
test("all five targeting modes use distance or HP, with stable ties", () => {
  const { g, enemies } = fixture(["normal", "normal", "normal"]);
  const t = g.place("sniper", 5, 6).tower;
  const [a, b, c] = enemies;
  Object.assign(a, { x: 210, y: 260, distance: 100, hp: 12 });
  Object.assign(b, { x: 230, y: 260, distance: 300, hp: 30 });
  Object.assign(c, { x: 250, y: 260, distance: 200, hp: 20 });
  const s = g.effectiveStats(t);
  for (const [mode, target] of [
    ["First", b],
    ["Last", a],
    ["Strong", b],
    ["Weak", a],
    ["Closest", a],
  ]) {
    assert.ok(g.setTargeting(t.id, mode));
    assert.equal(g.chooseTarget(t, s), target);
  }
  assert.equal(g.setTargeting(t.id, "Invalid"), false);
  a.status = "dead";
  assert.notEqual(g.chooseTarget(t, s), a);
});
test("artillery respects its minimum range", () => {
  const {
    g,
    enemies: [e],
  } = fixture();
  const t = g.place("mortar", 5, 6).tower;
  Object.assign(e, { x: t.x + 10, y: t.y });
  assert.equal(g.chooseTarget(t, g.effectiveStats(t)), null);
  e.x += 100;
  assert.equal(g.chooseTarget(t, g.effectiveStats(t)), e);
});
test("core absorption blocks rewards and additional hits before escape", () => {
  const {
    g,
    enemies: [e, other],
  } = fixture(["normal", "tank"]);
  e.distance = PATH_LENGTH - 0.1;
  e.hp = 1;
  const t = g.place("repeater", 22, 6).tower;
  const gold = g.gold;
  g.projectiles.push({
    id: 500,
    x: 939,
    y: 300,
    sourceId: t.id,
    targetId: e.id,
    kind: t.kind,
    stats: towerStats(t),
    age: 0,
    life: 1,
  });
  g.update(STEP);
  assert.equal(e.status, "absorbing");
  assert.equal(g.lives, 30);
  assert.equal(g.gold, gold);
  assert.equal(g.damage(e, 999, 1, t.id), 0);
  assert.equal(g.kills, 0);
  run(g, 0.35);
  assert.equal(e.status, "escaped");
  assert.equal(g.lives, 29);
  assert.equal(g.gold, gold);
  assert.ok(other.status === "active");
});
test("kill reward and actual damage are counted once, including overkill", () => {
  const {
    g,
    enemies: [e],
  } = fixture();
  const t = g.place("sniper", 5, 6).tower;
  const gold = g.gold;
  g.damage(e, 10000, 1, t.id);
  g.damage(e, 10000, 1, t.id);
  assert.equal(g.gold, gold + e.reward);
  assert.equal(t.kills, 1);
  assert.equal(t.totalDamage, e.maxHp);
  assert.equal(g.kills, 1);
});
test("pansarbrytning counteracts armor and boss pulse", () => {
  const {
    g,
    enemies: [a, b],
  } = fixture(["armored", "armored"]);
  const normal = g.damage(a, 20, 0);
  const piercing = g.damage(b, 20, 1);
  assert.ok(piercing > normal * 2);
  assert.equal(piercing, 20);
  const boss = g.spawn("boss", 10);
  assert.equal(g.armorFor(boss), 0.5);
  boss.age = 4;
  assert.equal(g.armorFor(boss), 0.3);
});
test("slow, burn and vulnerability do not stack or refresh stronger effects from weaker hits", () => {
  const {
    g,
    enemies: [e],
  } = fixture(["tank"]);
  const strong = {
    sourceId: null,
    stats: {
      damage: 0,
      penetration: 0,
      slow: 0.6,
      slowTime: 2,
      burn: 10,
      burnTime: 3,
      vulnerability: 0.3,
    },
  };
  g.hit(e, strong);
  g.time = 1;
  g.hit(e, {
    sourceId: null,
    stats: {
      damage: 0,
      penetration: 0,
      slow: 0.2,
      slowTime: 3,
      burn: 5,
      burnTime: 4,
      vulnerability: 0.1,
    },
  });
  assert.equal(e.slow, 0.6);
  assert.equal(e.slowUntil, 2);
  assert.equal(e.burn, 10);
  assert.equal(e.burnUntil, 3);
  assert.equal(e.vulnerability, 0.3);
  assert.equal(e.vulnerableUntil, 2.5);
});
test("regeneration has a post-hit delay and cannot exceed max HP", () => {
  const {
    g,
    enemies: [e],
  } = fixture(["regen"]);
  g.damage(e, 30, 1);
  const hp = e.hp;
  run(g, 1);
  assert.equal(e.hp, hp);
  run(g, 2);
  assert.ok(e.hp > hp);
  run(g, 8);
  assert.ok(e.hp <= e.maxHp);
});
test("boss slow resistance prevents permanent immobilization", () => {
  const {
    g,
    enemies: [e],
  } = fixture(["boss"]);
  e.slow = 0.7;
  e.slowUntil = 99;
  run(g, 1);
  assert.ok(e.distance >= e.speed * 0.7);
});
test("support uses the strongest aura, without additive stacking", () => {
  const g = new Game();
  g.gold = 10000;
  const t = g.place("repeater", 5, 6).tower;
  const a = g.place("relay", 4, 6).tower;
  const once = g.effectiveStats(t);
  g.place("relay", 5, 5);
  assert.equal(g.effectiveStats(t).damage, once.damage);
  g.upgrade(a.id, 0);
  assert.ok(g.effectiveStats(t).damage > once.damage);
  assert.equal(towerStats(t).damage, TOWERS.repeater.damage);
});
test("movement crosses corners without losing travel distance", () => {
  const {
    g,
    enemies: [e],
  } = fixture();
  run(g, 6);
  assert.ok(Math.abs(e.distance - e.speed * 6) < 1e-8);
  const pos = pointOnPath(e.distance);
  assert.equal(e.x, pos.x);
  assert.equal(e.y, pos.y);
  assert.ok(ROAD.has(`${Math.floor(e.x / 40)},${Math.floor(e.y / 40)}`));
});
test("pause freezes simulation but allows purchases, upgrades and sales", () => {
  const g = new Game();
  g.startWave();
  g.setPaused(true);
  const before = JSON.stringify([g.time, g.spawnQueue]);
  run(g, 2);
  assert.equal(JSON.stringify([g.time, g.spawnQueue]), before);
  const t = g.place("repeater", 5, 6).tower;
  assert.equal(g.upgrade(t.id, 0).ok, true);
  assert.equal(g.sell(t.id).ok, true);
});
test("1x / 2x / 3x and 20 / 60 / 120 FPS produce the same simulation", () => {
  let reference;
  for (const speed of [1, 2, 3])
    for (const fps of [20, 60, 120]) {
      const g = new Game(),
        clock = new GameClock();
      g.place("repeater", 5, 6);
      g.startWave();
      g.setSpeed(speed);
      for (let f = 0; f < (12 / speed) * fps; f++) clock.advance(g, 1 / fps);
      const snapshot = JSON.stringify({
        time: g.time,
        gold: g.gold,
        kills: g.kills,
        enemies: g.enemies.map((e) => [e.id, e.hp, e.distance]),
        projectiles: g.projectiles.map((p) => [p.id, p.x, p.y]),
      });
      reference ??= snapshot;
      assert.equal(snapshot, reference, `${speed}x at ${fps}fps`);
    }
});
test("early starts require completed spawning, cap concurrency and award only once", () => {
  const g = new Game();
  assert.equal(g.startWave().ok, true);
  assert.equal(g.startWave().ok, false);
  run(g, 8);
  assert.equal(g.spawnQueue.length, 0);
  const gold = g.gold,
    result = g.startWave();
  assert.equal(result.ok, true);
  assert.ok(result.bonus > 0 && result.bonus <= 25);
  assert.equal(g.gold, gold + result.bonus);
  assert.equal(g.startWave().ok, false);
  assert.equal(g.encounters.size, 2);
});
test("loss waits for core absorption, then stops rules; restart clears all state", () => {
  const {
    g,
    enemies: [e],
  } = fixture(["boss"]);
  g.lives = 1;
  e.distance = PATH_LENGTH - 0.01;
  g.update(STEP);
  assert.equal(e.status, "absorbing");
  assert.equal(g.status, "wave");
  assert.equal(g.lives, 1);
  run(g, 0.35);
  assert.equal(g.status, "lost");
  assert.equal(g.lives, 0);
  const time = g.time;
  run(g, 5);
  assert.equal(g.time, time);
  assert.equal(g.place("repeater", 5, 6).ok, false);
  assert.equal(g.startWave().ok, false);
  g.reset();
  assert.equal(g.status, "build");
  assert.equal(g.gold, 240);
  assert.equal(g.enemies.length, 0);
  assert.equal(g.events.length, 0);
  assert.equal(g.encounters.size, 0);
  assert.equal(g.selectedId, null);
  assert.equal(g.speed, 1);
});
test("full campaign terminates in victory, with 30 rewards and no duplicate wave completion", () => {
  const g = new Game();
  for (let wave = 1; wave <= 30; wave++) {
    assert.equal(g.startWave().ok, true);
    let iterations = 0;
    while (g.encounters.size && iterations++ < 10000) {
      g.update(STEP);
      for (const e of g.enemies) g.damage(e, 1e9, 1);
    }
    assert.ok(iterations < 10000);
    assert.equal(g.wavesCleared, wave);
  }
  assert.equal(g.status, "won");
  assert.equal(g.wave, 30);
  assert.equal(g.startWave().ok, false);
  const gold = g.gold;
  run(g, 5);
  assert.equal(g.gold, gold);
});
test("wave preview, spawn schedule and advertised roster agree", () => {
  assert.equal(WAVES.length, 30);
  for (let n = 1; n <= 30; n++) {
    const preview = previewWave(n),
      spawns = waveSpawns(n);
    assert.equal(preview.total, spawns.length);
    for (let i = 0; i < spawns.length; i++) {
      assert.ok(ENEMIES[spawns[i].kind]);
      if (i) assert.ok(spawns[i].at >= spawns[i - 1].at);
    }
    assert.equal(preview.boss, n % 10 === 0);
  }
  assert.equal(previewWave(31), null);
});
test("high rate towers carry fractional cooldown remainder forward", () => {
  const {
    g,
    enemies: [e],
  } = fixture(["tank"]);
  g.gold = 10000;
  const t = g.place("gatling", 5, 6).tower;
  t.levels = [3, 1];
  e.maxHp = e.hp = 1e9;
  e.speed = 0;
  e.distance = 200;
  Object.assign(e, pointOnPath(200));
  let shots = 0;
  for (let i = 0; i < 600; i++) {
    g.update(STEP);
    shots += g.drainEvents().filter((e) => e.type === "shot").length;
  }
  assert.ok(Math.abs(shots - g.effectiveStats(t).rate * 10) <= 2);
});