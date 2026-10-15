// Repeatable balance probes using the actual live free-placement rules.
// These compare fixed budgets/positions, not optimal play or a full balance proof.
import { Game, STEP } from "../js/engine.js";
import assert from "node:assert/strict";
import { WORLD, TOWERS, upgradeOption } from "../js/data.js";
import { TRAPS } from "../js/traps.js";
import { enableFreePlacement } from "../js/free-placement.js";
import { pointOnPath } from "../js/map.js";
import { applyDifficulty } from "../js/difficulty.js";

class LiveGame extends Game {}
enableFreePlacement(LiveGame);
const coord = (x, y) => [x / WORLD.tile - 0.5, y / WORLD.tile - 0.5];
const towers = [[200, 240], [320, 200], [560, 200], [680, 400], [800, 400], [800, 260]];
const strategies = {
  "3 compact spikes": { spikes: 3, towers: 0 },
  "1 repeater": { spikes: 0, towers: 1 },
  "9 compact spikes": { spikes: 9, towers: 0 },
  "3 repeaters": { spikes: 0, towers: 3 },
  "15 compact spikes": { spikes: 15, towers: 0 },
  "5 repeaters": { spikes: 0, towers: 5 },
  "2 spikes + 2 repeaters": { spikes: 2, towers: 2 },
};
const results = [];
for (const difficulty of ["normal", "easy"]) {
  applyDifficulty(difficulty);
  for (const [name, composition] of Object.entries(strategies)) {
    const game = new LiveGame();
    // The 300-credit probes are deliberately above Normal's starting budget.
    // No purchases are made after this fixed defense is constructed.
    const budget = Math.max(WORLD.gold,
      composition.spikes * TRAPS.spike.cost + composition.towers * TOWERS.repeater.cost);
    game.gold = budget;
    let distance = 64;
    for (let i = 0; i < composition.spikes; i++) {
      // Use the nearest legal position: world-space spacing can be wider at bends.
      for (;;) {
        assert.ok(distance < 1450, "Compact probe must fit on the existing road");
        const p = pointOnPath(distance++);
        if (!game.place("spike", ...coord(p.x, p.y)).ok) continue;
        distance += TRAPS.spike.spacing - 1;
        break;
      }
    }
    for (let i = 0; i < composition.towers; i++) {
      if (!game.place("repeater", ...coord(...towers[i])).ok) throw Error("Invalid tower probe");
    }
    const placedTraps = [...game.traps];
    const spent = budget - game.gold;
    let frames = 0;
    while (!game.terminal && game.wave < 11 && frames < 150000) {
      if (!game.encounters.size) game.startWave();
      game.update(STEP);
      game.drainEvents();
      frames++;
    }
    results.push({ difficulty, strategy: name, spent, cleared: game.wavesCleared,
      wave: game.wave, lives: game.lives, kills: game.kills,
      trapDamage: Math.round(placedTraps.reduce((sum, t) => sum + t.totalDamage, 0)),
      towerDamage: Math.round(game.towers.reduce((sum, t) => sum + t.totalDamage, 0)),
      triggers: placedTraps.reduce((sum, t) => sum + t.triggers, 0) });
    assert.ok(frames < 150000, "Fixed-defense simulation must terminate");
    assert.ok(game.gold >= 0);
    assert.ok(placedTraps.every((t) => t.hp >= 0 && t.triggers <= t.maxHp));
  }
}
applyDifficulty("normal");
console.table(results);
for (const difficulty of ["normal", "easy"]) {
  const result = (name) => results.find((r) => r.difficulty === difficulty && r.strategy === name);
  assert.ok(result("3 compact spikes").cleared < result("1 repeater").cleared);
  assert.equal(result("3 compact spikes").spent, result("1 repeater").spent);
  assert.equal(result("9 compact spikes").spent, result("3 repeaters").spent);
  assert.equal(result("15 compact spikes").spent, result("5 repeaters").spent);
  assert.ok(result("9 compact spikes").cleared < result("3 repeaters").cleared,
    `${difficulty}: compact road traps must not replace sustained tower defense`);
  assert.ok(result("15 compact spikes").cleared < result("5 repeaters").cleared,
    `${difficulty}: equal-budget compact stacking must remain weaker than towers`);
  assert.ok(result("2 spikes + 2 repeaters").trapDamage > 0);
  assert.ok(result("2 spikes + 2 repeaters").cleared >= result("9 compact spikes").cleared);
}

// Full campaigns use earned credits, all seven tower types, upgrades and four
// supporting traps added over time. Fixed decisions make this reproducible.
const campaignPositions = [...towers, [320, 280], [560, 80], [680, 180],
  [800, 520], [200, 160], [720, 400]];
const kinds = ["repeater", "repeater", "sniper", "cannon", "cryo", "gatling",
  "mortar", "sniper", "relay", "cannon", "repeater", "gatling"];
const campaigns = [];
for (const difficulty of ["normal", "easy"]) {
  applyDifficulty(difficulty);
  const game = new LiveGame();
  let next = 0, frames = 0, upgrades = 0;
  const placedTraps = [];
  function spend() {
    const trapDistances = [64, 152, 330, 560];
    const wanted = Math.min(4, 1 + Math.floor(game.wave / 6));
    if (placedTraps.length < wanted && game.gold >= TRAPS.spike.cost) {
      const p = pointOnPath(trapDistances[placedTraps.length]);
      const placed = game.place("spike", ...coord(p.x, p.y));
      assert.ok(placed.ok);
      placedTraps.push(placed.trap);
    }
    for (let guard = 0; guard < 30; guard++) {
      if (next < kinds.length && (next < 4 || next <= game.wave / 2 + 3)) {
        const result = game.place(kinds[next], ...coord(...campaignPositions[next]));
        if (!result.ok) break;
        next++;
        continue;
      }
      const candidate = game.towers
        .map((t) => ({ t, path: t.kind === "mortar" ? 1 : 0 }))
        .map((o) => ({ ...o, option: upgradeOption(o.t, o.path) }))
        .filter((o) => o.option && !o.option.maxed && !o.option.locked)
        .sort((a, b) => a.t.levels[a.path] - b.t.levels[b.path] || a.option.cost - b.option.cost)[0];
      if (candidate && candidate.option.cost <= game.gold) {
        assert.ok(game.upgrade(candidate.t.id, candidate.path).ok);
        upgrades++;
        continue;
      }
      if (next < kinds.length && game.place(kinds[next], ...coord(...campaignPositions[next])).ok) {
        next++;
        continue;
      }
      break;
    }
  }
  while (!game.terminal && frames < 300000) {
    if (!game.encounters.size) { spend(); game.startWave(); }
    game.update(STEP);
    game.drainEvents();
    frames++;
  }
  const trapDamage = placedTraps.reduce((sum, trap) => sum + trap.totalDamage, 0);
  campaigns.push({ difficulty, status: game.status, cleared: game.wavesCleared,
    lives: game.lives, kills: game.kills, upgrades, trapsPurchased: placedTraps.length, trapsRemaining: game.traps.length,
    trapDamage: Math.round(trapDamage), credits: game.gold });
  assert.equal(game.status, "won", `${difficulty}: mixed defense must complete the campaign`);
  assert.equal(game.wavesCleared, 30);
  assert.equal(new Set(game.towers.map((t) => t.kind)).size, 7);
  assert.equal(placedTraps.length, 4);
  assert.ok(placedTraps.every((t) => t.hp >= 0 && t.triggers <= t.maxHp));
  assert.ok(trapDamage > 0 && upgrades > 0 && game.gold >= 0);
}
applyDifficulty("normal");
console.table(campaigns);
