import { Renderer } from "./renderer.js";
import { WORLD } from "./data.js";
import { PATH, SEGMENTS, ROAD, BLOCKED } from "./map.js";

const TAU = Math.PI * 2;

function pathStroke(c, width, color) {
  c.beginPath();
  c.moveTo(PATH[0].x - 28, PATH[0].y);
  for (const p of PATH) c.lineTo(p.x, p.y);
  c.lineJoin = "round";
  c.lineCap = "round";
  c.strokeStyle = color;
  c.lineWidth = width;
  c.stroke();
}

function pebble(c, x, y, r, color) {
  c.fillStyle = color;
  c.beginPath();
  c.ellipse(x, y, r, r * 0.65, 0.35, 0, TAU);
  c.fill();
}

function grassTuft(c, x, y, scale = 1, alpha = .38) {
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  c.lineCap = "round";
  c.strokeStyle = `rgba(126,151,86,${alpha})`;
  c.lineWidth = 1.2;
  for (const [dx, h, bend] of [[-5, 8, -2], [-2, 12, -1], [2, 10, 1], [5, 7, 2]]) {
    c.beginPath();
    c.moveTo(dx, 3);
    c.quadraticCurveTo(dx + bend, -h * .45, dx + bend * .7, -h);
    c.stroke();
  }
  c.restore();
}

function bush(c, x, y, scale = 1) {
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);

  c.fillStyle = "rgba(4,9,7,.44)";
  c.beginPath();
  c.ellipse(3, 9, 25, 10, 0, 0, TAU);
  c.fill();

  for (const [bx, by, r, color] of [
    [-14, 2, 12, "#203526"],
    [-3, -8, 15, "#2d4930"],
    [12, -2, 13, "#29432d"],
    [4, 8, 14, "#1d3224"],
  ]) {
    c.fillStyle = color;
    c.beginPath();
    c.arc(bx, by, r, 0, TAU);
    c.fill();
  }

  c.fillStyle = "rgba(146,166,95,.22)";
  c.beginPath();
  c.arc(-7, -11, 5, 0, TAU);
  c.arc(7, -7, 3.5, 0, TAU);
  c.fill();
  c.restore();
}

function rock(c, x, y, scale = 1) {
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);

  c.fillStyle = "rgba(0,0,0,.34)";
  c.beginPath();
  c.ellipse(4, 11, 19, 7, .08, 0, TAU);
  c.fill();

  const stone = c.createLinearGradient(-10, -12, 10, 12);
  stone.addColorStop(0, "#676b5d");
  stone.addColorStop(.45, "#50564b");
  stone.addColorStop(1, "#393f38");
  c.fillStyle = stone;
  c.strokeStyle = "rgba(133,139,113,.46)";
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(-15, 8);
  c.quadraticCurveTo(-17, -1, -9, -9);
  c.quadraticCurveTo(-3, -16, 6, -13);
  c.quadraticCurveTo(15, -10, 16, 0);
  c.quadraticCurveTo(17, 8, 8, 11);
  c.lineTo(-7, 12);
  c.closePath();
  c.fill();
  c.stroke();

  c.fillStyle = "rgba(201,198,157,.15)";
  c.beginPath();
  c.ellipse(-4, -7, 7, 3, -.25, 0, TAU);
  c.fill();
  c.restore();
}

function lantern(c, x, y) {
  c.save();

  const glow = c.createRadialGradient(x, y, 2, x, y, 31);
  glow.addColorStop(0, "rgba(255,211,118,.50)");
  glow.addColorStop(.28, "rgba(241,166,73,.17)");
  glow.addColorStop(1, "rgba(238,145,54,0)");
  c.fillStyle = glow;
  c.beginPath();
  c.arc(x, y, 31, 0, TAU);
  c.fill();

  c.fillStyle = "rgba(5,8,7,.35)";
  c.beginPath();
  c.ellipse(x + 3, y + 14, 7, 3, 0, 0, TAU);
  c.fill();

  c.fillStyle = "#332c22";
  c.fillRect(x - 2, y + 2, 4, 13);
  c.fillStyle = "#eaa34d";
  c.beginPath();
  c.arc(x, y, 4, 0, TAU);
  c.fill();
  c.fillStyle = "rgba(255,236,173,.8)";
  c.beginPath();
  c.arc(x - 1, y - 1, 1.5, 0, TAU);
  c.fill();
  c.restore();
}

