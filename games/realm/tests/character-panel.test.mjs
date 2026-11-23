import { bagIds, bagId, bagCount, put, setBag, equipTemplate } from './item-helpers.mjs';

import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, command, stats } from '../js/simulation.js';

import { serialize, deserialize, SAVE_VERSION } from '../js/save.js';
import { characterPanel, characterItemDetail, characterStatGroups } from '../js/character-panel.js';
import { CharacterPreview, drawCharacterPreview } from '../js/character-preview.js';
import { UI } from '../js/ui.js';

test('character presentation reads the state without changing ownership, progress or save schema', () => {
  const s = createGame('<Wanderer>'); put(s.player,'moonBlade',2);
  const before = JSON.parse(serialize(s));
  const html = characterPanel(s);
  assert.match(html, /&lt;Wanderer&gt;/); assert.doesNotMatch(html, /<Wanderer>/);
  assert.equal((html.match(/data-equipment=/g) || []).length, 10);
  for (const slot of ['weapon', 'armor', 'charm']) assert.match(html, new RegExp(`data-equipment="${slot}"`));
  assert.doesNotMatch(html, /data-item="trainingSword"|data-item="linenCoat"/);
  for(const id of bagIds(s.player,'moonBlade'))assert.ok(html.includes(`data-item="${id}"`)); assert.match(html, /Empty Charm slot/);
  assert.match(html, /canvas id="character-preview"/); assert.match(html, /gear visuals do not change yet/);
  assert.deepEqual(JSON.parse(serialize(s)).data, before.data); assert.equal(SAVE_VERSION, 5);
  assert.deepEqual(JSON.parse(serialize(deserialize(serialize(s)))).data, before.data);
});

test('equipment inspection exposes rarity, properties, unequip and accurate bag comparisons', () => {
  const s = createGame(), p = s.player; put(p,'moonBlade',2);
  const bag = characterItemDetail(p, { side: 'bag', id: bagId(p, 'moonBlade') });
  assert.match(bag, /In your bag · 1/); assert.match(bag, /Character stats before/);
  assert.match(bag, /Equip Moonshard/); assert.doesNotMatch(bag, /data-action="unequip"/);
  equipTemplate(s,'moonBlade');
  const worn = characterItemDetail(p, { side: 'equipment', id: 'weapon' });
  assert.match(worn, /item-rarity rare/); assert.match(worn, /\+10 attack/);
  assert.match(worn, /data-action="unequip" data-slot="weapon" data-id="gear-\d+"/);
  assert.doesNotMatch(worn, /data-action="equip"/);
  assert.match(characterItemDetail(p, { side: 'bag', id: bagId(p, 'moonBlade') }), /same combat stats/);
  assert.match(characterItemDetail(p, { side: 'equipment', id: 'charm' }), /Select a matching item/);
});

test('attribute groups match actual computed values and explain existing mechanics', () => {
  const s = createGame(), p = s.player; p.level = 7; p.xp = 40; p.gold = 70;
  p.talents = { vigor: 3, steel: 1, guard: 1 }; put(p,'runnerWrap',1); put(p,'runeFocus',1);
  equipTemplate(s,'runnerWrap'); equipTemplate(s,'runeFocus');
  const st = stats(p), rows = characterStatGroups(p).flatMap(group => group.rows);
  const value = label => rows.find(row => row[0] === label)[1];
  assert.equal(value('Health'), `${Math.ceil(p.hp)} / ${st.maxHp}`);
  assert.equal(value('Strike damage'), Math.round(st.attack * st.meleeMultiplier));
  assert.equal(value('Strikes / second'), (1 / st.attackCooldown).toFixed(2));
  assert.equal(value('Defense'), st.defense); assert.equal(value('Lantern Burst'), Math.round(st.attack * st.burstMultiplier));
  assert.match(rows.find(row => row[0] === 'Defense')[2], /before Lantern Ward/);
  assert.match(rows.find(row => row[0] === 'Critical chance')[2], /Lantern Burst does not/);
  p.level = 20; assert.equal(characterStatGroups(p)[0].rows[1][1], 'Max level');
});

