import { Renderer } from "./renderer.js";
import { UI } from "./ui.js";
import { previewWave } from "./waves.js";

const TAU = Math.PI * 2;

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
    if (!banner) continue;

    banner.classList.add("boss-intro");
    banner.innerHTML = `<span class="td-boss-warning">⚠ BOSS INKOMMANDE</span><strong>VÅG ${event.number} · ${event.name}</strong>`;

    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => {
      banner.classList.remove("visible", "boss-intro");
    }, 3200);
  }
};