function interpolateEdge(points, y) {
  for (let i = 1; i < points.length; i++) {
    const [y1, x1] = points[i - 1], [y2, x2] = points[i];
    if (y <= y2) {
      const t = Math.max(0, Math.min(1, (y - y1) / (y2 - y1)));
      return x1 + (x2 - x1) * t;
    }
  }
  return points.at(-1)[1];
}

const RIVER_OUTER = [
  [-40, 8], [0, 8], [60, 15], [120, 7], [180, 13], [235, 6],
  [260, 4], [285, 3], [315, 3], [340, 4], [390, 8],
  [445, 15], [495, 8], [545, 19], [600, 10], [640, 10],
];

const RIVER_INNER = [
  [-40, 74], [0, 74], [60, 89], [120, 70], [180, 80], [235, 68],
  [260, 61], [285, 59], [315, 59], [340, 61], [390, 68],
  [445, 81], [495, 72], [545, 94], [600, 84], [640, 84],
];

function riverOuterEdgeX(y) { return interpolateEdge(RIVER_OUTER, y); }
function riverEdgeX(y) { return interpolateEdge(RIVER_INNER, y); }
function isRiverReserved(x, y, padding = 8) {
  return x > riverOuterEdgeX(y) - padding && x < riverEdgeX(y) + padding;
}

function traceSmoothEdge(c, points) {
  if (points.length < 2) return;
  c.moveTo(points[0][1], points[0][0]);
  for (let i = 1; i < points.length - 1; i++) {
    const [y, x] = points[i];
    const [nextY, nextX] = points[i + 1];
    c.quadraticCurveTo(x, y, (x + nextX) / 2, (y + nextY) / 2);
  }
  const [lastY, lastX] = points.at(-1);
  c.quadraticCurveTo(lastX, lastY, lastX, lastY);
}

function strokeRiverEdge(c, points, width, color) {
  c.beginPath();
  traceSmoothEdge(c, points);
  c.strokeStyle = color;
  c.lineWidth = width;
  c.stroke();
}

function riverRock(c, x, y, scale = 1) {
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  c.fillStyle = "rgba(0,0,0,.30)";
  c.beginPath();
  c.ellipse(1, 4, 8, 4, -.15, 0, TAU);
  c.fill();
  c.fillStyle = "#555a4d";
  c.strokeStyle = "rgba(118,124,101,.60)";
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(-7, 3);
  c.quadraticCurveTo(-7, -4, -2, -7);
  c.quadraticCurveTo(5, -8, 8, -2);
  c.quadraticCurveTo(9, 4, 3, 6);
  c.quadraticCurveTo(-3, 7, -7, 3);
  c.fill();
  c.stroke();
  c.restore();
}

function shorelineGrass(c, x, y, flip = 1, scale = 1) {
  c.save();
  c.translate(x, y);
  c.scale(flip * scale, scale);
  c.lineCap = "round";
  for (const [dx, h, bend] of [[-5, 10, -3], [-1, 14, -1], [3, 12, 2], [7, 8, 3]]) {
    c.strokeStyle = "rgba(99,124,67,.58)";
    c.lineWidth = 1.1;
    c.beginPath();
    c.moveTo(dx, 4);
    c.quadraticCurveTo(dx + bend, -h * .45, dx + bend * .7, -h);
    c.stroke();
  }
  c.restore();
}

