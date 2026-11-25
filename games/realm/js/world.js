import { tr } from './i18n.js';
import { TIDE_MARKS, TIDE_NPCS, TIDE_SPAWNS } from './tideglass.js';
import { SPAWN, NPCS } from './data.js';
export const TILE = 32;
export const WIDTH = 3456;
export const HEIGHT = 1280;
export const SAFE = { x: 176, y: 608, w: 528, h: 416 };
export const CAMP = { x: 1184, y: 712, w: 160, h: 104 };
export const inRect = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
export const SHELTER = { x: 1976, y: 1136, w: 106, h: 80 };
export const SOUNDING_HOUSE = { x: 2750, y: 708, w: 132, h: 144 };
export const sluiceOpen = s => s.flags.sealRestored && s.quests.heart?.status === 'done';
export const inSafe = (x, y) => inRect(x, y, SAFE) || inRect(x, y, CAMP) || inRect(x, y, SHELTER) || inRect(x, y, SOUNDING_HOUSE) ||
  (x - 902) ** 2 + (y - 706) ** 2 < 30 ** 2 || (x - 2598) ** 2 + (y - 776) ** 2 < 32 ** 2;
export const inMarsh = (x, y) => x > 1360 + Math.sin(y / 80) * 25 && y > 738 + Math.sin(x / 80) * 26;
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const riverLeft = y => 1008 + Math.round(Math.sin(y / 210) * 35);
export const isBridge = (x, y) => x >= 952 && x <= 1160 && y >= 608 && y <= 688;
const sluiceEdge = 1888;
const eastBank = 1952;
const shelfEdge = 2688;
const basaltAt = (x, y) => x < shelfEdge && x > sluiceEdge && (x < eastBank ? y < 1184 : y < 398 + 30 * Math.sin(x / 83));
// Two tidal basins split the road. The outer inlet has one raised crossing.
function brineAt(x, y) {
  if (x < shelfEdge) return false;
  if (x < 2772 && (y < 740 || y > 805)) {
    const bank = 2735 + 18 * Math.sin(y / 91) + 13 * Math.sin(y / 47);
    if (x < bank) return true;
  }
  const west = ((x - 2926) / 102) ** 2 + ((y - 568) / 86) ** 2;
  const east = ((x - 3240) / 108) ** 2 + ((y - 706) / 88) ** 2;
  return west < 1 || east < 1 || (y > 1172 + 33 * Math.sin(x / 62)) || y < 68 + 19 * Math.sin(x / 74);
}
function shelfTerrain(x, y) {
  if (brineAt(x, y)) return 'brine';
  // Both shell lanes meet at the dial; a lower towpath serves the packet yard.
  const westRoad = 2820 + (776 - y) * .48 + 49 * Math.sin((776 - y) / 96);
  const eastRoad = 3335 - Math.abs(y - 626) * .42;
  if ((Math.abs(y - 774) < 25 && x < 3300) ||
      (y < 775 && (Math.abs(x - westRoad) < 22 || Math.abs(x - eastRoad) < 22)) ||
      (y >= 770 && Math.abs(x - (2904 + (y - 770) * .82)) < 20) ||
      (y > 965 && Math.abs(y - (994 + (x - 3050) * .42)) < 19)) return 'shell';
  return y < 345 ? 'chalk' : 'salt';
}
function waterAt(x, y) {
  if (x < 973 || x > 1139 || isBridge(x, y)) return false;
  const left = riverLeft(y);
  return x >= left && x <= left + 96;
}
export function terrain(x, y) {
  if (x >= shelfEdge) return shelfTerrain(x, y);
  if (basaltAt(x, y)) return 'basalt';
  if (x > sluiceEdge && x < eastBank) return 'flume';
  if (x >= eastBank) {
    const flumeX = Math.min(2496, 1990 + (1200 - y) * .82);
    if (Math.abs(x - flumeX) < 31 || (x < 2024 && y >= 1184)) return 'flume';
    return 'ash';
  }
  return valeTerrain(x, y);
}

