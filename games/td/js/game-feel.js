import { Renderer } from "./renderer.js";
import { UI } from "./ui.js";
import { previewWave } from "./waves.js";

const TAU = Math.PI * 2;

const style = document.createElement("style");
style.textContent = `
  .td-wave-banner.boss-intro {
    top: 20%;
    min-width: min(520px, 82%);
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 16px 28px 17px;
    color: #ffe7b0;
    background: linear-gradient(180deg, rgba(66,24,24,.96), rgba(34,20,18,.96));
    border: 1px solid #d48954;
    box-shadow: 0 12px 42px #0009, 0 0 28px rgba(231,126,68,.2);
    overflow: hidden;
    animation: tdBossIntroPulse .72s ease-out 2;
  }
  .td-wave-banner.boss-intro::before,
  .td-wave-banner.boss-intro::after {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    width: 3px;
    background: #e79255;
    opacity: .85;
  }
  .td-wave-banner.boss-intro::before { left: 0; }
  .td-wave-banner.boss-intro::after { right: 0; }
  .td-wave-banner.boss-intro strong {
    display: block;
    font-size: clamp(16px, 2vw, 22px);
    letter-spacing: .08em;
  }
  .td-boss-warning {
    display: block;
    color: #ff9b68;
    font-size: 11px;
    font-weight: 850;
    letter-spacing: .2em;
  }
  .td-canvas-wrap.boss-intro-active::after {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 3;
    box-shadow: inset 0 0 46px rgba(198,71,47,.28);
    animation: tdBossEdgeWarning .72s ease-out 2;
  }
  @keyframes tdBossIntroPulse {
    0% { transform: translate(-50%, -8px) scale(.97); filter: brightness(.82); }
    38% { transform: translate(-50%, 0) scale(1.018); filter: brightness(1.16); }
    100% { transform: translate(-50%, 0) scale(1); filter: brightness(1); }
  }
  @keyframes tdBossEdgeWarning {
    0% { opacity: 0; }
    35% { opacity: 1; }
    100% { opacity: .15; }
  }
  @media (prefers-reduced-motion: reduce) {
    .td-wave-banner.boss-intro,
    .td-canvas-wrap.boss-intro-active::after { animation: none; }
  }
`;
document.head.append(style);

// Layer richer feedback on top of the existing effect system without changing
// simulation, damage, timing, targeting or wave composition.
const originalAccept = Renderer.prototype.accept;
Renderer.prototype.accept = function acceptWithGameFeel(events) {
  originalAccept.call(this, events);

  for (const event of events) {
    if (event.type === "impact" && !this.reduced) {
      const radius = Math.max(7, Math.min(22, (event.radius || 8) * 0.7));
      this.effects.push({
        type: "ring",
        x: event.x,
        y: event.y,
        color: "#fff2c5",
        radius,
        life: 0.18,
        max: 0.18,
      });

      for (let i = 0; i < 3 && this.effects.length < 420; i++) {
        const angle = Math.random() * TAU;
        const speed = 55 + Math.random() * 65;
        this.effects.push({
          type: "spark",
          x: event.x,
          y: event.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: i === 0 ? "#fff4d2" : event.color || "#e6b86d",
          life: 0.14 + Math.random() * 0.12,
          max: 0.26,
          size: 1.2 + Math.random() * 1.4,
        });
      }
    }

    if (event.type === "death") {
      const boss = !!event.boss;
      const radius = Math.max(12, event.radius || 12);
      const rings = boss ? 3 : 2;

      for (let i = 0; i < rings && this.effects.length < 420; i++) {
        this.effects.push({
          type: "ring",
          x: event.x,
          y: event.y,
          color: i === 0 ? "#ffe4a3" : event.color || "#d6b172",
          radius: radius * (boss ? 2.2 + i * 0.75 : 1.45 + i * 0.55),
          life: (boss ? 0.7 : 0.42) + i * 0.08,
          max: (boss ? 0.7 : 0.42) + i * 0.08,
        });
      }

      if (!this.reduced) {
        const count = boss ? 28 : 8;
        for (let i = 0; i < count && this.effects.length < 420; i++) {
          const angle = Math.random() * TAU;
          const speed = (boss ? 65 : 38) + Math.random() * (boss ? 120 : 70);
          this.effects.push({
            type: "spark",
            x: event.x,
            y: event.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color:
              i % 3 === 0
                ? "#ffe7a0"
                : i % 3 === 1
                  ? event.color || "#cf9d62"
                  : "#805b3d",
            life: 0.28 + Math.random() * (boss ? 0.65 : 0.32),
            max: boss ? 0.93 : 0.6,
            size: 1.3 + Math.random() * (boss ? 3.4 : 2.1),
          });
        }
      }
    }
  }
};

const originalEvents = UI.prototype.events;
UI.prototype.events = function eventsWithBossIntro(events) {
  originalEvents.call(this, events);

  for (const event of events) {
    if (event.type !== "wave") continue;
    const preview = previewWave(event.number);
    if (!preview?.boss) continue;

    const banner = document.getElementById("wave-banner");
    const wrap = document.getElementById("canvas-wrap");
    if (!banner) continue;

    banner.classList.add("boss-intro");
    wrap?.classList.add("boss-intro-active");
    banner.innerHTML = `<span class="td-boss-warning">⚠ BOSS INKOMMANDE</span><strong>VÅG ${event.number} · ${event.name}</strong>`;

    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => {
      banner.classList.remove("visible", "boss-intro");
      wrap?.classList.remove("boss-intro-active");
    }, 3200);
  }
};
