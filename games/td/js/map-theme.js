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

function bush(c, x, y, scale = 1) {
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  c.fillStyle = "rgba(8,14,10,.35)";
  c.beginPath();
  c.ellipse(3, 8, 24, 10, 0, 0, TAU);
  c.fill();
  for (const [bx, by, r, color] of [
    [-13, 1, 12, "#263b2a"],
    [0, -7, 15, "#314a31"],
    [14, 1, 11, "#28402c"],
    [-2, 7, 13, "#213727"],
  ]) {
    c.fillStyle = color;
    c.beginPath();
    c.arc(bx, by, r, 0, TAU);
    c.fill();
  }
  c.fillStyle = "rgba(126,143,82,.28)";
  c.beginPath();
  c.arc(-5, -11, 5, 0, TAU);
  c.fill();
  c.restore();
}

function rock(c, x, y, scale = 1) {
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  c.fillStyle = "rgba(0,0,0,.30)";
  c.beginPath();
  c.ellipse(4, 11, 19, 7, 0.08, 0, TAU);
  c.fill();

  c.fillStyle = "#4b5045";
  c.strokeStyle = "#676b5b";
  c.lineWidth = 1.3;
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

  c.fillStyle = "rgba(151,151,124,.18)";
  c.beginPath();
  c.ellipse(-4, -7, 7, 3.2, -0.25, 0, TAU);
  c.fill();
  c.restore();
}

function lantern(c, x, y) {
  c.save();
  const glow = c.createRadialGradient(x, y, 1, x, y, 24);
  glow.addColorStop(0, "rgba(255,205,103,.42)");
  glow.addColorStop(1, "rgba(255,174,67,0)");
  c.fillStyle = glow;
  c.beginPath();
  c.arc(x, y, 24, 0, TAU);
  c.fill();
  c.fillStyle = "#30291f";
  c.fillRect(x - 2, y + 2, 4, 12);
  c.fillStyle = "#f0ad4e";
  c.beginPath();
  c.arc(x, y, 3.5, 0, TAU);
  c.fill();
  c.restore();
}