function drawRiver(c) {
  c.save();
  c.lineJoin = "round";
  c.lineCap = "round";

  c.beginPath();
  traceSmoothEdge(c, RIVER_OUTER);
  const reversedInner = [...RIVER_INNER].reverse();
  c.lineTo(reversedInner[0][1], reversedInner[0][0]);
  for (let i = 1; i < reversedInner.length - 1; i++) {
    const [y, x] = reversedInner[i];
    const [nextY, nextX] = reversedInner[i + 1];
    c.quadraticCurveTo(x, y, (x + nextX) / 2, (y + nextY) / 2);
  }
  const [innerLastY, innerLastX] = reversedInner.at(-1);
  c.quadraticCurveTo(innerLastX, innerLastY, innerLastX, innerLastY);
  c.closePath();

  const water = c.createLinearGradient(0, 0, 110, 0);
  water.addColorStop(0, "#08191f");
  water.addColorStop(.28, "#0d2c35");
  water.addColorStop(.58, "#17424c");
  water.addColorStop(.80, "#11343e");
  water.addColorStop(1, "#081c22");
  c.fillStyle = water;
  c.fill();

  const sheen = c.createLinearGradient(4, 0, 98, 0);
  sheen.addColorStop(0, "rgba(0,4,6,.38)");
  sheen.addColorStop(.30, "rgba(62,137,145,.04)");
  sheen.addColorStop(.56, "rgba(111,184,185,.10)");
  sheen.addColorStop(.76, "rgba(42,105,115,.04)");
  sheen.addColorStop(1, "rgba(0,5,7,.32)");
  c.fillStyle = sheen;
  c.fill();

  for (const edge of [RIVER_OUTER, RIVER_INNER]) {
    strokeRiverEdge(c, edge, 15, "rgba(4,9,7,.60)");
    strokeRiverEdge(c, edge, 10, "rgba(61,51,34,.95)");
    strokeRiverEdge(c, edge, 7, "rgba(90,74,44,.88)");
    strokeRiverEdge(c, edge, 4.2, "rgba(66,88,48,.92)");
    strokeRiverEdge(c, edge, 2, "rgba(112,132,70,.72)");
  }

  strokeRiverEdge(c, RIVER_OUTER.map(([y, x]) => [y, x + 4]), 1.2, "rgba(137,203,204,.18)");
  strokeRiverEdge(c, RIVER_INNER.map(([y, x]) => [y, x - 4]), 1.2, "rgba(137,203,204,.20)");

  for (const [y, t, width, alpha, bend] of [
    [28,.48,24,.17,-2],[70,.62,15,.10,1],[112,.38,27,.16,-2],[154,.58,18,.11,2],
    [202,.46,23,.14,-2],[248,.62,14,.10,1],[352,.42,23,.15,-2],[398,.61,19,.10,2],
    [447,.48,28,.15,-2],[500,.60,17,.11,1],[552,.42,24,.14,-1],[590,.58,15,.10,1],
  ]) {
    const left = riverOuterEdgeX(y) + 11;
    const right = riverEdgeX(y) - 11;
    const center = left + (right - left) * t;
    c.strokeStyle = `rgba(164,217,218,${alpha})`;
    c.lineWidth = 1.3;
    c.beginPath();
    c.moveTo(center - width * .5, y);
    c.quadraticCurveTo(center, y + bend, center + width * .5, y);
    c.stroke();
  }

  for (const [y, side, scale] of [[49,1,.70],[89,1,.85],[135,0,.65],[171,1,.78],[214,1,.62],[365,1,.82],[414,0,.68],[474,1,.88],[524,1,.72],[571,0,.68]]) {
    const edge = side ? riverEdgeX(y) : riverOuterEdgeX(y);
    shorelineGrass(c, edge + (side ? 10 : -8), y + 4, side ? -1 : 1, scale);
  }
  for (const [y, side, scale] of [[68,1,.55],[122,1,.42],[193,0,.46],[229,1,.52],[386,1,.50],[438,0,.42],[509,1,.57],[559,0,.46]]) {
    const edge = side ? riverEdgeX(y) : riverOuterEdgeX(y);
    riverRock(c, edge + (side ? 8 : -7), y, scale);
  }
  c.restore();
}

