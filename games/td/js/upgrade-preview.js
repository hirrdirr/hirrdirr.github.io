import { TOWERS, upgradeOption } from "./data.js";

const fields = [
  ["damage", "Skada", ""],
  ["rate", "Skott / s", ""],
  ["range", "Räckvidd", ""],
  ["penetration", "Pansarbrytning", "%"],
  ["splash", "Ytradie", ""],
  ["slow", "Bromsning", "%"],
  ["slowTime", "Bromstid", " s"],
  ["burn", "Brandskada", " / s"],
  ["burnTime", "Brandtid", " s"],
  ["vulnerability", "Sårbarhet", "%"],
  ["buffDamage", "Skadebonus", "%"],
  ["buffRate", "Eldbonus", "%"],
];

// Predict a single purchase through the same stat calculation used by combat.
// Copy levels so merely reading the preview never buys or mutates anything.
export function upgradePreview(game, tower, path) {
  if (!tower || !TOWERS[tower.kind]) return [];
  const option = upgradeOption(tower, path);
  if (!option || option.locked || option.maxed) return [];
  const levels = [...tower.levels];
  levels[path]++;
  const before = game.effectiveStats(tower);
  const after = game.effectiveStats({ ...tower, levels });
  return fields
    .filter(([key]) => Math.abs(after[key] - before[key]) > 1e-9)
    .map(([key, label, unit]) => ({
      key, label, unit, before: before[key], after: after[key],
    }));
}
