import { Renderer } from "./renderer.js";

const TAU = Math.PI * 2;

Renderer.prototype.drawCore = function drawLivingCore(c, game) {
  const critical = game.lives <= 10;
  const impact = this.coreImpact;
  const time = this.visualTime;
  const idle = this.reduced ? 0 : Math.sin(time * 1.8) * 0.5 + Math.sin(time * 0.73 + 1.2) * 0.22;
  const pulse = 1 + idle * 0.035 + impact * 0.13;
  const glow = critical ? "#c95c43" : "#d89a3d";
  const bright = critical ? "#ff9a72" : "#ffd36a";
  const hot = critical ? "#ffd0a0" : "#fff0b5";

  c.save();
  c.translate(933, 300);

  // Soft breathing halo keeps the core alive even while nothing is happening.
  const haloRadius = 34 + (this.reduced ? 0 : Math.sin(time * 1.55) * 2.2) + impact * 8;
  const halo = c.createRadialGradient(0, 0, 3, 0, 0, haloRadius);
  halo.addColorStop(0, critical ? "rgba(255,126,82,.22)" : "rgba(255,205,92,.20)");
  halo.addColorStop(0.48, critical ? "rgba(217,82,59,.11)" : "rgba(218,153,55,.10)");
  halo.addColorStop(1, "rgba(218,153,55,0)");
  c.fillStyle = halo;
  c.beginPath();
  c.arc(0, 0, haloRadius, 0, TAU);
  c.fill();

  // Two faint counter-rotating energy arcs add movement without changing the silhouette.
  if (!this.reduced) {
    c.save();
    c.rotate(time * 0.2);
    c.strokeStyle = critical ? "rgba(255,130,92,.34)" : "rgba(246,186,75,.30)";
    c.lineWidth = 1;
    c.setLineDash([8, 8]);
    c.beginPath();
    c.arc(0, 0, 25 + impact * 2, -0.5, 3.15);
    c.stroke();
    c.rotate(-time * 0.47);
    c.strokeStyle = critical ? "rgba(255,176,120,.22)" : "rgba(255,221,129,.22)";
    c.setLineDash([3, 11]);
    c.beginPath();
    c.arc(0, 0, 29 + impact * 3, 0.65, 5.4);
    c.stroke();
    c.restore();
  }

  c.scale(pulse, pulse);
  c.shadowColor = impact > 0.05 ? "#ff8a43" : glow;
  c.shadowBlur = 15 + impact * 24 + Math.max(0, idle) * 3;
  c.fillStyle = impact > 0.05 ? "#e6a449" : glow;
  c.strokeStyle = bright;
  c.lineWidth = 2 + impact * 1.4;
  c.beginPath();
  c.moveTo(0, -18);
  c.lineTo(15, 0);
  c.lineTo(0, 18);
  c.lineTo(-15, 0);
  c.closePath();
  c.fill();
  c.stroke();

  // Inner shard drifts very slightly so the energy feels contained rather than static.
  c.shadowBlur = 7 + impact * 10;
  c.shadowColor = hot;
  c.fillStyle = hot;
  c.globalAlpha = 0.78 + impact * 0.18;
  c.save();
  if (!this.reduced) c.rotate(Math.sin(time * 1.15) * 0.06);
  c.beginPath();
  c.moveTo(0, -12.5 - impact * 1.5);
  c.lineTo(5.2 + impact * 1.3, -0.5);
  c.lineTo(0.5, 7 + impact * 2.2);
  c.lineTo(-3.5 - impact * 0.8, 1);
  c.closePath();
  c.fill();
  c.restore();

  // A leak produces a short shock-ring around the core in addition to the existing hit pulse.
  if (impact > 0.02) {
    c.globalAlpha = Math.min(0.65, impact * 0.7);
    c.strokeStyle = critical ? "#ff785d" : "#ffc35e";
    c.lineWidth = 1.4;
    c.beginPath();
    c.arc(0, 0, 22 + (1 - impact) * 18, 0, TAU);
    c.stroke();
  }

  c.restore();
};