function drawEntranceBridge(c) {
  const y = PATH[0].y;
  c.save();

  const bridgeShadow = c.createLinearGradient(0, y - 35, 0, y + 35);
  bridgeShadow.addColorStop(0, "rgba(0,0,0,0)");
  bridgeShadow.addColorStop(.5, "rgba(0,0,0,.42)");
  bridgeShadow.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = bridgeShadow;
  c.fillRect(0, y - 40, 62, 80);

  c.fillStyle = "#33261b";
  c.fillRect(0, y - 25, 61, 50);
  for (let x = -2; x < 63; x += 10) {
    const plank = c.createLinearGradient(x, y - 22, x + 8, y + 22);
    plank.addColorStop(0, "#806447");
    plank.addColorStop(.5, "#6f553b");
    plank.addColorStop(1, "#59432f");
    c.fillStyle = plank;
    c.fillRect(x, y - 22, 8, 44);
    c.fillStyle = "rgba(235,196,124,.10)";
    c.fillRect(x + 1, y - 19, 1, 35);
  }

  c.strokeStyle = "rgba(231,188,100,.40)";
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(0, y - 25); c.lineTo(61, y - 25);
  c.moveTo(0, y + 25); c.lineTo(61, y + 25);
  c.stroke();
  c.restore();
}

function drawGround(c, random) {
  const ground = c.createLinearGradient(0, 0, WORLD.width, WORLD.height);
  ground.addColorStop(0, "#29402f");
  ground.addColorStop(.45, "#21362b");
  ground.addColorStop(1, "#172a22");
  c.fillStyle = ground;
  c.fillRect(0, 0, WORLD.width, WORLD.height);

  // Broad painterly patches give the grass the softer illustrated look from the reference.
  for (let i = 0; i < 55; i++) {
    const x = random() * WORLD.width;
    const y = random() * WORLD.height;
    const rx = 35 + random() * 90;
    const ry = 18 + random() * 55;
    c.fillStyle = i % 4 === 0 ? "rgba(118,113,67,.055)" : "rgba(91,136,84,.065)";
    c.beginPath();
    c.ellipse(x, y, rx, ry, random() * Math.PI, 0, TAU);
    c.fill();
  }

  // Soft darker foliage/shadow islands add depth without becoming objects.
  for (let i = 0; i < 20; i++) {
    const x = random() * WORLD.width;
    const y = random() * WORLD.height;
    c.fillStyle = "rgba(7,16,11,.08)";
    c.beginPath();
    c.ellipse(x, y, 30 + random() * 70, 16 + random() * 38, random() * Math.PI, 0, TAU);
    c.fill();
  }

  for (let i = 0; i < 620; i++) {
    const x = random() * WORLD.width;
    const y = random() * WORLD.height;
    if (isRiverReserved(x, y, 3)) continue;
    const light = random() > .58;
    c.strokeStyle = light ? "rgba(145,165,102,.12)" : "rgba(8,15,10,.15)";
    c.lineWidth = .7;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + (random() - .5) * 4, y - 1 - random() * 3);
    c.stroke();
  }
}

function drawRoad(c, random) {
  // Deep soft shadow, earthen rim, then a warm slightly raised road surface.
  pathStroke(c, 66, "rgba(4,8,6,.46)");
  pathStroke(c, 59, "#504632");
  pathStroke(c, 53, "#776744");
  pathStroke(c, 47, "#85724c");
  pathStroke(c, 39, "#6d5c3f");
  pathStroke(c, 3, "rgba(231,202,133,.12)");

  // Darker lower-edge pass suggests a bevel/elevation.
  c.save();
  c.translate(0, 3);
  pathStroke(c, 49, "rgba(42,35,24,.17)");
  c.restore();
  pathStroke(c, 41, "rgba(122,102,65,.46)");

  // Sparse dirt flecks along the road.
  for (const { a, b, length } of SEGMENTS) {
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    for (let d = 20; d < length - 10; d += 23 + random() * 18) {
      const side = random() > .5 ? 1 : -1;
      const offset = side * (5 + random() * 12);
      const x = a.x + ((b.x - a.x) * d) / length - Math.sin(angle) * offset;
      const y = a.y + ((b.y - a.y) * d) / length + Math.cos(angle) * offset;
      pebble(c, x, y, .8 + random() * 1.6, random() > .5 ? "rgba(190,158,93,.26)" : "rgba(54,46,32,.34)");
    }
  }
}

