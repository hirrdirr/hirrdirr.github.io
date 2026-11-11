import { SPAWN, NPCS } from './data.js';
export const TILE = 32;
export const WIDTH = 1920;
export const HEIGHT = 1280;
export const SAFE = { x: 176, y: 608, w: 528, h: 416 };
export const CAMP = { x: 1184, y: 712, w: 160, h: 104 };
export const inRect = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
export const inSafe = (x, y) => inRect(x, y, SAFE) || inRect(x, y, CAMP);
export const inMarsh = (x, y) => x > 1360 + Math.sin(y / 80) * 25 && y > 738 + Math.sin(x / 80) * 26;
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const riverLeft = y => 1008 + Math.round(Math.sin(y / 210) * 35);
export const isBridge = (x, y) => x >= 952 && x <= 1160 && y >= 608 && y <= 688;
export function terrain(x, y) {
  const river = riverLeft(y);
  if (isBridge(x, y)) return 'bridge';
  if (x >= river && x <= river + 96) return 'water';
  if (x > 1400 && x < 1770 && y > 200 && y < 470) return 'ruin';
  if ((Math.abs(y - 848) < 37 && x > 240 && x < 820) ||
      (Math.abs(x - 800) < 35 && y > 620 && y < 880) ||
      (Math.abs(y - 648) < 33 && x > 770 && x < 1530) ||
      (Math.abs(x - 1504) < 34 && y > 340 && y < 1000) ||
      (Math.abs(x - 1248) < 24 && y > 648 && y < 800) ||
      (Math.abs(y - 784) < 23 && x > 1220 && x < 1510) ||
      (Math.abs(y - 976) < 28 && x > 1480 && x < 1776) ||
      (inRect(x, y, SAFE) && Math.abs(x - 448) < 36 && y > 680 && y < 980)) return 'path';
  if (inMarsh(x, y)) return 'marsh';
  return 'grass';
}
export const BUILDINGS = [
  { x: 288, y: 688, w: 128, h: 94, kind: 'house', roof: 'red' },
  { x: 560, y: 688, w: 144, h: 94, kind: 'house', roof: 'blue' },
  { x: 272, y: 960, w: 112, h: 82, kind: 'house', roof: 'red' },
  { x: 592, y: 976, w: 128, h: 92, kind: 'house', roof: 'red' }
];
export const LANDMARKS = [
  { id: 'fire', kind: 'fire', x: 448, y: 810 },
  { id: 'beacon', kind: 'beacon', x: 1600, y: 280 },
  { id: 'sign', kind: 'sign', x: 736, y: 856 },
  { id: 'chest1', kind: 'chest', x: 800, y: 1056, item: 'potion', quantity: 2 },
  { id: 'chest2', kind: 'chest', x: 1296, y: 896, item: 'moonBlade', quantity: 1 },
  { id: 'chest3', kind: 'chest', x: 1792, y: 544, item: 'potion', quantity: 3 },
  { id: 'herb1', kind: 'herb', x: 752, y: 752 },
  { id: 'herb2', kind: 'herb', x: 912, y: 576 },
  { id: 'herb3', kind: 'herb', x: 1216, y: 704 },
  { id: 'campfire', kind: 'fire', x: 1220, y: 756 },
  { id: 'marshSign', kind: 'sign', x: 1432, y: 692 },
  { id: 'rune1', kind: 'rune', x: 1432, y: 816, text: '”Där ljuset slutar börjar inte mörkret. Där börjar rötterna.”' },
  { id: 'rune2', kind: 'rune', x: 1696, y: 816, text: '”Tre lyktor höll slussen stängd. En för minnet, en för modet, en för hemmet.”' },
  { id: 'rune3', kind: 'rune', x: 1584, y: 1120, text: '”Om hjärtat vaknar: följ inte dess glöd. Följ markens tecken.”' },
  { id: 'seal', kind: 'seal', x: 1776, y: 1056 },
  { id: 'chest4', kind: 'chest', x: 1824, y: 1168, item: 'trailCharm', quantity: 1 },
  { id: 'gate', kind: 'gate', x: 1816, y: 1232 }
];
export const ENEMY_SPAWNS = [
  ['sprout', 800, 768], ['sprout', 896, 816], ['sprout', 784, 528],
  ['sprout', 928, 640], ['sprout', 880, 944], ['sprout', 1200, 592],
  ['wolf', 1280, 496], ['wolf', 1376, 704], ['wolf', 1232, 864],
  ['wolf', 1536, 552], ['warden', 1568, 384],
  ['wisp', 1432, 880], ['wisp', 1632, 784], ['wisp', 1648, 1056],
  ['wisp', 1792, 848], ['wisp', 1440, 1120], ['ancient', 1744, 976]
];
function seeded(seed) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }
export function makeWorld() {
  const random = seeded(81024);
  const props = [];
  const important = [...LANDMARKS, ...NPCS, SPAWN, ...ENEMY_SPAWNS.map(([, x, y]) => ({ x, y }))];
  for (let row = 1; row < 39; row++) for (let col = 1; col < 59; col++) {
    const x = col * TILE + Math.floor(random() * 18);
    const y = row * TILE + Math.floor(random() * 18);
    const chance = random();
    const tile = terrain(x, y), marsh = tile === 'marsh';
    if (!['grass', 'marsh'].includes(tile) || inSafe(x, y)) continue;
    if (important.some(p => Math.hypot(p.x - x, p.y - y) < 72)) continue;
    // Generous clear margins along the road and around the bridge.
    if ([[60, 0], [-60, 0], [0, 60], [0, -60]].some(([dx, dy]) => !['grass', 'marsh'].includes(terrain(x + dx, y + dy)))) continue;
    if (chance < (marsh ? .20 : .30) && !props.some(p => Math.hypot(p.x - x, p.y - y) < 38)) props.push({ kind: chance < (marsh ? .16 : .25) ? 'tree' : 'rock', x, y, variant: marsh ? 3 : Math.floor(random() * 3) });
  }
  props.push(...BUILDINGS, ...LANDMARKS);
  const obstacles = props.filter(p => ['tree', 'rock', 'house', 'beacon'].includes(p.kind));
  const cells = new Map();
  for (const p of obstacles) {
    const x = p.kind === 'house' ? p.x - p.w / 2 : p.x - 24;
    const y = p.kind === 'house' ? p.y - 42 : p.y - 24;
    const w = p.kind === 'house' ? p.w : 48, h = p.kind === 'house' ? 50 : 48;
    for (let cx = Math.floor(x / 128); cx <= Math.floor((x + w) / 128); cx++)
      for (let cy = Math.floor(y / 128); cy <= Math.floor((y + h) / 128); cy++) {
        const key = cx + ',' + cy;
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key).push(p);
      }
  }
  return { props, obstacles, cells };
}
export const WORLD = makeWorld();
export function blocked(x, y, radius = 11) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 32 + radius || y < 32 + radius || x > WIDTH - 32 - radius || y > HEIGHT - 32 - radius) return true;
  for (const [dx, dy] of [[-radius, 0], [radius, 0], [0, -radius], [0, radius]]) if (terrain(x + dx, y + dy) === 'water') return true;
  const candidates = [];
  for (let cx = Math.floor((x - radius) / 128); cx <= Math.floor((x + radius) / 128); cx++)
    for (let cy = Math.floor((y - radius) / 128); cy <= Math.floor((y + radius) / 128); cy++)
      candidates.push(...(WORLD.cells.get(cx + ',' + cy) || []));
  return candidates.some(p => {
    if (p.kind === 'house') return x + radius > p.x - p.w / 2 && x - radius < p.x + p.w / 2 && y + radius > p.y - 42 && y - radius < p.y + 8;
    const r = p.kind === 'beacon' ? 21 : p.kind === 'rock' ? 13 : 10;
    return Math.hypot(p.x - x, p.y - y) < r + radius;
  });
}
export function lineClear(a, b) {
  const length = distance(a, b), steps = Math.ceil(length / 8);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (blocked(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, 2)) return false;
  }
  return true;
}
export function moveBody(body, dx, dy, radius = 11) {
  // Substeps prevent a dodge crossing narrow colliders, even under a long frame.
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 6));
  for (let n = 0; n < steps; n++) {
    if (!blocked(body.x + dx / steps, body.y, radius)) body.x += dx / steps;
    if (!blocked(body.x, body.y + dy / steps, radius)) body.y += dy / steps;
  }
}
export function zoneAt(x, y) {
  if (inRect(x, y, CAMP)) return { id: 'camp', name: 'Vandrarlägret', subtitle: 'Trygg zon · Signe väntar', safe: true };
  if (inSafe(x, y)) return { id: 'village', name: 'Lyktdalen', subtitle: 'Trygg zon', safe: true };
  if (inMarsh(x, y)) return { id: 'marsh', name: 'Glödmyren', subtitle: 'Glödvingarnas hem · nivå 4–6' };
  if (x > 1380 && y < 500) return { id: 'ruins', name: 'Den gamla fyren', subtitle: 'Väktarens hemvist · nivå 4' };
  if (x > 1100) return { id: 'forest', name: 'Skymningsskogen', subtitle: 'Vildmark · nivå 2–4' };
  return { id: 'trail', name: 'Mossgläntan', subtitle: 'Vildmark · nivå 1–2' };
}
