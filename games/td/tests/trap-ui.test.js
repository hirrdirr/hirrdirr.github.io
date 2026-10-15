import test from "node:test";
import assert from "node:assert/strict";
import { Game, STEP } from "../js/engine.js";
import { UI } from "../js/ui.js";
import { WORLD } from "../js/data.js";
import { pointOnPath } from "../js/map.js";

test("the trap inspector shows DPS, slow, HP, remaining-value sale and depletion", (t) => {
  const ids = ["trap-state", "trap-status", "trap-capacity", "trap-hp",
    "trap-progress", "trap-progress-fill", "trap-kills", "trap-damage",
    "trap-triggers", "sell-value", "sell"];
  const elements = new Map(ids.map((id) => [id, {
    textContent: "", dataset: {}, style: {}, attributes: {},
    setAttribute(name, value) { this.attributes[name] = String(value); },
  }]));
  for (const [name, value] of Object.entries({
    document: { getElementById(id) {
      assert.ok(elements.has(id), `Unexpected inspector binding: ${id}`);
      return elements.get(id);
    } },
    Image: class { set src(value) {} },
  })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { value, configurable: true });
    t.after(() => previous ? Object.defineProperty(globalThis, name, previous) : delete globalThis[name]);
  }
  const game = new Game();
  const trap = game.place("spike", 200 / WORLD.tile - 0.5, 300 / WORLD.tile - 0.5).trap;
  const ui = { game, panel: { innerHTML: "", isConnected: false, querySelectorAll: () => [] } };
  const refresh = (rebuild = false) => UI.prototype.refreshTrapPanel.call(ui, "spike", trap, rebuild);
  const text = (id) => elements.get(id).textContent;
  refresh(true);
  assert.match(ui.panel.innerHTML, /role="meter" aria-label="Fällans HP"/);
  assert.doesNotMatch(ui.panel.innerHTML, /Återarmning|Återanvändbar|trap-time|Skada \/ träff/);
  assert.match(ui.panel.innerHTML, /Skada \/ sekund<\/dt><dd>12/);
  assert.match(ui.panel.innerHTML, /Bromsning på spikar<\/dt><dd>10%/);
  assert.equal(text("trap-hp"), "5 / 5");
  assert.equal(text("trap-status"), "Indragen · redo");
  assert.equal(text("sell-value"), "+14");

  const enemy = game.spawn("normal", 1);
  enemy.distance = trap.distance;
  enemy.speed = 0;
  Object.assign(enemy, pointOnPath(enemy.distance));
  game.update(STEP);
  refresh();
  assert.equal(text("trap-hp"), "4 / 5");
  assert.equal(text("trap-status"), "Utlöst");
  assert.equal(text("trap-capacity"), "4 passager kvar");
  assert.equal(text("sell-value"), "+11");
  assert.equal(elements.get("trap-progress").attributes["aria-valuenow"], "4");
  assert.equal(elements.get("trap-progress").attributes["aria-valuemax"], "5");
  assert.equal(elements.get("trap-progress-fill").style.width, "80%");

  for (let i = 0; i < 4; i++) {
    const other = game.spawn("normal", 1);
    other.distance = trap.distance;
    other.speed = 0;
    Object.assign(other, pointOnPath(other.distance));
  }
  game.update(STEP);
  refresh();
  assert.equal(text("trap-hp"), "0 / 5");
  assert.equal(text("trap-status"), "Utlöst", "Zero unspent HP still finishes paid contacts");
  assert.equal(elements.get("trap-progress-fill").style.width, "0%");
  assert.equal(elements.get("sell").disabled, true);
  assert.equal(text("sell-value"), "+0");
});
