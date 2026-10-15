import { WORLD } from "./data.js";
import { PATH_LENGTH, distanceSquared, projectOnPath } from "./map.js";

// Separate from TOWERS: no targeting, upgrades, projectiles or support auras.
export const TRAPS = Object.freeze({
  spike: Object.freeze({
    name: "Spike Trap",
    role: "Vägfälla / ett mål",
    description: "Slår en passerande fiende, återarmas automatiskt och hjälper tornen med punktvis vägskada. Pansar minskar skadan.",
    color: "#d3bd8b",
    // Below a Repeater's 60-credit cost, but at most 8 raw DPS versus 19.6.
    // 32 cannot one-shot a Normal drone (38 HP); armor is never bypassed.
    cost: 50,
    damage: 32,
    rearm: 4,
    attackTime: 0.24,
    contactHalfLength: 14,
    spacing: 44,
    roadTolerance: 26,
    gateMargin: 48,
  }),
});

export function trapPlacement(game, kind, gx, gy) {
  if (game.terminal) return { ok: false, reason: "Omgången är avslutad." };
  const def = TRAPS[kind];
  if (!def) return { ok: false, reason: "Välj en fälla först." };
  if (!Number.isFinite(gx) || !Number.isFinite(gy))
    return { ok: false, reason: "Välj en plats på spelplanen." };
  const x = (gx + 0.5) * WORLD.tile, y = (gy + 0.5) * WORLD.tile;
  if (!Number.isFinite(x) || !Number.isFinite(y) ||
      x < 0 || y < 0 || x > WORLD.width || y > WORLD.height)
    return { ok: false, reason: "Välj en plats på spelplanen." };
  const point = projectOnPath(x, y);
  if (point.offsetSquared > def.roadTolerance ** 2)
    return { ok: false, reason: "Spike Trap måste placeras på vägen." };
  // Keep invalid road previews snapped too, e.g. while waiting for credits.
  const unavailable = (reason) => ({ ok: false, ...point, reason });
  if (point.distance < def.gateMargin || point.distance > PATH_LENGTH - def.gateMargin)
    return unavailable("För nära ingången eller kärnan.");
  if (game.traps.some((trap) =>
    Math.abs(trap.distance - point.distance) < def.spacing ||
    distanceSquared(trap, point) < def.spacing ** 2))
    return unavailable("För nära en annan fälla.");
  const missing = def.cost - game.gold;
  if (missing > 0) return unavailable(`Saknar ${missing} krediter.`);
  return { ok: true, ...point, reason: `Bygg Spike Trap på vägen · ${def.cost} krediter` };
}

export function placeTrap(game, kind, gx, gy) {
  const check = trapPlacement(game, kind, gx, gy);
  if (!check.ok) return check;
  const def = TRAPS[kind];
  const trap = {
    id: game.nextId++, kind, entityType: "trap",
    x: check.x, y: check.y, distance: check.distance,
    spent: def.cost, kills: 0, totalDamage: 0, triggers: 0,
    triggeredAt: null, readyAt: game.time, hitIds: new Set(),
  };
  game.gold -= trap.spent;
  game.traps.push(trap);
  game.selectedId = trap.id;
  game.touch();
  game.emit("build", { x: trap.x, y: trap.y, color: def.color });
  return { ok: true, trap };
}

export function trapState(trap, time) {
  const def = TRAPS[trap.kind];
  if (trap.triggeredAt !== null && time - trap.triggeredAt < def.attackTime)
    return "triggered";
  return time + 1e-8 < trap.readyAt ? "rearming" : "armed";
}

export function updateTraps(game) {
  if (game.paused || game.terminal) return;
  for (const trap of game.traps) {
    const def = TRAPS[trap.kind];
    const entry = trap.distance - def.contactHalfLength;
    const exit = trap.distance + def.contactHalfLength;
    // Retain victims until their entire swept interval has left the footprint.
    // Pruning on current distance alone would let a long-stalled victim be hit
    // again on its departure tick after the trap has rearmed.
    for (const id of trap.hitIds) {
      if (!game.enemies.some((e) => e.id === id && e.status === "active" &&
          e.distance >= entry && (e.previousDistance ?? e.distance) <= exit))
        trap.hitIds.delete(id);
    }
    if (game.time + 1e-8 < trap.readyAt) continue;
    let victim = null, firstCrossing = Infinity;
    for (const enemy of game.enemies) {
      if (enemy.status !== "active" || trap.hitIds.has(enemy.id)) continue;
      const previous = enemy.previousDistance ?? enemy.distance;
      // Swept route distance catches fast enemies and corner crossings; no
      // dependence on canvas FPS, enemy sprite size, or overlapping enemy count.
      if (enemy.distance < entry || previous > exit) continue;
      const crossing = Math.max(0, (entry - previous) /
        Math.max(1e-8, enemy.distance - previous));
      if (crossing < firstCrossing ||
          (crossing === firstCrossing && enemy.id < (victim?.id ?? Infinity))) {
        victim = enemy;
        firstCrossing = crossing;
      }
    }
    if (!victim) continue;
    trap.hitIds.add(victim.id);
    trap.triggeredAt = game.time;
    trap.readyAt = game.time + def.rearm;
    trap.triggers++;
    game.damage(victim, def.damage, 0, trap.id);
    game.touch();
    game.emit("impact", { x: trap.x, y: trap.y, radius: 12,
      color: def.color, kind: trap.kind });
  }
}
