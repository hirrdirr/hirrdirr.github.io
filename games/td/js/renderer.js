import { WORLD, TOWERS, ENEMIES, towerStats } from "./data.js";
import { PATH, SEGMENTS, ROAD, BLOCKED, distanceSquared } from "./map.js";
import { EnemySprites } from "./enemy-sprites.js";
const TAU = Math.PI * 2;
function polygon(c, x, y, r, sides = 6, angle = 0) {
  c.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = angle + (i * TAU) / sides;
    c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  c.closePath();
}
function line(c, x1, y1, x2, y2, color, width = 1) {
  c.strokeStyle = color;
  c.lineWidth = width;
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x2, y2);
  c.stroke();
}
export function drawTower(
  c,
  kind,
  x,
  y,
  angle = -Math.PI / 2,
  levels = [0, 0],
  recoil = 0,
  scale = 1,
) {
  const color = TOWERS[kind].color,
    level = levels[0] + levels[1];
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  c.fillStyle = "rgba(0,0,0,.35)";
  polygon(c, 2, 5, 20, 6, Math.PI / 6);
  c.fill();
  c.fillStyle = "#1a3034";
  c.strokeStyle = "#48605f";
  c.lineWidth = 1.3;
  polygon(c, 0, 0, 19, 6, Math.PI / 6);
  c.fill();
  c.stroke();
  c.fillStyle = "#0b191f";
  c.beginPath();
  c.arc(0, 0, 14, 0, TAU);
  c.fill();
  c.strokeStyle = color;
  c.globalAlpha = 0.4;
  c.beginPath();
  c.arc(0, 0, 16, -Math.PI * 0.85, Math.PI * 0.3);
  c.stroke();
  c.globalAlpha = 1;
  for (let i = 0; i < level; i++) {
    c.fillStyle = color;
    c.fillRect(-10 + i * 5, 16, 3, 2);
  }
  c.save();
  c.rotate(angle);
  c.translate(-recoil * 2, 0);
  if (kind === "relay") {
    c.rotate(-angle);
    c.strokeStyle = color;
    c.lineWidth = 2;
    polygon(c, 0, 0, 10, 4, Math.PI / 4);
    c.stroke();
    c.fillStyle = color;
    polygon(c, 0, 0, 5, 4, Math.PI / 4);
    c.fill();
    for (let i = 0; i < 3; i++) {
      const a = (i * TAU) / 3;
      c.fillStyle = "#344e68";
      c.fillRect(Math.cos(a) * 13 - 3, Math.sin(a) * 13 - 3, 6, 6);
      c.fillStyle = color;
      c.fillRect(Math.cos(a) * 13 - 1, Math.sin(a) * 13 - 1, 2, 2);
    }
  } else if (kind === "mortar") {
    c.fillStyle = "#695876";
    polygon(c, 0, 0, 12, 8);
    c.fill();
    c.fillStyle = "#0a131b";
    c.beginPath();
    c.arc(0, 0, 8, 0, TAU);
    c.fill();
    c.strokeStyle = color;
    c.lineWidth = 3;
    c.beginPath();
    c.arc(0, 0, 9, 0, TAU);
    c.stroke();
    c.fillStyle = color;
    c.fillRect(8, -3, 10, 6);
  } else if (kind === "cryo") {
    c.fillStyle = "#285364";
    polygon(c, 0, 0, 12, 6);
    c.fill();
    c.strokeStyle = color;
    c.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI) / 3;
      line(
        c,
        -Math.cos(a) * 10,
        -Math.sin(a) * 10,
        Math.cos(a) * 10,
        Math.sin(a) * 10,
        color,
        2,
      );
    }
    c.fillStyle = "#bdeaf7";
    c.beginPath();
    c.arc(0, 0, 4, 0, TAU);
    c.fill();
    c.fillStyle = color;
    c.fillRect(9, -3, 9, 6);
  } else {
    c.fillStyle = "#31494d";
    c.fillRect(-11, -10, 19, 20);
    c.strokeStyle = "#63817e";
    c.lineWidth = 1;
    c.strokeRect(-11, -10, 19, 20);
    const barrel = kind === "sniper" ? 27 : kind === "cannon" ? 21 : 18;
    if (kind === "gatling") {
      for (let i = -1; i <= 1; i++) {
        c.fillStyle = "#708789";
        c.fillRect(3, i * 5 - 1.5, barrel, 3);
      }
      c.fillStyle = color;
      c.fillRect(12, -9, 4, 18);
    } else {
      c.fillStyle = "#778f92";
      c.fillRect(
        1,
        -(kind === "cannon" ? 5 : 3),
        barrel,
        kind === "cannon" ? 10 : 6,
      );
      c.fillStyle = color;
      c.fillRect(
        barrel - 3,
        -(kind === "cannon" ? 6 : 4),
        5,
        kind === "cannon" ? 12 : 8,
      );
    }
    c.fillStyle = color;
    c.fillRect(-8, -6, 7, 12);
    c.fillStyle = "#dbe9da";
    c.fillRect(-7, -5, 2, 3);
    if (level >= 3) {
      c.strokeStyle = color;
      c.strokeRect(-13, -12, 22, 24);
    }
  }
  c.restore();
  c.restore();
}
export function paintIcons(root) {
  for (const canvas of root.querySelectorAll("canvas[data-tower-icon]")) {
    const c = canvas.getContext("2d");
    c.clearRect(0, 0, canvas.width, canvas.height);
    drawTower(
      c,
      canvas.dataset.towerIcon,
      canvas.width / 2,
      canvas.height / 2,
      -Math.PI / 4,
      [0, 0],
      0,
      canvas.width / 50,
    );
  }
}
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.background = document.createElement("canvas");
    this.effects = [];
    this.enemySprites = new EnemySprites();
    this.visualTime = 0;
    this.dpr = 0;
    this.reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    this.resize();
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width * dpr)),
      height = Math.max(
        1,
        Math.round(((rect.width * WORLD.height) / WORLD.width) * dpr),
      );
    if (
      this.canvas.width === width &&
      this.canvas.height === height &&
      this.dpr === dpr
    )
      return;
    this.dpr = dpr;
    this.canvas.width = width;
    this.canvas.height = height;
    this.background.width = width;
    this.background.height = height;
    const c = this.background.getContext("2d");
    c.setTransform(width / WORLD.width, 0, 0, height / WORLD.height, 0, 0);
    this.drawMap(c);
  }
  drawMap(c) {
    c.fillStyle = "#112629";
    c.fillRect(0, 0, WORLD.width, WORLD.height);
    // Deterministic terrain grain, authored in code; no asset downloads.
    let seed = 731;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < 1800; i++) {
      c.fillStyle = i % 2 ? "rgba(129,161,129,.055)" : "rgba(0,0,0,.09)";
      c.fillRect(
        random() * 960,
        random() * 600,
        2 + random() * 9,
        1 + random() * 3,
      );
    }
    for (let y = 0; y < 15; y++)
      for (let x = 0; x < 24; x++) {
        if (!ROAD.has(`${x},${y}`)) {
          c.strokeStyle = "rgba(147,183,166,.06)";
          c.lineWidth = 0.6;
          c.strokeRect(x * 40 + 0.5, y * 40 + 0.5, 39, 39);
        }
      }
    // Embedded power conduits and maintenance bays.
    for (const [x, y, w, h] of [
      [35, 35, 105, 95],
      [750, 35, 110, 95],
      [110, 475, 110, 100],
      [390, 390, 110, 95],
    ]) {
      c.fillStyle = "#0d2025";
      c.strokeStyle = "#2c4648";
      c.lineWidth = 2;
      c.fillRect(x, y, w, h);
      c.strokeRect(x, y, w, h);
      for (let i = 0; i < 5; i++)
        line(
          c,
          x + 12,
          y + 15 + i * 13,
          x + w - 12,
          y + 15 + i * 13,
          "#243c40",
          4,
        );
      c.fillStyle = "#80a994";
      c.fillRect(x + 8, y + 7, 3, 3);
      c.fillStyle = "#48686a";
      c.fillRect(x + w - 11, y + h - 11, 3, 3);
    }
    const drawPath = () => {
      c.beginPath();
      c.moveTo(PATH[0].x - 25, PATH[0].y);
      for (const p of PATH) c.lineTo(p.x, p.y);
    };
    c.lineJoin = "round";
    c.lineCap = "butt";
    drawPath();
    c.strokeStyle = "#09191e";
    c.lineWidth = 51;
    c.stroke();
    drawPath();
    c.strokeStyle = "#526361";
    c.lineWidth = 43;
    c.stroke();
    drawPath();
    c.strokeStyle = "#2d3e40";
    c.lineWidth = 39;
    c.stroke();
    drawPath();
    c.strokeStyle = "rgba(147,174,148,.15)";
    c.lineWidth = 2;
    c.setLineDash([3, 9]);
    c.stroke();
    c.setLineDash([]);
    for (const { a, b, length } of SEGMENTS) {
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      for (let d = 65; d < length - 25; d += 90) {
        c.save();
        c.translate(
          a.x + ((b.x - a.x) * d) / length,
          a.y + ((b.y - a.y) * d) / length,
        );
        c.rotate(angle);
        c.strokeStyle = "#8ca994";
        c.globalAlpha = 0.35;
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(-4, -4);
        c.lineTo(0, 0);
        c.lineTo(-4, 4);
        c.stroke();
        c.restore();
      }
    }
    c.font = "600 10px system-ui";
    c.letterSpacing = "1px";
    c.fillStyle = "#99aaa0";
    c.fillText("INFART", 12, 267);
    c.fillText("KÄRNA", 899, 257);
    // Environmental markings stay outside the traversable route.
    c.strokeStyle = "#58716a";
    c.globalAlpha = 0.35;
    c.lineWidth = 1;
    c.strokeRect(370, 230, 140, 80);
    c.font = "bold 24px monospace";
    c.fillStyle = "#668279";
    c.fillText("01", 415, 281);
    c.globalAlpha = 1;
    c.strokeStyle = "#476257";
    c.lineWidth = 2;
    for (const [x, y] of [
      [175, 105],
      [550, 530],
      [780, 240],
      [90, 410],
    ]) {
      c.beginPath();
      c.moveTo(x - 8, y);
      c.lineTo(x + 8, y);
      c.moveTo(x, y - 8);
      c.lineTo(x, y + 8);
      c.stroke();
    }
  }
  accept(events) {
    for (const e of events) {
      if (["build", "upgrade", "impact", "death", "leak"].includes(e.type)) {
        const color = e.color || (e.type === "leak" ? "#ff7b85" : "#b9ede0");
        const radius = e.radius || 25;
        this.effects.push({
          type: "ring",
          x: e.x,
          y: e.y,
          color,
          radius: e.type === "death" ? radius * 2 : radius,
          life: 0.4,
          max: 0.4,
        });
        const n = this.reduced
          ? 0
          : e.type === "death"
            ? e.boss
              ? 35
              : 10
            : e.type === "impact"
              ? 5
              : 12;
        for (let i = 0; i < n && this.effects.length < 420; i++) {
          const a = Math.random() * TAU,
            speed = 25 + Math.random() * 85;
          this.effects.push({
            type: "spark",
            x: e.x,
            y: e.y,
            vx: Math.cos(a) * speed,
            vy: Math.sin(a) * speed,
            color,
            life: 0.3 + Math.random() * 0.35,
            max: 0.65,
            size: 1 + Math.random() * 2,
          });
        }
      }
      if (e.type === "shot" && !this.reduced && this.effects.length < 380) {
        this.effects.push({
          type: "flash",
          x: e.x + Math.cos(e.angle) * 22,
          y: e.y + Math.sin(e.angle) * 22,
          color: e.color,
          life: 0.08,
          max: 0.08,
        });
      }
      if (
        ["money", "death", "leak"].includes(e.type) &&
        this.effects.filter((p) => p.type === "text").length < 16
      ) {
        this.effects.push({
          type: "text",
          x: e.x,
          y: e.y - 18,
          text: e.type === "leak" ? `−${e.amount} PV` : `+${e.amount}`,
          color: e.type === "leak" ? "#ff9ca0" : "#f3d389",
          life: 0.9,
          max: 0.9,
        });
      }
    }
  }
  clear() {
    this.effects = [];
    this.enemySprites.clear();
  }
  range(c, t, s, strong = false) {
    c.save();
    c.fillStyle = strong ? "rgba(103,218,185,.065)" : "rgba(103,218,185,.025)";
    c.strokeStyle = strong ? "#88d6c1" : "#597e73";
    c.lineWidth = strong ? 1.5 : 0.8;
    c.beginPath();
    c.arc(t.x, t.y, s.range, 0, TAU);
    c.fill();
    c.setLineDash([5, 6]);
    c.stroke();
    if (s.minRange) {
      c.fillStyle = "rgba(225,144,122,.06)";
      c.strokeStyle = "#d5957e";
      c.beginPath();
      c.arc(t.x, t.y, s.minRange, 0, TAU);
      c.fill();
      c.stroke();
    }
    c.restore();
  }
  render(game, input, elapsed) {
    const c = this.ctx;
    this.visualTime += Math.min(elapsed, 0.05);
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    c.drawImage(this.background, 0, 0);
    c.setTransform(
      this.canvas.width / WORLD.width,
      0,
      0,
      this.canvas.height / WORLD.height,
      0,
      0,
    );
    // The core remains recognizable even without particles.
    c.save();
    c.translate(933, 300);
    c.fillStyle = "#0c1e25";
    c.strokeStyle = game.lives > 10 ? "#7cd9c3" : "#ee8792";
    c.lineWidth = 2;
    polygon(c, 0, 0, 25, 6, Math.PI / 6);
    c.fill();
    c.stroke();
    c.fillStyle = game.lives > 10 ? "#83ddc5" : "#ee8792";
    polygon(c, 0, 0, 12 + Math.sin(this.visualTime * 2) * 1.2, 6, Math.PI / 6);
    c.fill();
    c.restore();
    const selected = game.selected,
      hovered = game.towers.find((t) => t.id === input.hoverId);
    if (input.allRanges)
      for (const t of game.towers) this.range(c, t, towerStats(t));
    if (selected) this.range(c, selected, towerStats(selected), true);
    if (hovered && hovered !== selected && !input.placing)
      this.range(c, hovered, towerStats(hovered), true);
    if (selected?.kind === "relay") {
      const s = towerStats(selected);
      for (const t of game.towers)
        if (
          t.kind !== "relay" &&
          distanceSquared(t, selected) <= s.range ** 2
        ) {
          c.save();
          c.setLineDash([3, 5]);
          line(c, selected.x, selected.y, t.x, t.y, "#7b91d277", 1);
          c.restore();
        }
    }
    for (const t of game.towers) {
      drawTower(c, t.kind, t.x, t.y, t.angle, t.levels, t.recoil);
      if (t.id === game.selectedId) {
        c.strokeStyle = "#b5f0d4";
        c.lineWidth = 1.5;
        c.strokeRect(t.x - 22, t.y - 22, 44, 44);
      }
    }
    for (const e of game.enemies) this.drawEnemy(c, e, game);
    for (const p of game.projectiles) {
      const color = TOWERS[p.kind].color;
      c.save();
      if (p.stats.ground) {
        const total = Math.hypot(p.aimX - p.startX, p.aimY - p.startY),
          left = Math.hypot(p.aimX - p.x, p.aimY - p.y),
          arc = Math.sin(Math.PI * (1 - left / (total || 1))) * 35;
        c.fillStyle = "#07131688";
        c.beginPath();
        c.ellipse(p.x, p.y, 5, 2, 0, 0, TAU);
        c.fill();
        c.fillStyle = color;
        c.beginPath();
        c.arc(p.x, p.y - arc, 5, 0, TAU);
        c.fill();
      } else {
        const angle = Math.atan2(p.y - p.startY, p.x - p.startX);
        line(
          c,
          p.x - Math.cos(angle) * (p.kind === "sniper" ? 30 : 10),
          p.y - Math.sin(angle) * (p.kind === "sniper" ? 30 : 10),
          p.x,
          p.y,
          color,
          p.kind === "cannon" ? 5 : 2,
        );
        c.fillStyle = "#edf2d8";
        c.beginPath();
        c.arc(p.x, p.y, p.kind === "cannon" ? 3 : 1.5, 0, TAU);
        c.fill();
      }
      c.restore();
    }
    const delta = game.paused ? 0 : Math.min(elapsed, 0.05) * game.speed;
    for (const p of this.effects) {
      p.life -= delta;
      if (p.life <= 0) continue;
      c.save();
      c.globalAlpha = Math.min(1, p.life / p.max);
      c.fillStyle = p.color;
      c.strokeStyle = p.color;
      if (p.type === "spark") {
        p.x += p.vx * delta;
        p.y += p.vy * delta;
        c.fillRect(p.x, p.y, p.size, p.size);
      }
      if (p.type === "ring") {
        c.lineWidth = 2;
        c.beginPath();
        c.arc(p.x, p.y, Math.max(1, p.radius * (1 - p.life / p.max)), 0, TAU);
        c.stroke();
      }
      if (p.type === "flash") {
        c.beginPath();
        c.arc(p.x, p.y, 4, 0, TAU);
        c.fill();
      }
      if (p.type === "text") {
        p.y -= 16 * delta;
        c.font = "bold 12px system-ui";
        c.textAlign = "center";
        c.fillText(p.text, p.x, p.y);
      }
      c.restore();
    }
    this.effects = this.effects.filter((p) => p.life > 0);
    if (input.placing && input.cursor) {
      const { gx, gy } = input.cursor,
        check = game.placement(input.placing, gx, gy),
        t = { x: (gx + 0.5) * 40, y: (gy + 0.5) * 40 };
      this.range(
        c,
        t,
        towerStats({ kind: input.placing, levels: [0, 0] }),
        true,
      );
      c.fillStyle = check.ok ? "#64d4ad25" : "#ec85852a";
      c.fillRect(gx * 40, gy * 40, 40, 40);
      c.strokeStyle = check.ok ? "#82e1b5" : "#ef9797";
      c.lineWidth = 2;
      c.strokeRect(gx * 40 + 1, gy * 40 + 1, 38, 38);
      c.save();
      c.globalAlpha = 0.65;
      drawTower(c, input.placing, t.x, t.y);
      c.restore();
    } else if (input.keyboard && input.cursor) {
      c.strokeStyle = "#e8d293";
      c.lineWidth = 2;
      c.strokeRect(input.cursor.gx * 40 + 1, input.cursor.gy * 40 + 1, 38, 38);
    }
  }
  drawEnemy(c, e, game) {
    const def = ENEMIES[e.kind],
      r = e.radius,
      sprite = this.enemySprites.get(e.kind),
      visualRadius = sprite ? sprite.size / 2 : r;
    c.save();
    c.translate(e.x, e.y);
    c.fillStyle = "#04121666";
    c.beginPath();
    c.ellipse(
      2,
      sprite ? visualRadius * 0.8 : r * 0.5,
      sprite ? visualRadius * 0.7 : r,
      sprite ? visualRadius * 0.25 : r * 0.6,
      0,
      0,
      TAU,
    );
    c.fill();
    if (e.slowUntil > game.time) {
      c.strokeStyle = "#80d9f0";
      c.lineWidth = 2;
      c.beginPath();
      c.arc(0, 0, visualRadius + 4, 0, TAU);
      c.stroke();
    }
    if (e.vulnerableUntil > game.time) {
      c.strokeStyle = "#d7a2f7";
      c.lineWidth = 1;
      c.setLineDash([3, 3]);
      c.beginPath();
      c.arc(0, 0, visualRadius + 7, 0, TAU);
      c.stroke();
      c.setLineDash([]);
    }
    if (sprite) {
      this.enemySprites.draw(c, e, sprite);
      if (e.hitFlash > 0) {
        c.strokeStyle = "#ffffff";
        c.lineWidth = 2;
        c.beginPath();
        c.arc(0, 0, visualRadius, 0, TAU);
        c.stroke();
      }
      c.rotate(e.angle); // Armor direction only; the sprite itself stays upright.
    } else {
      // Keep the existing art for other kinds and while a sheet is loading/unavailable.
      c.rotate(e.angle);
      c.fillStyle = e.hitFlash > 0 ? "#ffffff" : def.color;
      c.strokeStyle = "#1a2028";
      c.lineWidth = 2;
      if (e.kind === "fast" || e.kind === "swift") {
        polygon(c, 0, 0, r, 3, 0);
        c.fill();
        c.stroke();
        line(c, -r + 2, -3, 1, -3, "#785c38", 1);
      } else if (e.kind === "tank" || e.kind === "boss") {
        c.fillStyle = "#283e46";
        c.fillRect(-r, -r, r * 2, r * 0.35);
        c.fillRect(-r, r * 0.65, r * 2, r * 0.35);
        c.fillStyle = e.hitFlash > 0 ? "#fff" : def.color;
        polygon(c, 0, 0, r * 0.96, 6, Math.PI / 6);
        c.fill();
        c.stroke();
        c.fillStyle = "#24333d";
        polygon(c, 0, 0, r * 0.5, 6, Math.PI / 6);
        c.fill();
        c.fillStyle = def.color;
        c.fillRect(1, -3, r, 6);
      } else {
        polygon(
          c,
          0,
          0,
          r,
          e.kind === "elite" ? 5 : 6,
          e.kind === "elite" ? 0 : Math.PI / 6,
        );
        c.fill();
        c.stroke();
        c.fillStyle = "#22343b";
        polygon(c, 0, 0, r * 0.48, e.kind === "elite" ? 5 : 4);
        c.fill();
      }
    }
    if (game.armorFor(e) > 0.2) {
      c.strokeStyle =
        e.kind === "boss" && e.age % 10 < 3 ? "#d1ecff" : "#adbdcb";
      c.lineWidth = 2.5;
      c.beginPath();
      c.arc(0, 0, visualRadius + 2, -Math.PI * 0.55, Math.PI * 0.55);
      c.stroke();
    }
    c.restore();
    if (e.kind === "regen") {
      c.fillStyle = "#d9f5c1";
      c.fillRect(e.x - 4, e.y - 1, 8, 2);
      c.fillRect(e.x - 1, e.y - 4, 2, 8);
    }
    if (e.burnUntil > game.time) {
      c.fillStyle = "#f2b179";
      polygon(c, e.x - 4, e.y - visualRadius, 4, 3, -Math.PI / 2);
      c.fill();
    }
    if (e.hp < e.maxHp || e.kind === "boss" || e.kind === "elite") {
      const w = Math.max(24, visualRadius * 2);
      c.fillStyle = "#07171d";
      c.fillRect(e.x - w / 2, e.y - visualRadius - 10, w, 4);
      c.fillStyle = e.kind === "boss" ? "#f58c9e" : "#c6d9b2";
      c.fillRect(e.x - w / 2, e.y - visualRadius - 10, (w * e.hp) / e.maxHp, 4);
    }
  }
}
