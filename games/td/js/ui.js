import {
  WORLD,
  TOWERS,
  ENEMIES,
  TARGET_MODES,
  towerStats,
  upgradeOption,
} from "./data.js";
import { previewWave, WAVES } from "./waves.js";
import { paintIcons } from "./renderer.js";
const number = (n) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 1 }).format(n);
const icon = (kind) =>
  `<canvas width="96" height="96" data-tower-icon="${kind}" aria-hidden="true"></canvas>`;
const $ = (id) => document.getElementById(id);
export class UI {
  constructor(game, input, onReset) {
    this.game = game;
    this.input = input;
    this.onReset = onReset;
    this.panelKey = "";
    this.previewKey = "";
    this.bannerTimer = null;
    this.toastTimer = null;
    this.dialogPause = false;
    this.shop = $("tower-shop");
    this.panel = $("tower-panel");
    this.shop.innerHTML = Object.entries(TOWERS)
      .map(
        ([kind, t], i) =>
          `<button class="td-tower-card" data-kind="${kind}" style="--tower-color:${t.color}" aria-pressed="false" aria-label="${t.name}, ${t.cost} krediter. ${t.role}">${icon(kind)}<span class="td-card-info"><strong>${t.name}</strong><span>${t.role}</span></span><span class="td-card-cost">${t.cost}<small>${i + 1}</small></span></button>`,
      )
      .join("");
    paintIcons(this.shop);
    this.shop.addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-kind]");
      if (b) this.choose(b.dataset.kind);
    });
    this.panel.addEventListener("click", (ev) => {
      const b = ev.target.closest("button");
      if (!b) return;
      if (b.dataset.upgrade !== undefined) {
        const result = game.upgrade(game.selectedId, Number(b.dataset.upgrade));
        this.notify(result.ok ? "Uppgradering installerad." : result.reason);
        this.refresh(true);
      }
      if (b.id === "sell") {
        const result = game.sell(game.selectedId);
        this.notify(
          result.ok ? `Torn sålt · +${result.value} krediter` : result.reason,
        );
        this.refresh(true);
      }
    });
    this.panel.addEventListener("change", (ev) => {
      if (ev.target.id === "targeting") {
        game.setTargeting(game.selectedId, ev.target.value);
        this.refresh();
      }
    });
    $("start").addEventListener("click", () => {
      const result = game.startWave();
      if (!result.ok) this.notify(result.reason);
      this.refresh();
    });
    $("pause").addEventListener("click", () => {
      game.setPaused(!game.paused);
      this.refresh();
    });
    for (const b of document.querySelectorAll("[data-speed]"))
      b.addEventListener("click", () => {
        game.setSpeed(Number(b.dataset.speed));
        this.refresh();
      });
    $("ranges").addEventListener("click", () => {
      input.allRanges = !input.allRanges;
      this.refresh();
    });
    $("cancel").addEventListener("click", () => this.cancel());
    $("place-confirm").addEventListener("click", () => this.place());
    $("help").addEventListener("click", () => this.openDialog("help-dialog"));
    $("new-game").addEventListener("click", () =>
      this.openDialog("restart-dialog"),
    );
    $("keep-playing").addEventListener("click", () =>
      $("restart-dialog").close(),
    );
    $("confirm-restart").addEventListener("click", () => {
      this.dialogPause = false;
      $("restart-dialog").close();
      this.reset();
    });
    $("restart").addEventListener("click", () => this.reset());
    for (const id of ["help-dialog", "restart-dialog"])
      $(id).addEventListener("close", () => {
        if (!game.terminal) game.setPaused(this.dialogPause);
        this.refresh();
      });
    $("shop-toggle").addEventListener("click", () => {
      this.input.shopOpen = !this.input.shopOpen;
      this.refresh();
    });
    this.refresh(true);
  }
  openDialog(id) {
    this.dialogPause = this.game.paused;
    this.game.setPaused(true);
    $(id).showModal();
    this.refresh();
  }
  reset() {
    clearTimeout(this.bannerTimer);
    clearTimeout(this.toastTimer);
    $("wave-banner").classList.remove("visible");
    $("toast").classList.remove("visible");
    this.game.reset();
    this.input.placing = null;
    this.input.cursor = null;
    this.input.hoverId = null;
    this.input.allRanges = false;
    this.input.keyboard = false;
    this.input.touch = false;
    this.input.shopOpen = false;
    this.panelKey = "";
    this.previewKey = "";
    this.onReset();
    this.refresh(true);
    $("start").focus();
  }
  choose(kind) {
    if (this.game.terminal) return;
    this.input.placing = this.input.placing === kind ? null : kind;
    this.game.select(null);
    this.input.hoverId = null;
    this.refresh(true);
  }
  cancel() {
    this.input.placing = null;
    this.input.cursor = null;
    this.input.hoverId = null;
    this.game.select(null);
    this.refresh(true);
  }
  place(keep = false) {
    if (!this.input.cursor || !this.input.placing) return;
    const result = this.game.place(
      this.input.placing,
      this.input.cursor.gx,
      this.input.cursor.gy,
    );
    if (result.ok) {
      if (!keep) {
        this.input.placing = null;
        this.input.shopOpen = false;
      }
      this.notify(`${TOWERS[result.tower.kind].name} byggt.`);
    } else this.notify(result.reason);
    this.refresh(true);
  }
  notify(message) {
    $("toast").textContent = message;
    $("toast").classList.add("visible");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(
      () => $("toast").classList.remove("visible"),
      2600,
    );
  }
  events(events) {
    for (const event of events) {
      if (event.type === "wave") {
        const p = previewWave(event.number);
        $("wave-banner").textContent =
          `${p.boss ? "BOSS · " : ""}VÅG ${event.number} — ${event.name}`;
        $("wave-banner").classList.add("visible");
        clearTimeout(this.bannerTimer);
        this.bannerTimer = setTimeout(
          () => $("wave-banner").classList.remove("visible"),
          2300,
        );
        if (event.bonus) this.notify(`Tidig start · +${event.bonus} krediter`);
      }
      if (event.type === "clear")
        this.notify(`Våg ${event.number} avklarad · +${event.amount} krediter`);
      if (event.type === "finish") {
        this.input.placing = null;
        this.input.cursor = null;
        this.refresh(true);
        $("restart").focus();
      }
    }
  }
  refresh(force = false) {
    const g = this.game;
    const inspecting =
      !!g.selected && !this.input.placing && !this.input.shopOpen;
    document
      .querySelector(".td-sidebar")
      .classList.toggle("inspecting", inspecting);
    $("sidebar-title").textContent = inspecting ? "TORNPANEL" : "ARSENAL";
    $("arsenal-count").hidden = !!g.selected;
    $("shop-toggle").hidden = !g.selected;
    $("shop-toggle").textContent = inspecting ? "← Arsenal" : "Valt torn →";
    const text = (id, value) => {
      const el = $(id);
      if (el.textContent !== String(value)) el.textContent = value;
    };
    text("gold", g.gold);
    $("lives").innerHTML = `${g.lives} <small>/ ${WORLD.lives}</small>`;
    $("wave").innerHTML = `${g.wave} <small>/ ${WAVES.length}</small>`;
    text("remaining", g.remaining);
    $("integrity-bar").style.width = `${(g.lives / WORLD.lives) * 100}%`;
    $("integrity-bar").classList.toggle("critical", g.lives <= 10);
    text(
      "phase",
      g.terminal
        ? g.status === "won"
          ? "SEKTORN SÄKRAD"
          : "KÄRNAN FÖRLORAD"
        : g.paused
          ? "TAKTISK PAUS"
          : g.status === "wave"
            ? "FÖRSVAR AKTIVT"
            : "FÖRBERED FÖRSVARET",
    );
    $("pause").textContent = g.paused ? "▶ Fortsätt" : "Ⅱ Pausa";
    $("pause").setAttribute(
      "aria-label",
      g.paused ? "Fortsätt spelet" : "Pausa spelet",
    );
    $("pause").setAttribute("aria-pressed", g.paused);
    $("pause").disabled = g.terminal;
    $("pause-overlay").hidden = !g.paused || g.terminal;
    for (const b of document.querySelectorAll("[data-speed]")) {
      b.setAttribute("aria-pressed", Number(b.dataset.speed) === g.speed);
      b.disabled = g.terminal;
    }
    $("ranges").setAttribute("aria-pressed", this.input.allRanges);
    const next = previewWave(g.wave + 1),
      info = g.startInfo();
    $("start").disabled = !info.ok;
    $("start").textContent = g.terminal
      ? "Omgång avslutad"
      : !next
        ? "Sista vågen pågår"
        : !info.ok
          ? info.reason
          : info.early
            ? `Nästa våg · +${info.bonus} ▶`
            : `Starta våg ${g.wave + 1} ▶`;
    const previewKey = `${g.wave}:${g.terminal}`;
    if (previewKey !== this.previewKey) {
      this.previewKey = previewKey;
      text(
        "next-label",
        next ? `NÄSTA VÅG · ${g.wave + 1} / ${WAVES.length}` : "SISTA VÅGEN",
      );
      text(
        "next-name",
        next
          ? next.name
          : g.status === "won"
            ? "Alla vågor avklarade"
            : "Håll ut. Skydda kärnan.",
      );
      $("next-enemies").innerHTML = next
        ? Object.entries(next.counts)
            .map(
              ([kind, count]) =>
                `<span title="${ENEMIES[kind].name} · ${ENEMIES[kind].leak} basskada" style="--enemy-color:${ENEMIES[kind].color}"><i></i>${count} ${ENEMIES[kind].name}</span>`,
            )
            .join("")
        : "";
    }
    for (const b of this.shop.querySelectorAll("[data-kind]")) {
      b.setAttribute("aria-pressed", this.input.placing === b.dataset.kind);
      b.classList.toggle("unaffordable", g.gold < TOWERS[b.dataset.kind].cost);
      b.disabled = g.terminal;
    }
    this.refreshPanel(force);
    const boss = g.enemies.find((e) => e.kind === "boss");
    $("boss").hidden = !boss || g.terminal;
    if (boss) {
      text(
        "boss-name",
        WAVES[boss.wave - 1].name + (boss.age % 10 < 3 ? " · PANSARPULS" : ""),
      );
      text("boss-hp", `${Math.ceil(boss.hp)} / ${Math.ceil(boss.maxHp)}`);
      $("boss-bar").style.width = `${(boss.hp / boss.maxHp) * 100}%`;
    }
    $("end-overlay").hidden = !g.terminal;
    if (g.terminal) {
      text(
        "end-kicker",
        g.status === "won" ? "UPPDRAG SLUTFÖRT" : "SIGNAL FÖRLORAD",
      );
      text(
        "end-title",
        g.status === "won" ? "Kärnan är säker." : "Försvaret föll.",
      );
      text(
        "end-summary",
        `${g.wavesCleared} vågor avklarade · ${g.kills} fiender stoppade · ${number(g.totalDamage)} skada`,
      );
    }
    this.refreshPlacement();
  }
  refreshPlacement() {
    const { placing, cursor, touch } = this.input;
    let message = "Välj ett torn i arsenalen för att bygga ditt försvar.";
    let valid = false;
    if (this.game.terminal) message = "Starta en ny omgång för att spela igen.";
    else if (placing) {
      if (cursor) {
        const check = this.game.placement(placing, cursor.gx, cursor.gy);
        message = check.reason;
        valid = check.ok;
      } else
        message = `${TOWERS[placing].name} vald. Välj en ledig ruta nära vägen.`;
    } else if (this.game.selected)
      message =
        "Torn valt. Ändra målläge, uppgradera eller sälj i tornpanelen.";
    $("placement-message").textContent = message;
    $("placement-message").classList.toggle(
      "invalid",
      !!placing && !!cursor && !valid,
    );
    $("cancel").hidden = !placing;
    $("place-confirm").hidden = !(placing && cursor && touch);
    $("place-confirm").disabled = !valid;
  }
  refreshPanel(force = false) {
    const g = this.game,
      t = g.selected,
      kind = this.input.placing || t?.kind,
      key = `${this.input.placing || ""}:${t?.id || ""}:${t?.levels.join(",") || ""}:${g.terminal}`;
    if (force || key !== this.panelKey) {
      this.panelKey = key;
      if (!kind) {
        this.panel.innerHTML =
          '<div class="td-panel-empty"><span class="td-empty-reticle" aria-hidden="true">⌖</span><h3>Ditt nästa drag</h3><p>Välj ett torn ovanför för att se dess roll och räckvidd. Klicka på ett byggt torn för att uppgradera.</p><div class="td-tip">Tips: kombinera bromsning med ytskada. Använd Långskott mot pansar.</div></div>';
        return;
      }
      const def = TOWERS[kind],
        placed = t && !this.input.placing;
      this.panel.innerHTML = `<div class="td-inspector-head" style="--tower-color:${def.color}">${icon(kind)}<div><span class="td-label">${placed ? "VALT TORN" : "BYGG TORNET"}</span><h3>${def.name}</h3><span>${def.role}</span></div>${placed ? `<span class="td-tier-badge">${t.levels.join(" / ")}</span>` : ""}</div><p class="td-description">${def.description}</p><dl class="td-stat-grid"><div><dt>Skada</dt><dd id="stat-damage"></dd></div><div><dt>Skott / s</dt><dd id="stat-rate"></dd></div><div><dt>Räckvidd</dt><dd id="stat-range"></dd></div><div><dt>${kind === "relay" ? "Skadebonus" : "Pansarbrytning"}</dt><dd id="stat-special"></dd></div>${placed ? '<div><dt>Elimineringar</dt><dd id="stat-kills"></dd></div><div><dt>Total skada</dt><dd id="stat-total"></dd></div>' : ""}</dl><p id="stat-effects" class="td-effects-info"></p>${
        placed
          ? `<div class="td-target-row"><label for="targeting">Målläge</label><select id="targeting" ${kind === "relay" ? "disabled" : ""}>${TARGET_MODES.map((m) => `<option ${t.targeting === m ? "selected" : ""}>${m}</option>`).join("")}</select></div><div class="td-upgrades"><div class="td-upgrades-title"><strong>UPPGRADERINGAR</strong><span>Nivå 2 väljer väg</span></div>${def.paths
              .map((path, p) => {
                const o = upgradeOption(t, p);
                return `<div class="td-upgrade-path"><div class="td-path-label"><span>${p === 0 ? "A" : "B"} · ${path.name}</span><span class="td-level-dots" aria-label="Nivå ${t.levels[p]} av 3">${[1, 2, 3].map((l) => `<i class="${t.levels[p] >= l ? "filled" : ""}"></i>`).join("")}</span></div><button data-upgrade="${p}" class="td-upgrade-button"><span><strong>${o.maxed ? "Fullt uppgraderad" : o.locked ? "Annan specialisering vald" : o.name}</strong><small>${o.maxed ? "Alla tre nivåer installerade" : o.locked ? "Nivå 2–3 är låsta" : o.description}</small></span><b>${o.maxed ? "✓" : o.locked ? "Låst" : o.cost}</b></button></div>`;
              })
              .join(
                "",
              )}</div><button id="sell" class="td-button td-sell">Sälj torn <strong id="sell-value"></strong></button><p class="td-sell-note">70% tillbaka av torn och uppgraderingar.</p>`
          : `<div class="td-preview-cost"><strong>${def.cost} krediter</strong><span>Två vägar · tre nivåer per väg</span></div>`
      }`;
      paintIcons(this.panel);
    }
    if (!kind) return;
    const placed = t && !this.input.placing,
      s = placed ? g.effectiveStats(t) : towerStats({ kind, levels: [0, 0] });
    $("stat-damage").textContent = number(s.damage);
    $("stat-rate").textContent = number(s.rate);
    $("stat-range").textContent = s.minRange
      ? `${s.minRange}–${s.range}`
      : s.range;
    $("stat-special").textContent =
      `${Math.round((kind === "relay" ? s.buffDamage : s.penetration) * 100)}%`;
    const effects = [];
    if (s.splash) effects.push(`Ytradie ${s.splash}`);
    if (s.slow)
      effects.push(
        `Bromsar ${Math.round(s.slow * 100)}% i ${number(s.slowTime)} s`,
      );
    if (s.burn) effects.push(`Brand ${s.burn}/s i ${s.burnTime} s`);
    if (s.vulnerability)
      effects.push(`Sårbarhet +${Math.round(s.vulnerability * 100)}%`);
    if (kind === "relay")
      effects.push(`Eldhastighet +${Math.round(s.buffRate * 100)}%`);
    if (s.auraDamage || s.auraRate) effects.push("Reläbonus ingår");
    $("stat-effects").textContent = effects.join(" · ");
    if (placed) {
      $("stat-kills").textContent = t.kills;
      $("stat-total").textContent = number(t.totalDamage);
      $("sell-value").textContent = `+${g.sellValue(t)}`;
      $("sell").disabled = g.terminal;
      for (const b of this.panel.querySelectorAll("[data-upgrade]")) {
        const o = upgradeOption(t, Number(b.dataset.upgrade));
        b.disabled = g.terminal || o.maxed || o.locked || g.gold < o.cost;
        b.title =
          !o.maxed && !o.locked && g.gold < o.cost
            ? `Saknar ${o.cost - g.gold} krediter`
            : "";
      }
    }
  }
}
