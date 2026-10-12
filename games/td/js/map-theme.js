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

  // Broad moss/soil patches give the ground depth without looking tiled.
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

  // Fine deterministic grass and soil texture.
  for (let i = 0; i < 1350; i++) {
    const x = random() * WORLD.width,
      y = random() * WORLD.height,
      light = random() > 0.56;
    c.strokeStyle = light ? "rgba(139,154,92,.10)" : "rgba(7,14,10,.16)";
    c.lineWidth = 0.7;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + (random() - 0.5) * 5, y - 1 - random() * 4);
    c.stroke();
  }

  // Very subtle build grid: useful mechanically, but no longer dominates the art.
  for (let y = 0; y < 15; y++) {
    for (let x = 0; x < 24; x++) {
      if (ROAD.has(`${x},${y}`)) continue;
      c.strokeStyle = "rgba(174,171,122,.035)";
      c.lineWidth = 0.55;
      c.strokeRect(x * 40 + 0.5, y * 40 + 0.5, 39, 39);
    }
  }

  // Raised earth/path edge, warm compacted dirt, then a worn centre.
  pathStroke(c, 58, "rgba(8,12,10,.48)");
  pathStroke(c, 52, "#5a5038");
  pathStroke(c, 45, "#756345");
  pathStroke(c, 35, "#65553c");
  pathStroke(c, 4, "rgba(214,184,111,.13)");

  // Embedded stones along the route, deterministic and purely decorative.
  for (const { a, b, length } of SEGMENTS) {
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    for (let d = 30; d < length - 12; d += 34 + random() * 22) {
      const side = random() > 0.5 ? 1 : -1,
        offset = side * (14 + random() * 6),
        px = a.x + ((b.x - a.x) * d) / length - Math.sin(angle) * offset,
        py = a.y + ((b.y - a.y) * d) / length + Math.cos(angle) * offset;
      pebble(c, px, py, 1.6 + random() * 2.7, random() > 0.5 ? "#95805a" : "#4e4937");
    }
  }

  // Existing blocked zones become deliberate scenery clusters.
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

  // Warm guide lights stay clearly outside the enemy route.
  for (const [x, y] of [
    [205, 360], [320, 195], [510, 85], [690, 210],
    [700, 400], [790, 530], [920, 410], [920, 240],
  ]) lantern(c, x, y);

  // Sparse loose rocks/foliage outside the route.
  for (let i = 0; i < 42; i++) {
    const gx = Math.floor(random() * 24),
      gy = Math.floor(random() * 15),
      key = `${gx},${gy}`;
    if (ROAD.has(key) || BLOCKED.has(key)) continue;
    const x = gx * 40 + 6 + random() * 28,
      y = gy * 40 + 7 + random() * 26;
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

  // Entrance/core approach accents.
  c.fillStyle = "rgba(225,188,103,.55)";
  c.font = "600 9px system-ui";
  c.fillText("INFART", 12, 268);
  c.fillText("KÄRNA", 901, 263);

  const coreGlow = c.createRadialGradient(933, 300, 4, 933, 300, 62);
  coreGlow.addColorStop(0, "rgba(234,174,66,.16)");
  coreGlow.addColorStop(1, "rgba(234,174,66,0)");
  c.fillStyle = coreGlow;
  c.beginPath();
  c.arc(933, 300, 62, 0, TAU);
  c.fill();
}

// Keep gameplay/path logic in the original renderer; only replace its cached map artwork.
Renderer.prototype.drawMap = function drawMap(c) {
  drawFantasyMap(c);
};