function valeTerrain(x, y) {
  if (isBridge(x, y)) return 'bridge';
  if (waterAt(x, y)) return 'water';
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
  { id: 'rune1', kind: 'rune', x: 1432, y: 816, text: tr("world.where_the_light_ends_darkness_does_not_begin_the_roots_do") },
  { id: 'rune2', kind: 'rune', x: 1696, y: 816, text: tr("world.three_lanterns_kept_the_sluice_closed_one_for_memory_one_for_cour") },
  { id: 'rune3', kind: 'rune', x: 1584, y: 1120, text: tr("world.if_the_heart_awakens_do_not_follow_its_glow_heed_the_signs_upon_t") },
  { id: 'seal', kind: 'seal', x: 1776, y: 1056 },
  { id: 'chest4', kind: 'chest', x: 1824, y: 1168, item: 'trailCharm', quantity: 1 },
  { id: 'gauge', kind: 'gauge', x: 2112, y: 1060, prompt: tr('ash.gauge'), text: tr('ash.gaugeText') },
  { id: 'bell', kind: 'bell', x: 2272, y: 860, prompt: tr('ash.bell'), text: tr('ash.bellText') },
  { id: 'gate', kind: 'gate', x: 1816, y: 1232 },
  ...TIDE_MARKS
];
export const ENEMY_SPAWNS = [
  ['sprout', 800, 768], ['sprout', 896, 816], ['sprout', 784, 528],
  ['sprout', 928, 640], ['sprout', 880, 944], ['sprout', 1200, 592],
  ['wolf', 1280, 496], ['wolf', 1376, 704], ['wolf', 1232, 864],
  ['wolf', 1536, 552], ['warden', 1568, 384],
  ['wisp', 1432, 880], ['wisp', 1632, 784], ['wisp', 1648, 1056],
  ['wisp', 1792, 848], ['wisp', 1440, 1120], ['ancient', 1744, 976],
  ['skitter', 2216, 1008], ['skitter', 2360, 882], ['sentry', 2448, 768],
  ['sentry', 2100, 680], ['skitter', 2560, 970], ['striker', 2496, 536],
  ...TIDE_SPAWNS
];
function seeded(seed) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }
export function makeWorld() {
  const random = seeded(81024);
  const props = [];
  // Generate the legacy forest/foundry with their original exclusion list and RNG stream.
  // Then clear room for new activities. Old walkable positions and dropped gear stay valid.
  const oldSpawns = ENEMY_SPAWNS.filter(p => !TIDE_SPAWNS.includes(p));
  const important = [...LANDMARKS.filter(p => !TIDE_MARKS.includes(p)), ...NPCS.filter(p => !TIDE_NPCS.includes(p)),
    SPAWN, ...oldSpawns.map(([, x, y]) => ({ x, y }))];
  for (let row = 1; row < 39; row++) for (let col = 1; col < 59; col++) {
    const x = col * TILE + Math.floor(random() * 18);
    const y = row * TILE + Math.floor(random() * 18);
    const chance = random();
    const tile = valeTerrain(x, y), marsh = tile === 'marsh';
    if (!['grass', 'marsh'].includes(tile) || inRect(x, y, SAFE) || inRect(x, y, CAMP)) continue;
    if (important.some(p => Math.hypot(p.x - x, p.y - y) < 72)) continue;
    // Generous clear margins along the road and around the bridge.
    if ([[60, 0], [-60, 0], [0, 60], [0, -60]].some(([dx, dy]) => !['grass', 'marsh'].includes(valeTerrain(x + dx, y + dy)))) continue;
    if (chance < (marsh ? .20 : .30) && !props.some(p => Math.hypot(p.x - x, p.y - y) < 38)) props.push({ kind: chance < (marsh ? .16 : .25) ? 'tree' : 'rock', x, y, variant: marsh ? 3 : Math.floor(random() * 3) });
  }
  for (let y = 490; y < 1200; y += 80) for (let x = 1980; x < 2688 - 64; x += 88) {
    const px = x + Math.floor(random() * 40), py = y + Math.floor(random() * 36);
    if (terrain(px, py) !== 'ash' || inRect(px, py, SHELTER) || important.some(p => Math.hypot(p.x - px, p.y - py) < 82)) continue;
    if (random() < .6) props.push({ kind: random() < .55 ? 'snag' : 'slag', x: px, y: py });
  }
  const additions = [...TIDE_MARKS, ...TIDE_NPCS, ...TIDE_SPAWNS.map(([, x, y]) => ({ x, y }))];
  for (let i = props.length - 1; i >= 0; i--) {
    if (additions.some(p => distance(props[i], p) < 65)) props.splice(i, 1);
  }
  for (let y = 136; y < 1170; y += 71) for (let x = 2780; x < WIDTH - 52; x += 84) {
    const p = { x: x + Math.floor(random() * 37), y: y + Math.floor(random() * 41) };
    if (!['salt', 'chalk'].includes(terrain(p.x, p.y)) || inSafe(p.x, p.y) || additions.some(a => distance(a, p) < 69)) continue;
    props.push({ ...p, kind: random() < .38 ? 'sailstone' : 'seaGrass' });
  }
  props.push({ kind: 'tideHouse', x: 2810, y: 697 }, { kind: 'ferryPost', x: 918, y: 711 },
    { kind: 'postRack', x: 3328, y: 1104 }, { kind: 'shiftHut', x: 2592, y: 719 });
  props.push({ kind: 'furnace', x: 2496, y: 458 });
  props.push(...BUILDINGS, ...LANDMARKS);
  const obstacles = props.filter(p => ['tree', 'rock', 'house', 'beacon', 'snag', 'slag', 'furnace'].includes(p.kind));
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
export function blocked(x, y, radius = 11, gateOpen = true) {
  if (!gateOpen && x + radius > sluiceEdge) return true;
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 32 + radius || y < 32 + radius || x > WIDTH - 32 - radius || y > HEIGHT - 32 - radius) return true;
  for (const [dx, dy] of [[-radius, 0], [radius, 0], [0, -radius], [0, radius]]) {
    if (waterAt(x + dx, y + dy) || basaltAt(x + dx, y + dy) || brineAt(x + dx, y + dy)) return true;
  }
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
export function moveBody(body, dx, dy, radius = 11, gateOpen = true) {
  // Substeps prevent a dodge crossing narrow colliders, even under a long frame.
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 6));
  for (let n = 0; n < steps; n++) {
    if (!blocked(body.x + dx / steps, body.y, radius, gateOpen)) body.x += dx / steps;
    if (!blocked(body.x, body.y + dy / steps, radius, gateOpen)) body.y += dy / steps;
  }
}
export function zoneAt(x, y) {
  if (x >= shelfEdge) {
    const yard = y >= 948;
    return { id: yard ? 'postyard' : 'shelf', name: yard ? tr('tide.yard') : tr('tide.shelf'),
      subtitle: inRect(x, y, SOUNDING_HOUSE) ? tr('tide.refuge') : yard ? tr('tide.yardSubtitle') : tr('tide.subtitle'), safe: inSafe(x, y) };
  }
  if (x >= eastBank) return { id: 'reach', name: tr('ash.reach'), subtitle: inSafe(x,y) ? tr('world.safe_area') : tr('ash.subtitle'), safe: inSafe(x,y) };
  if (inRect(x, y, CAMP)) return { id: 'camp', name: tr("world.wanderers_camp"), subtitle: tr("world.safe_area_signe_awaits"), safe: true };
  if (inRect(x, y, SAFE)) return { id: 'village', name: tr("world.lantern_vale"), subtitle: tr("world.safe_area"), safe: true };
  if (inMarsh(x, y)) return { id: 'marsh', name: tr("world.emberfen"), subtitle: tr("world.emberwing_territory_level_4_6") };
  if (x > 1380 && y < 500) return { id: 'ruins', name: tr("world.old_beacon"), subtitle: tr("world.the_wardens_domain_level_4") };
  if (x > 1100) return { id: 'forest', name: tr("world.duskwood"), subtitle: tr("world.wilderness_level_2_4") };
  return { id: 'trail', name: tr("world.mossglade"), subtitle: tr("world.wilderness_level_1_2") };
}
