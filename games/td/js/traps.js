import { WORLD } from "./data.js";
import { PATH_LENGTH, distanceSquared, projectOnPath } from "./map.js";

// Separate from TOWERS: no targeting, upgrades, projectiles or support auras.
export const TRAPS = Object.freeze({
  spike: Object.freeze({
    name: "Spike Trap",
    role: "Läckageskydd / 5 HP",
    description: "Tillfälligt stöd mot läckande fiender. Skadar och bromsar 10% endast på spikarna. Varje passage kostar 1 HP; långvarig kontakt sliter ytterligare 1 HP per sekund. Pansar minskar skadan.",
    color: "#d3bd8b",
    // Short, consumable support: one contact normally costs one HP.
    // Prolonged overlap also consumes HP, so stalled crowds cannot farm damage.
    cost: 20,
    dps: 12,
    slow: 0.1,
    hp: 5,
    contactSeconds: 1,
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
    hp: def.hp, maxHp: def.hp,
    triggeredAt: null, contacts: new Map(),
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
  return trap.hp <= 0 ? "depleted" : "idle";
}

// A separate overlap-only slow never overwrites a tower's timed status effect.
// The strongest slow wins; traps cannot multiply each other's slow or a cryo hit.
export function trapSlowFor(game, enemy) {
  let slow = 0;
  for (const trap of game.traps) {
    const def = TRAPS[trap.kind], contact = trap.contacts.get(enemy.id);
    if (contact && (contact.remaining > 1e-8 || trap.hp > 0) &&
        Math.abs(enemy.distance - trap.distance) < def.contactHalfLength)
      slow = Math.max(slow, def.slow);
  }
  return slow;
}

export function updateTraps(game, dt) {
  if (game.paused || game.terminal || !game.traps.length) return;
  const active = new Map(game.enemies.filter((e) => e.status === "active").map((e) => [e.id, e]));
  for (const trap of game.traps) {
    const def = TRAPS[trap.kind];
    const entry = trap.distance - def.contactHalfLength;
    const exit = trap.distance + def.contactHalfLength;
    for (const id of trap.contacts.keys()) {
      const enemy = active.get(id);
      if (!enemy || (enemy.previousDistance ?? enemy.distance) >= exit || enemy.distance < entry)
        trap.contacts.delete(id);
    }
    const contacts = [];
    for (const enemy of active.values()) {
      if (enemy.status !== "active") continue;
      const previous = enemy.previousDistance ?? enemy.distance;
      const travel = enemy.distance - previous;
      // Integrate only the part of this step inside the 28px road footprint.
      // A fast enemy sweeping the whole trap gets a fractional tick, not a burst.
      const duration = travel > 1e-8
        ? dt * Math.max(0, Math.min(enemy.distance, exit) - Math.max(previous, entry)) / travel
        : (enemy.distance >= entry && enemy.distance < exit ? dt : 0);
      if (duration <= 0) continue;
      const crossing = Math.max(0, (entry - previous) / Math.max(1e-8, travel));
      contacts.push({ enemy, duration, crossing });
    }
    contacts.sort((a, b) => a.crossing - b.crossing || a.enemy.id - b.enemy.id);
    let damaged = false, spent = false;
    for (const { enemy, duration } of contacts) {
      let contact = trap.contacts.get(enemy.id);
      if (!contact) {
        if (trap.hp <= 0) continue;
        contact = { remaining: 0 };
        trap.contacts.set(enemy.id, contact);
        trap.triggers++;
      }
      let remaining = duration;
      while (remaining > 1e-8 && enemy.status === "active") {
        if (contact.remaining <= 1e-8) {
          if (trap.hp <= 0) break;
          trap.hp--;
          spent = true;
          contact.remaining = def.contactSeconds;
        }
        const elapsed = Math.min(remaining, contact.remaining);
        game.damage(enemy, def.dps * elapsed, 0, trap.id);
        contact.remaining = Math.max(0, contact.remaining - elapsed);
        remaining -= elapsed;
        damaged = true;
      }
    }
    if (damaged) {
      // Hold the existing raised pose during contact, then retract normally.
      // Emit once per activation, not 60 particles per second per enemy.
      if (trap.triggeredAt === null || game.time - trap.triggeredAt >= def.attackTime)
        game.emit("impact", { x: trap.x, y: trap.y, radius: 12,
          color: def.color, kind: trap.kind });
      trap.triggeredAt = game.time;
    }
    if (spent) game.touch();
  }
  // The last paid contact gets its full overlap time, even at zero unspent HP.
  // Damage keeps the strike alive; after the final contact the existing pose fades.
  game.traps = game.traps.filter((trap) => {
    if (trap.hp > 0 || game.time - trap.triggeredAt + 1e-8 < TRAPS[trap.kind].attackTime)
      return true;
    if (game.selectedId === trap.id) game.selectedId = null;
    game.touch();
    return false;
  });
}
