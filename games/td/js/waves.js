import { ENEMIES } from "./data.js";
// Hand-authored encounters: escalation comes from composition and timing, not endless HP growth.
const group = (kind, count, gap = 0.65, pause = 1) => ({
  kind,
  count,
  gap,
  pause,
});
const wave = (name, ...groups) => ({ name, groups });
export const WAVES = [
  wave("Första kontakten", group("normal", 10, 0.8)),
  wave("Två fronter", group("normal", 8), group("fast", 4, 0.55)),
  wave("Snabb förflyttning", group("fast", 12, 0.48)),
  wave("Tung transport", group("normal", 8, 0.5), group("tank", 2, 1.5)),
  wave("Pansartest", group("armored", 5, 0.9), group("normal", 10, 0.4)),
  wave("Genombrott", group("fast", 10, 0.4), group("swift", 6, 0.55)),
  wave("Reparation pågår", group("regen", 8, 0.7), group("armored", 6, 0.6)),
  wave(
    "Väktaren",
    group("normal", 12, 0.35),
    group("elite", 1),
    group("fast", 10, 0.45),
  ),
  wave("Tät formation", group("tank", 5, 0.9), group("armored", 12, 0.45)),
  wave(
    "Belägraren",
    group("boss", 1),
    group("normal", 18, 0.55),
    group("fast", 10, 0.4),
  ),
  wave("Efterstöten", group("swift", 18, 0.35), group("regen", 10, 0.55)),
  wave("Stålkolonn", group("armored", 18, 0.5), group("tank", 6, 0.8)),
  wave(
    "Skärmytsling",
    group("fast", 16, 0.3),
    group("elite", 2, 1.2),
    group("swift", 10, 0.3),
  ),
  wave("Återuppbyggnad", group("regen", 18, 0.4), group("armored", 12, 0.4)),
  wave(
    "Väktarpatrull",
    group("elite", 3, 1.5),
    group("tank", 8, 0.7),
    group("fast", 16, 0.3),
  ),
  wave("Överbelastning", group("normal", 30, 0.2), group("swift", 22, 0.3)),
  wave(
    "Hård eskort",
    group("tank", 10, 0.65),
    group("elite", 3, 1.2),
    group("regen", 12, 0.4),
  ),
  wave(
    "Falsk reträtt",
    group("swift", 18, 0.3),
    group("armored", 20, 0.4),
    group("swift", 18, 0.25),
  ),
  wave(
    "Sluten formation",
    group("elite", 4, 1),
    group("regen", 16, 0.4),
    group("tank", 10, 0.6),
  ),
  wave(
    "Järnregenten",
    group("boss", 1),
    group("armored", 22, 0.45),
    group("elite", 3, 1.5),
  ),
  wave("Pulsvåg", group("swift", 28, 0.25), group("fast", 24, 0.25)),
  wave("Pansarbataljon", group("armored", 26, 0.35), group("tank", 14, 0.5)),
  wave("Reparationskedja", group("regen", 24, 0.35), group("elite", 5, 1.1)),
  wave(
    "Dubbelspets",
    group("swift", 20, 0.25),
    group("elite", 5, 0.8),
    group("swift", 20, 0.25),
  ),
  wave(
    "Tung offensiv",
    group("tank", 16, 0.55),
    group("elite", 6, 0.9),
    group("armored", 20, 0.35),
  ),
  wave(
    "Kritisk massa",
    group("normal", 40, 0.16),
    group("regen", 20, 0.3),
    group("swift", 24, 0.25),
  ),
  wave(
    "Pansar och puls",
    group("armored", 30, 0.3),
    group("elite", 6, 0.8),
    group("fast", 24, 0.25),
  ),
  wave(
    "Sista eskort",
    group("tank", 18, 0.5),
    group("regen", 24, 0.3),
    group("elite", 7, 0.8),
  ),
  wave(
    "Stormfront",
    group("swift", 32, 0.22),
    group("elite", 8, 0.7),
    group("armored", 26, 0.3),
  ),
  wave(
    "Kärnbrytaren",
    group("boss", 1),
    group("elite", 6, 1.4),
    group("armored", 24, 0.4),
    group("swift", 24, 0.3),
  ),
];
export function waveScale(number) {
  const act = Math.floor((number - 1) / 10);
  return { hp: [1, 1.8, 2.9][act], speed: [1, 1.06, 1.12][act] };
}
export function waveSpawns(number) {
  const definition = WAVES[number - 1];
  if (!definition) return [];
  let time = 0;
  const result = [];
  for (const group of definition.groups) {
    for (let i = 0; i < group.count; i++) {
      result.push({ kind: group.kind, at: time });
      time += group.gap;
    }
    time += group.pause;
  }
  return result;
}
export const completionReward = (number) => 35 + number * 3;
export function previewWave(number) {
  const w = WAVES[number - 1];
  if (!w) return null;
  const counts = {};
  for (const g of w.groups) counts[g.kind] = (counts[g.kind] || 0) + g.count;
  return {
    name: w.name,
    counts,
    total: Object.values(counts).reduce((a, b) => a + b, 0),
    boss: !!counts.boss,
    descriptions: Object.entries(counts).map(
      ([k, n]) => `${n} ${ENEMIES[k].name}`,
    ),
  };
}