// Event/element doubles test the real UI controller without claiming browser QA.
function uiHarness(s) {
  const elements = new Map(); let focused = null;
  const element = id => {
    if (!elements.has(id)) elements.set(id, {
      id, open: false, hidden: false, dataset: {}, scrollTop: 0, handlers: {}, buttons: [],
      classList: { toggle() {}, add() {} }, textContent: '',
      addEventListener(type, fn) { this.handlers[type] = fn; },
      showModal() { this.open = true; }, close() { this.open = false; this.handlers.close?.(); },
      focus() { focused = this; }, querySelector() { return null; }, querySelectorAll() { return this.buttons; },
      set innerHTML(html) {
        this.html = html;
        this.buttons = [...html.matchAll(/<button\b([^>]*)>/g)].map(([, attrs]) => ({
          disabled: /\bdisabled\b/.test(attrs),
          dataset: Object.fromEntries([...attrs.matchAll(/data-([\w-]+)="([^"]*)"/g)].map(([, k, v]) => [k.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v])),
          focus() { focused = this; }
        }));
      }, get innerHTML() { return this.html || ''; }
    });
    return elements.get(id);
  };
  const previous = globalThis.document;
  globalThis.document = { getElementById: element, querySelectorAll: () => [], activeElement: null };
  const lifecycle = [];
  const ui = new UI(() => s, { started: () => true, command: a => command(s, a), pause() {}, resume() {}, preview: {
    mount() { lifecycle.push('mount'); }, unmount() { lifecycle.push('unmount'); }, sync() { lifecycle.push('sync'); }
  } });
  return { ui, element, lifecycle, get focused() { return focused; },
    click(key, value) {
      const b = element('panel-content').buttons.find(b => b.dataset[key] === value);
      assert.ok(b, `Missing ${key}=${value}`);
      element('panel-content').handlers.click({ target: { closest: () => b } });
    },
    restore() { if (previous === undefined) delete globalThis.document; else globalThis.document = previous; }
  };
}

test('actual panel handlers preserve focus/scroll and follow a copy between bag and slot', () => {
  const s = createGame(); const [ref]=put(s.player,'moonBlade',1);
  const h = uiHarness(s);
  try {
    h.ui.open('inventory'); h.ui.panel.scrollTop = 180;
    h.click('item', ref); assert.deepEqual(h.ui.characterSelection, { side: 'bag', id: ref });
    assert.equal(h.focused.dataset.item, ref); assert.equal(h.ui.panel.scrollTop, 180);
    h.click('action', 'equip'); assert.equal((bagCount(s.player,'moonBlade') || undefined), undefined);
    assert.deepEqual(h.ui.characterSelection, { side: 'equipment', id: 'weapon' });
    assert.equal(h.focused.dataset.equipment, 'weapon'); assert.equal(h.ui.panel.scrollTop, 180);
    h.click('action', 'unequip'); assert.equal((bagCount(s.player,'moonBlade') || undefined), 1);
    assert.deepEqual(h.ui.characterSelection, { side: 'bag', id: ref }); assert.equal(h.focused.dataset.item, ref);
    h.click('equipment', 'charm'); assert.match(h.element('panel-content').innerHTML, /Empty Charm slot/);
    h.ui.open('talents'); assert.equal(h.lifecycle.at(-1), 'unmount');
    h.ui.close(); assert.equal(h.lifecycle.at(-1), 'unmount');
  } finally { h.restore(); }
});

test('full-bag unequip rejection retains the selected worn item, action focus and all possessions', () => {
  const s = createGame(); setBag(s.player,{copperBand:15,potion:3});
  const h = uiHarness(s), before = JSON.parse(serialize(s)).data;
  try {
    h.ui.open('inventory'); h.click('action', 'unequip');
    assert.deepEqual(JSON.parse(serialize(s)).data, before);
    assert.deepEqual(h.ui.characterSelection, { side: 'equipment', id: 'weapon' });
    assert.equal(h.focused.dataset.action, 'unequip'); assert.equal(h.focused.dataset.slot, 'weapon');
    assert.match(s.events.at(-1).text, /bag is full/);
  } finally { h.restore(); }
});

function previewHarness() {
  const frames = new Map(), listeners = { window: new Map(), document: new Map(), motion: new Map() }; let sequence = 0, observer;
  const events = map => ({ addEventListener: (type, fn) => map.set(type, fn), removeEventListener: type => map.delete(type) });
  const calls = [], context = { clearRect() {}, beginPath() {}, ellipse() {}, fill() {}, drawImage(...args) { calls.push(args); } };
  const motion = { matches: false, ...events(listeners.motion) };
  const document = { hidden: false, focused: true, hasFocus() { return this.focused; }, ...events(listeners.document) };
  const window = { ...events(listeners.window), matchMedia: () => motion,
    requestAnimationFrame(fn) { frames.set(++sequence, fn); return sequence; }, cancelAnimationFrame: id => frames.delete(id),
    IntersectionObserver: class { constructor(fn) { this.fn = fn; observer = this; } observe() {} disconnect() { this.disconnected = true; } }
  };
  const canvas = { isConnected: true, visible: true, checkVisibility() { return this.visible; }, getContext: () => context };
  const sprite = {}, player = { name: 'Preview' }, preview = new CharacterPreview(p => { assert.equal(p, player); return sprite; }, { window, document });
  return { preview, canvas, calls, context, frames, listeners, motion, document, player, sprite,
    frame(time) { const pending = [...frames]; frames.clear(); for (const [, fn] of pending) fn(time); },
    intersect(value) { observer.fn([{ isIntersecting: value }]); }, get observer() { return observer; }
  };
}

test('preview uses the cached player sprite, integer pixel scale and a subtle time-based idle', () => {
  const h = previewHarness(); h.preview.mount(h.canvas, h.player);
  assert.equal(h.calls.length, 1); assert.equal(h.context.imageSmoothingEnabled, false);
  h.frame(0); h.frame(16); h.frame(34); assert.equal(h.calls.length, 3);
  assert.equal(h.calls[0][0], h.sprite); assert.deepEqual(h.calls[0].slice(3), [160, 192]);
  const y = h.calls.at(-1)[2]; h.frame(934); assert.notEqual(h.calls.at(-1)[2], y);
  assert.ok(Math.abs(h.calls.at(-1)[2] - 55) <= 1.5);
  assert.equal(h.frames.size, 1); h.preview.unmount(); assert.equal(h.frames.size, 0);
});

test('preview suspends outside the visible viewport, on tab hiding, blur and panel removal', () => {
  const h = previewHarness(); h.preview.mount(h.canvas, h.player);
  h.intersect(false); assert.equal(h.frames.size, 0);
  h.intersect(true); assert.equal(h.frames.size, 1);
  h.document.hidden = true; h.listeners.document.get('visibilitychange')(); assert.equal(h.frames.size, 0);
  h.document.hidden = false; h.listeners.document.get('visibilitychange')(); assert.equal(h.frames.size, 1);
  h.document.focused = false; h.listeners.window.get('blur')(); assert.equal(h.frames.size, 0);
  h.document.focused = true; h.listeners.window.get('focus')(); assert.equal(h.frames.size, 1);
  const before = h.calls.length; h.canvas.visible = false; h.frame(100); assert.equal(h.frames.size, 0); assert.equal(h.calls.length, before);
  h.preview.unmount(); assert.equal(h.observer.disconnected, true);
  for (const map of Object.values(h.listeners)) assert.equal(map.size, 0);
});

test('reduced motion renders a still portrait and repeated mounts never leak animation loops or listeners', () => {
  const h = previewHarness(); h.motion.matches = true; h.preview.mount(h.canvas, h.player);
  assert.equal(h.frames.size, 0); assert.ok(h.calls.every(args => args[2] === 55));
  h.motion.matches = false; h.listeners.motion.get('change')(); assert.equal(h.frames.size, 1);
  for (let i = 0; i < 10; i++) { h.preview.mount(h.canvas, h.player); assert.equal(h.frames.size, 1); }
  assert.equal(h.listeners.document.size, 1); assert.equal(h.listeners.window.size, 2); assert.equal(h.listeners.motion.size, 1);
  h.motion.matches = true; h.listeners.motion.get('change')(); assert.equal(h.frames.size, 0); assert.equal(h.calls.at(-1)[2], 55);
  h.preview.unmount(); assert.equal(h.frames.size, 0);
});

test('a missing canvas context or unavailable sprite leaves a safe static fallback', () => {
  const h = previewHarness(); h.canvas.getContext = () => null; h.preview.mount(h.canvas, h.player);
  assert.equal(h.frames.size, 0); h.preview.unmount();
  drawCharacterPreview(h.context, null); assert.equal(h.calls.length, 0);
});


test('ring controls target the selected slot and restore focus to that exact ring', () => {
  const s = createGame(); const [first,second]=put(s.player,'copperBand',2);
  const h = uiHarness(s);
  try {
    h.ui.open('inventory'); h.click('item', first);
    assert.match(h.element('panel-content').innerHTML, /Equip in Ring 1/);
    assert.match(h.element('panel-content').innerHTML, /Equip in Ring 2/);
    h.click('slot', 'ring2');
    assert.equal(s.player.equipment.ring2, first); assert.equal(s.player.equipment.ring1, null);
    assert.equal(h.focused.dataset.equipment, 'ring2');
    h.click('item', second); h.click('slot', 'ring1');
    assert.equal(s.player.equipment.ring1, second); assert.equal(h.focused.dataset.equipment, 'ring1');
    h.click('equipment', 'ring2'); h.click('action', 'unequip');
    assert.equal(s.player.equipment.ring1, second); assert.equal(s.player.equipment.ring2, null);
    assert.equal((bagCount(s.player,'copperBand') || undefined), 1); assert.equal(h.focused.dataset.item, first);
  } finally { h.restore(); }
});


test('a queued close event cannot clear a newly reopened panel or stop its preview', () => {
  const h=uiHarness(createGame());
  try {
    h.ui.open('inventory'); const before=h.lifecycle.length;
    // Native dialog close events may arrive after another view has reopened it.
    h.ui.panel.handlers.close();
    assert.equal(h.ui.view,'inventory'); assert.equal(h.lifecycle.length,before);
    h.ui.close(); assert.equal(h.ui.view,null); assert.equal(h.lifecycle.at(-1),'unmount');
  } finally { h.restore(); }
});
