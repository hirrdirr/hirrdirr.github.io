// Deterministic baseline strategies, not a claim of optimal play.
import { Game, STEP } from "../js/engine.js";
import { upgradeOption } from "../js/data.js";
const positions = [
  [5, 6],
  [7, 4],
  [14, 4],
  [16, 10],
  [20, 10],
  [20, 7],
  [7, 6],
  [14, 2],
  [16, 4],
  [20, 12],
  [5, 4],
  [17, 10],
];
const strategies = {
  mixed: [
    "repeater",
    "repeater",
    "sniper",
    "cannon",
    "cryo",
    "gatling",
    "mortar",
    "sniper",
    "relay",
    "cannon",
    "repeater",
    "gatling",
  ],
  "repeater-only": Array(12).fill("repeater"),
  "sniper-only": Array(12).fill("sniper"),
  "gatling-only": Array(12).fill("gatling"),
};
const output = [];
for (const [name, kinds] of Object.entries(strategies)) {
  const g = new Game(),
    built = [];
  let next = 0,
    actions = 0,
    frames = 0,
    peakEnemies = 0,
    peakProjectiles = 0;
  const start = performance.now();
  function spend() {
    // Place a core of four, then alternate expansion and affordable upgrades.
    for (let guard = 0; guard < 30; guard++) {
      if (next < kinds.length && (next < 4 || next <= g.wave / 2 + 3)) {
        const [x, y] = positions[next],
          r = g.place(kinds[next], x, y);
        if (!r.ok) break;
        built.push(r.tower);
        next++;
        actions++;
        continue;
      }
      const candidate = built
        .map((t) => ({
          t,
          p: t.kind === "cryo" ? 0 : t.kind === "mortar" ? 1 : 0,
        }))
        .map((o) => ({ ...o, upgrade: upgradeOption(o.t, o.p) }))
        .filter((o) => o.upgrade && !o.upgrade.maxed && !o.upgrade.locked)
        .sort(
          (a, b) =>
            a.t.levels[a.p] - b.t.levels[b.p] ||
            a.upgrade.cost - b.upgrade.cost,
        )[0];
      if (candidate && candidate.upgrade.cost <= g.gold) {
        g.upgrade(candidate.t.id, candidate.p);
        actions++;
        continue;
      }
      if (next < kinds.length) {
        const [x, y] = positions[next],
          r = g.place(kinds[next], x, y);
        if (r.ok) {
          built.push(r.tower);
          next++;
          actions++;
          continue;
        }
      }
      break;
    }
  }
  while (!g.terminal && frames < 300000) {
    if (!g.encounters.size) {
      spend();
      g.startWave();
    }
    g.update(STEP);
    g.drainEvents();
    frames++;
    peakEnemies = Math.max(peakEnemies, g.enemies.length);
    peakProjectiles = Math.max(peakProjectiles, g.projectiles.length);
  }
  output.push({
    strategy: name,
    status: g.status,
    wave: g.wave,
    cleared: g.wavesCleared,
    lives: g.lives,
    kills: g.kills,
    spent: g.towers.reduce((s, t) => s + t.spent, 0),
    unspent: g.gold,
    simulatedSeconds: Math.round(g.time),
    computeMs: Math.round(performance.now() - start),
    peakEnemies,
    peakProjectiles,
    towers: g.towers.length,
  });
}
console.log(JSON.stringify(output, null, 2));