function interpolateEdge(points, y) {
  for (let i = 1; i < points.length; i++) {
    const [y1, x1] = points[i - 1],
      [y2, x2] = points[i];
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

function riverOuterEdgeX(y) {
  return interpolateEdge(RIVER_OUTER, y);
}

function riverEdgeX(y) {
  return interpolateEdge(RIVER_INNER, y);
}

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
  c.ellipse(1, 4, 8, 4, -0.15, 0, TAU);
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
  c.fillStyle = "rgba(180,181,145,.13)";
  c.beginPath();
  c.ellipse(-1, -4, 3.8, 1.5, -0.15, 0, TAU);
  c.fill();
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
  water.addColorStop(0.28, "#0d2c35");
  water.addColorStop(0.58, "#17424c");
  water.addColorStop(0.80, "#11343e");
  water.addColorStop(1, "#081c22");
  c.fillStyle = water;
  c.fill();

  const sheen = c.createLinearGradient(4, 0, 98, 0);
  sheen.addColorStop(0, "rgba(0,4,6,.38)");
  sheen.addColorStop(0.30, "rgba(62,137,145,.04)");
  sheen.addColorStop(0.56, "rgba(111,184,185,.10)");
  sheen.addColorStop(0.76, "rgba(42,105,115,.04)");
  sheen.addColorStop(1, "rgba(0,5,7,.32)");
  c.fillStyle = sheen;
  c.fill();

  // Stronger layered banks: shadowed cut -> damp soil -> moss -> grass rim.
  for (const edge of [RIVER_OUTER, RIVER_INNER]) {
    strokeRiverEdge(c, edge, 15, "rgba(4,9,7,.60)");
    strokeRiverEdge(c, edge, 10, "rgba(61,51,34,.95)");
    strokeRiverEdge(c, edge, 7, "rgba(90,74,44,.88)");
    strokeRiverEdge(c, edge, 4.2, "rgba(66,88,48,.92)");
    strokeRiverEdge(c, edge, 2, "rgba(112,132,70,.72)");
  }

  strokeRiverEdge(c, RIVER_OUTER.map(([y, x]) => [y, x + 4]), 1.2, "rgba(137,203,204,.18)");
  strokeRiverEdge(c, RIVER_INNER.map(([y, x]) => [y, x - 4]), 1.2, "rgba(137,203,204,.20)");

  // Soft reflected bands in the water create the painted game-art look.
  for (const [y, t, width, alpha, bend] of [
    [28, .48, 24, .17, -2], [70, .62, 15, .10, 1], [112, .38, 27, .16, -2],
    [154, .58, 18, .11, 2], [202, .46, 23, .14, -2], [248, .62, 14, .10, 1],
    [352, .42, 23, .15, -2], [398, .61, 19, .10, 2], [447, .48, 28, .15, -2],
    [500, .60, 17, .11, 1], [552, .42, 24, .14, -1], [590, .58, 15, .10, 1],
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

  // Tiny foam/ripple hooks near bends.
  for (const [x, y, flip] of [[46, 96, 1], [41, 178, -1], [43, 371, 1], [54, 463, -1], [58, 548, 1]]) {
    c.strokeStyle = "rgba(174,222,221,.20)";
    c.lineWidth = 1.1;
    c.beginPath();
    c.arc(x, y, 8, flip > 0 ? 2.8 : 0.2, flip > 0 ? 4.4 : 1.8, flip < 0);
    c.stroke();
  }

  // Richer shoreline dressing similar to the illustrated reference.
  for (const [y, side, scale] of [
    [49, 1, .70], [89, 1, .85], [135, 0, .65], [171, 1, .78],
    [214, 1, .62], [365, 1, .82], [414, 0, .68], [474, 1, .88],
    [524, 1, .72], [571, 0, .68],
  ]) {
    const edge = side ? riverEdgeX(y) : riverOuterEdgeX(y);
    shorelineGrass(c, edge + (side ? 10 : -8), y + 4, side ? -1 : 1, scale);
  }

  for (const [y, side, scale] of [
    [68, 1, .55], [122, 1, .42], [193, 0, .46], [229, 1, .52],
    [386, 1, .50], [438, 0, .42], [509, 1, .57], [559, 0, .46],
  ]) {
    const edge = side ? riverEdgeX(y) : riverOuterEdgeX(y);
    riverRock(c, edge + (side ? 8 : -7), y, scale);
  }

  // Small moss clumps, kept away from the bridge crossing.
  for (const [y, side, scale] of [[38, 1, .28], [102, 1, .22], [157, 0, .20], [395, 1, .24], [487, 1, .26], [575, 1, .22]]) {
    const edge = side ? riverEdgeX(y) : riverOuterEdgeX(y);
    bush(c, edge + (side ? 14 : -12), y, scale);
  }

  c.restore();
}

function drawEntranceBridge(c) {
  const y = PATH[0].y;
  c.save();

  const ravine = c.createLinearGradient(0, y - 36, 0, y + 36);
  ravine.addColorStop(0, "rgba(12,18,15,0)");
  ravine.addColorStop(0.25, "rgba(8,12,10,.72)");
  ravine.addColorStop(0.5, "rgba(4,8,7,.92)");
  ravine.addColorStop(0.75, "rgba(8,12,10,.72)");
  ravine.addColorStop(1, "rgba(12,18,15,0)");
  c.fillStyle = ravine;
  c.fillRect(0, y - 42, 58, 84);

  c.fillStyle = "#44473b";
  c.strokeStyle = "#696958";
  c.lineWidth = 1.2;
  for (const py of [y - 31, y + 18]) {
    c.beginPath();
    c.roundRect(8, py, 25, 13, 3);
    c.fill();
    c.stroke();
  }

  c.fillStyle = "#3a2e22";
  c.fillRect(0, y - 24, 58, 48);
  c.fillStyle = "#675039";
  for (let x = -2; x < 60; x += 10) {
    c.fillRect(x, y - 21, 8, 42);
    c.fillStyle = "rgba(221,181,108,.09)";
    c.fillRect(x + 1, y - 18, 1, 35);
    c.fillStyle = "#675039";
  }

  c.strokeStyle = "rgba(211,166,87,.48)";
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(1, y - 24);
  c.lineTo(58, y - 24);
  c.moveTo(1, y + 24);
  c.lineTo(58, y + 24);
  c.stroke();

  c.fillStyle = "rgba(222,183,100,.72)";
  for (const x of [10, 28, 46]) {
    c.beginPath();
    c.arc(x, y - 24, 1.5, 0, TAU);
    c.arc(x, y + 24, 1.5, 0, TAU);
    c.fill();
  }

  c.restore();
}

function drawFantasyMap(c) {
  const ground = c.createLinearGradient(0, 0, WORLD.width, WORLD.height);
  ground.addColorStop(0, "#25352a");
  ground.addColorStop(0.52, "#1d3027");
  ground.addColorStop(1, "#172721");
  c.fillStyle = ground;
  c.fillRect(0, 0, WORLD.width, WORLD.height);

  let seed = 9137;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  for (let i = 0; i < 42; i++) {
    const x = random() * WORLD.width,
      y = random() * WORLD.height,
      rx = 35 + random() * 85,
      ry = 20 + random() * 55;
    c.fillStyle = i % 3 === 0 ? "rgba(91,87,53,.075)" : "rgba(83,116,70,.075)";
    c.beginPath();
    c.ellipse(x, y, rx, ry, random() * Math.PI, 0, TAU);
    c.fill();
  }

  for (let i = 0; i < 1350; i++) {
    const x = random() * WORLD.width,
      y = random() * WORLD.height,
      light = random() > 0.56;
    if (isRiverReserved(x, y, 3)) continue;
    c.strokeStyle = light ? "rgba(139,154,92,.10)" : "rgba(7,14,10,.16)";
    c.lineWidth = 0.7;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + (random() - 0.5) * 5, y - 1 - random() * 4);
    c.stroke();
  }

  drawRiver(c);

  pathStroke(c, 58, "rgba(8,12,10,.48)");
  pathStroke(c, 52, "#5a5038");
  pathStroke(c, 45, "#756345");
  pathStroke(c, 35, "#65553c");
  pathStroke(c, 4, "rgba(214,184,111,.13)");

  drawEntranceBridge(c);

  for (const { a, b, length } of SEGMENTS) {
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    for (let d = 30; d < length - 12; d += 34 + random() * 22) {
      const side = random() > 0.5 ? 1 : -1,
        offset = side * (14 + random() * 6),
        px = a.x + ((b.x - a.x) * d) / length - Math.sin(angle) * offset,
        py = a.y + ((b.y - a.y) * d) / length + Math.cos(angle) * offset;
      if (isRiverReserved(px, py, 1) && px < 58) continue;
      pebble(c, px, py, 1.6 + random() * 2.7, random() > 0.5 ? "#95805a" : "#4e4937");
    }
  }

  const clusters = new Map();
  for (const key of BLOCKED) {
    const [gx, gy] = key.split(",").map(Number),
      cx = Math.floor(gx / 2),
      cy = Math.floor(gy / 2),
      group = `${cx},${cy}`;
    if (!clusters.has(group)) clusters.set(group, []);
    clusters.get(group).push({ gx, gy });
  }
  let clusterIndex = 0;
  for (const cells of clusters.values()) {
    const x = cells.reduce((sum, p) => sum + (p.gx + 0.5) * 40, 0) / cells.length,
      y = cells.reduce((sum, p) => sum + (p.gy + 0.5) * 40, 0) / cells.length;
    if (isRiverReserved(x, y, 20)) {
      clusterIndex++;
      continue;
    }
    if (clusterIndex % 2 === 0) {
      bush(c, x - 14, y + 5, 1.05);
      bush(c, x + 15, y - 8, 0.78);
      pebble(c, x + 22, y + 18, 8, "#4d5145");
    } else {
      rock(c, x - 8, y - 2, 1.05);
      bush(c, x + 19, y + 12, 0.72);
    }
    clusterIndex++;
  }

  for (const [x, y] of [
    [205, 360], [320, 195], [510, 85], [690, 210],
    [700, 400], [790, 530], [920, 410], [920, 240],
  ]) lantern(c, x, y);

  for (let i = 0; i < 42; i++) {
    const gx = Math.floor(random() * 24),
      gy = Math.floor(random() * 15),
      key = `${gx},${gy}`;
    if (ROAD.has(key) || BLOCKED.has(key)) continue;
    const x = gx * 40 + 6 + random() * 28,
      y = gy * 40 + 7 + random() * 26;
    if (isRiverReserved(x, y, 10)) continue;
    if (random() > 0.55) pebble(c, x, y, 2 + random() * 4, "rgba(91,91,69,.55)");
    else {
      c.strokeStyle = "rgba(116,140,79,.28)";
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(x, y + 3);
      c.lineTo(x - 2, y - 3);
      c.moveTo(x, y + 3);
      c.lineTo(x + 3, y - 2);
      c.stroke();
    }
  }

  const coreGlow = c.createRadialGradient(933, 300, 4, 933, 300, 62);
  coreGlow.addColorStop(0, "rgba(234,174,66,.16)");
  coreGlow.addColorStop(1, "rgba(234,174,66,0)");
  c.fillStyle = coreGlow;
  c.beginPath();
  c.arc(933, 300, 62, 0, TAU);
  c.fill();
}

Renderer.prototype.drawMap = function drawMap(c) {
  drawFantasyMap(c);
};