function drawFantasyMap(c) {
  let seed = 9137;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  drawGround(c, random);
  drawRiver(c);
  drawRoad(c, random);
  drawEntranceBridge(c);

  const clusters = new Map();
  for (const key of BLOCKED) {
    const [gx, gy] = key.split(",").map(Number);
    const group = `${Math.floor(gx / 2)},${Math.floor(gy / 2)}`;
    if (!clusters.has(group)) clusters.set(group, []);
    clusters.get(group).push({ gx, gy });
  }

  let clusterIndex = 0;
  for (const cells of clusters.values()) {
    const x = cells.reduce((sum, p) => sum + (p.gx + .5) * 40, 0) / cells.length;
    const y = cells.reduce((sum, p) => sum + (p.gy + .5) * 40, 0) / cells.length;
    if (isRiverReserved(x, y, 20)) { clusterIndex++; continue; }

    if (clusterIndex % 2 === 0) {
      bush(c, x - 14, y + 5, 1.08);
      bush(c, x + 16, y - 8, .80);
      rock(c, x + 25, y + 17, .52);
      grassTuft(c, x - 31, y + 18, .75, .35);
    } else {
      rock(c, x - 8, y - 2, 1.02);
      bush(c, x + 19, y + 12, .74);
      grassTuft(c, x + 33, y - 13, .62, .30);
    }
    clusterIndex++;
  }

  // Small decorative groups around otherwise empty areas make the full map feel illustrated.
  for (const [x, y, s] of [[150,82,.55],[250,505,.50],[395,515,.58],[575,470,.52],[635,105,.46],[820,115,.56],[850,470,.48]]) {
    if (!isRiverReserved(x, y, 18)) grassTuft(c, x, y, s, .34);
  }
  for (const [x, y, s] of [[140,520,.38],[350,75,.32],[600,540,.36],[840,80,.30]]) {
    if (!isRiverReserved(x, y, 20)) bush(c, x, y, s);
  }

  for (const [x, y] of [
    [205,360],[320,195],[510,85],[690,210],[700,400],[790,530],[920,410],[920,240],
  ]) lantern(c, x, y);

  // Warm pools on the ground make the lamps read as part of the scene.
  for (const [x, y] of [[205,360],[320,195],[510,85],[690,210],[700,400],[790,530],[920,410],[920,240]]) {
    const pool = c.createRadialGradient(x, y + 8, 3, x, y + 8, 38);
    pool.addColorStop(0, "rgba(230,167,76,.08)");
    pool.addColorStop(1, "rgba(230,167,76,0)");
    c.fillStyle = pool;
    c.beginPath();
    c.ellipse(x, y + 9, 38, 20, 0, 0, TAU);
    c.fill();
  }

  const coreGlow = c.createRadialGradient(933, 300, 4, 933, 300, 68);
  coreGlow.addColorStop(0, "rgba(242,183,72,.19)");
  coreGlow.addColorStop(.45, "rgba(234,174,66,.08)");
  coreGlow.addColorStop(1, "rgba(234,174,66,0)");
  c.fillStyle = coreGlow;
  c.beginPath();
  c.arc(933, 300, 68, 0, TAU);
  c.fill();
}

Renderer.prototype.drawMap = function drawMap(c) {
  drawFantasyMap(c);
};