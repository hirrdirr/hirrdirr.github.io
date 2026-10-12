import { WORLD, TOWERS } from "./data.js";
import { SEGMENTS, BLOCKED } from "./map.js";

export const PLACEMENT = Object.freeze({
  towerRadius: 16,
  towerGap: 2,
  pathHalfWidth: 27,
  edgeMargin: 17,
});

function pointSegmentDistanceSquared(px, py, a, b) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    lengthSquared = dx * dx + dy * dy;
  if (!lengthSquared) return (px - a.x) ** 2 + (py - a.y) ** 2;
  const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / lengthSquared));
  const x = a.x + dx * t,
    y = a.y + dy * t;
  return (px - x) ** 2 + (py - y) ** 2;
}

function circleTouchesBlocked(x, y, radius) {
  for (const key of BLOCKED) {
    const [gx, gy] = key.split(",").map(Number),
      left = gx * WORLD.tile,
      top = gy * WORLD.tile,
      right = left + WORLD.tile,
      bottom = top + WORLD.tile,
      closestX = Math.max(left, Math.min(x, right)),
      closestY = Math.max(top, Math.min(y, bottom));
    if ((x - closestX) ** 2 + (y - closestY) ** 2 < radius ** 2) return true;
  }
  return false;
}

export function placementPoint(gx, gy) {
  return {
    x: (gx + 0.5) * WORLD.tile,
    y: (gy + 0.5) * WORLD.tile,
  };
}

export function canPlaceAt(game, kind, gx, gy) {
  if (game.terminal) return { ok: false, reason: "Omgången är avslutad." };
  if (!TOWERS[kind]) return { ok: false, reason: "Välj ett torn först." };
  if (!Number.isFinite(gx) || !Number.isFinite(gy))
    return { ok: false, reason: "Välj en plats på spelplanen." };

  const { x, y } = placementPoint(gx, gy),
    radius = PLACEMENT.towerRadius;

  if (
    x < PLACEMENT.edgeMargin ||
    y < PLACEMENT.edgeMargin ||
    x > WORLD.width - PLACEMENT.edgeMargin ||
    y > WORLD.height - PLACEMENT.edgeMargin
  )
    return { ok: false, reason: "För nära kartans kant." };

  const pathClearance = PLACEMENT.pathHalfWidth + radius;
  if (SEGMENTS.some(({ a, b }) => pointSegmentDistanceSquared(x, y, a, b) < pathClearance ** 2))
    return { ok: false, reason: "Vägen måste hållas fri." };

  if (circleTouchesBlocked(x, y, radius))
    return { ok: false, reason: "Terrängen blockerar den här platsen." };

  const towerClearance = radius * 2 + PLACEMENT.towerGap;
  if (game.towers.some((tower) => (tower.x - x) ** 2 + (tower.y - y) ** 2 < towerClearance ** 2))
    return { ok: false, reason: "För nära ett annat torn." };

  const missing = TOWERS[kind].cost - game.gold;
  if (missing > 0) return { ok: false, reason: `Saknar ${missing} krediter.` };

  return {
    ok: true,
    reason: `Bygg ${TOWERS[kind].name} · ${TOWERS[kind].cost} krediter`,
    x,
    y,
  };
}

export function enableFreePlacement(GameClass) {
  GameClass.prototype.placement = function placement(kind, gx, gy) {
    return canPlaceAt(this, kind, gx, gy);
  };

  GameClass.prototype.place = function place(kind, gx, gy) {
    const check = this.placement(kind, gx, gy);
    if (!check.ok) return check;
    const t = {
      id: this.nextId++,
      kind,
      gx,
      gy,
      x: check.x,
      y: check.y,
      levels: [0, 0],
      spent: TOWERS[kind].cost,
      targeting: "First",
      kills: 0,
      totalDamage: 0,
      cooldown: 0,
      angle: -Math.PI / 2,
      recoil: 0,
    };
    this.gold -= t.spent;
    this.towers.push(t);
    this.selectedId = t.id;
    this.touch();
    this.emit("build", { x: t.x, y: t.y, color: TOWERS[kind].color });
    return { ok: true, tower: t };
  };
}
