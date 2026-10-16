import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../js/engine.js";
import { UI } from "../js/ui.js";

test("the inspector keeps previews readable before affordability and refreshes without replacing unchanged rows", (t) => {
  const element = (dataset = {}) => ({
    dataset, textContent: "", disabled: false, hidden: false, writes: 0,
    setAttribute() {},
    get innerHTML() { return this.html || ""; },
    set innerHTML(value) { this.html = value; this.writes++; },
  });
  const ids = ["stat-damage", "stat-rate", "stat-range", "stat-special",
    "stat-kills", "stat-total", "stat-effects", "sell-value", "sell", "upgrade-preview-note"];
  const elements = new Map(ids.map((id) => [id, element()]));
  const previews = [0, 1].map((p) => element({ upgradePreview: String(p) }));
  const buttons = [0, 1].map((p) => element({ upgrade: String(p) }));
  const panel = Object.assign(element(), {
    isConnected: false,
    querySelectorAll(selector) {
      if (selector === "[data-upgrade-preview]") return previews;
      if (selector === "[data-upgrade]") return buttons;
      return [];
    },
  });
  for (const [name, value] of Object.entries({
    document: { getElementById(id) {
      assert.ok(elements.has(id), `Unexpected binding: ${id}`);
      return elements.get(id);
    } },
    Image: class { set src(value) {} },
  })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { value, configurable: true });
    t.after(() => previous ? Object.defineProperty(globalThis, name, previous) : delete globalThis[name]);
  }
  const game = new Game();
  const tower = game.place("repeater", 5, 6).tower;
  const ui = { game, panel, input: { placing: null } };
  const refresh = (force = false) => UI.prototype.refreshPanel.call(ui, force);
  const text = (id) => elements.get(id).textContent;
  game.gold = 0;
  refresh(true);
  assert.equal(buttons[0].disabled, true);
  assert.equal(previews[0].hidden, false);
  assert.match(previews[0].innerHTML, /<dt>Skada<\/dt>.*<span>7<\/span>.*<strong>10,2<\/strong>/);
  assert.match(previews[0].innerHTML, /<dt>Pansarbrytning<\/dt>.*<strong>10%<\/strong>/);
  assert.match(previews[0].innerHTML, /aria-hidden="true"> → .*class="td-sr-only"> till /);
  assert.match(panel.innerHTML, /aria-describedby="upgrade-preview-0"/);
  assert.equal(text("upgrade-preview-note"), "Nu → efter köp.");
  const writes = previews[0].writes;
  refresh();
  assert.equal(previews[0].writes, writes, "The HUD should not churn preview DOM at 10 Hz");

  game.gold = 1000;
  const relay = game.place("relay", 4, 6).tower;
  game.select(tower.id);
  refresh();
  assert.match(previews[0].innerHTML, /<span>7,7<\/span>.*<strong>11,2<\/strong>/);
  assert.match(text("upgrade-preview-note"), /Aktuell reläbonus ingår/);
  assert.equal(buttons[0].disabled, false);
  game.sell(relay.id);
  refresh();
  assert.equal(text("upgrade-preview-note"), "Nu → efter köp.");

  game.upgrade(tower.id, 0);
  refresh(true);
  assert.match(previews[0].innerHTML, /<dt>Räckvidd<\/dt>.*<span>125<\/span>.*<strong>145<\/strong>/);
  game.upgrade(tower.id, 0);
  game.upgrade(tower.id, 1);
  refresh(true);
  assert.equal(previews[1].hidden, true, "A locked path must not promise a purchase");
  assert.equal(previews[1].innerHTML, "");
  game.upgrade(tower.id, 0);
  refresh(true);
  assert.equal(previews[0].hidden, true);
  assert.equal(text("upgrade-preview-note"), "");

  game.status = "lost";
  refresh(true);
  assert.ok(buttons.every((button) => button.disabled));
  assert.ok(previews.every((preview) => preview.hidden));
  game.reset();
  refresh(true);
  assert.match(panel.innerHTML, /Ditt nästa drag/);
  assert.doesNotMatch(panel.innerHTML, /data-upgrade-preview/);
});
