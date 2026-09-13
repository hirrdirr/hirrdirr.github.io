import { WORLD } from "./data.js";
export const PATH = [
  [0.5, 7.5],
  [6.5, 7.5],
  [6.5, 3.5],
  [15.5, 3.5],
  [15.5, 11.5],
  [21.5, 11.5],
  [21.5, 7.5],
  [23.5, 7.5],
].map(([x, y]) => ({ x: x * WORLD.tile, y: y * WORLD.tile }));
export const SEGMENTS = PATH.slice(1).map((b, i) => ({
  a: PATH[i],
  b,
  length: Math.hypot(b.x - PATH[i].x, b.y - PATH[i].y),
}));
export const PATH_LENGTH = SEGMENTS.reduce((n, s) => n + s.length, 0);
export const ROAD = new Set();
for (const { a, b } of SEGMENTS) {
  const n = Math.round(Math.hypot(b.x - a.x, b.y - a.y) / WORLD.tile);
  for (let i = 0; i <= n; i++) {
    ROAD.add(
      `${Math.floor((a.x + ((b.x - a.x) * i) / n) / WORLD.tile)},${Math.floor((a.y + ((b.y - a.y) * i) / n) / WORLD.tile)}`,
    );
  }
}
export const BLOCKED = new Set([
  "1,1",
  "2,1",
  "1,2",
  "2,2",
  "19,1",
  "20,1",
  "19,2",
  "20,2",
  "3,12",
  "4,12",
  "3,13",
  "4,13",
  "10,10",
  "11,10",
  "10,11",
  "11,11",
]);
export function pointOnPath(distance) {
  let remaining = Math.max(0, distance);
  for (const s of SEGMENTS) {
    if (remaining <= s.length)
      return {
        x: s.a.x + ((s.b.x - s.a.x) * remaining) / s.length,
        y: s.a.y + ((s.b.y - s.a.y) * remaining) / s.length,
        angle: Math.atan2(s.b.y - s.a.y, s.b.x - s.a.x),
      };
    remaining -= s.length;
  }
  return { ...PATH.at(-1), angle: 0 };
}
export const distanceSquared = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
