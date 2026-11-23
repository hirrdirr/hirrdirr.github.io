import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ITEMS, NPCS } from '../js/data.js';
import { canRollGear, gearProfile, rollModifiers } from '../js/gear-rolls.js';
import { resolveItem } from '../js/item-instances.js';
import { addItem, createGame, command, step, stats } from '../js/simulation.js';
import { serialize, deserialize, SaveStore, SAVE_KEY } from '../js/save.js';
import { characterItemDetail } from '../js/character-panel.js';
import { tradePanel } from '../js/ui-panels.js';
import { bagIds, setBag } from './item-helpers.mjs';

const previous = await readFile(new URL('./fixtures/v0.4.3-gear.json', import.meta.url), 'utf8');
const data = state => JSON.parse(serialize(state)).data;
const fixedRandom = value => () => value;
function merchant() {
  const s = createGame(), ivo = NPCS.find(npc => npc.id === 'ivo');
  Object.assign(s.player, { x: ivo.x, y: ivo.y, gold: 300 });
  return s;
}

test('every eligible template has exactly three deterministic bounded outcomes, with rarity-specific vitality', () => {
  const bounds = { attack: 1, defense: 1, speed: 2, haste: .01, spellPower: .01, hp: 6 };
  for (const [id, base] of Object.entries(ITEMS)) {
    if (!canRollGear(id)) {
      assert.deepEqual(rollModifiers(id, () => assert.fail('fixed item consumed RNG')), {});
      continue;
    }
    const original = structuredClone(base);
    const rolls = [0, .5, .999999].map(x => rollModifiers(id, fixedRandom(x)));
    assert.deepEqual(rolls[0], {});
    assert.equal(new Set(rolls.map(r => JSON.stringify(r))).size, 3, id);
    assert.equal(rolls[2].hp, { common: 2, uncommon: 4, rare: 6 }[base.rarity]);
    for (const delta of rolls) {
      const actual = gearProfile(id, structuredClone(delta)).effective;
      assert.equal(actual.rarity, base.rarity);
      assert.equal(actual.value, base.value);
      for (const [key, amount] of Object.entries(delta)) {
        assert.ok(Math.abs(amount) <= bounds[key]);
        assert.ok(Number.isFinite(actual[key]) && actual[key] >= 0);
        assert.ok(Math.abs(actual[key] - (base[key] || 0) - amount) < 1e-9);
      }
    }
    assert.deepEqual(base, original);
  }
  for (const id of ['trainingSword', 'linenCoat', 'beaconCharm', 'marshCoat', 'emberBlade', 'potion']) {
    assert.equal(canRollGear(id), false);
  }
});

test('two rolls of one sword retain their tradeoff through repeated swaps with talents', () => {
  const s = createGame(), p = s.player;
  p.level = 5; p.talents = { vigor: 2, steel: 1 };
  command(s, { type: 'unequip', slot: 'weapon' });
  const base = stats(p), hp = p.hp;
  addItem(s, 'moonBlade', 1, fixedRandom(.5));
  addItem(s, 'moonBlade', 1, fixedRandom(.9));
  const [damage, hardy] = bagIds(p, 'moonBlade');
  assert.notEqual(damage, hardy);
  for (let i = 0; i < 5; i++) {
    assert.ok(command(s, { type: 'equip', id: damage }));
    assert.equal(stats(p).attack, base.attack + 11);
    assert.equal(stats(p).maxHp, base.maxHp);
    const detail = characterItemDetail(p, { side: 'bag', id: hardy });
    assert.match(detail, /Currently equipped: Moonshard \(\+11 attack\)/i);
    assert.match(detail, /\+9 attack · \+6 max health/i);
    assert.ok(command(s, { type: 'equip', id: hardy }));
    assert.equal(stats(p).attack, base.attack + 9);
    assert.equal(stats(p).maxHp, base.maxHp + 6);
    assert.ok(command(s, { type: 'unequip', slot: 'weapon' }));
    assert.deepEqual(stats(p), base); assert.equal(p.hp, hp);
  }
});

test('merchant previews, sales, buyback and repeated loads preserve both distinct ring rolls', () => {
  let s = merchant(); s.seed = 734;
  const before = data(s);
  assert.match(tradePanel(s, { side: 'stock', id: 'copperBand' }), /Base stats shown/);
  assert.deepEqual(data(s), before);
  for (let i = 0; i < 2; i++) assert.ok(command(s, { type: 'buy', id: 'copperBand' }));
  const [quick, hardy] = bagIds(s.player, 'copperBand');
  assert.deepEqual(s.player.itemInstances[quick].modifiers, { hp: -1, speed: 2 });
  assert.deepEqual(s.player.itemInstances[hardy].modifiers, { hp: 2 });
  const gold = s.player.gold, seed = s.seed;
  assert.ok(command(s, { type: 'sell', id: hardy }));
  assert.equal(s.player.inventory[quick], 1);
  assert.equal(s.player.gold, gold + ITEMS.copperBand.value);
  const sale = s.buyback[0].id;
  for (let i = 0; i < 10; i++) s = deserialize(serialize(s));
  assert.equal(s.buyback[0].item, hardy);
  assert.match(tradePanel(s, { side: 'buyback', id: sale }), /\+6 max health/i);
  assert.ok(command(s, { type: 'buyback', id: sale }));
  assert.equal(s.player.gold, gold);
  for (const [slot, id] of [['ring1', quick], ['ring2', hardy]]) assert.ok(command(s, { type: 'equip', slot, id }));
  const st = stats(s.player);
  assert.equal(st.maxHp, 109); assert.equal(st.speed, 160);
  s.player.hp = st.maxHp;
  for (let i = 0; i < 10; i++) {
    s = deserialize(serialize(s)); assert.deepEqual(stats(s.player), st);
    assert.equal(s.player.equipment.ring1, quick); assert.equal(s.player.equipment.ring2, hardy);
  }
  command(s, { type: 'unequip', slot: 'ring2' });
  assert.equal(s.player.hp, 103); assert.equal(s.seed, seed);
});

test('a rolled enemy drop survives blocked pickup, save/load and collection unchanged', () => {
  let s = createGame(); const e = s.enemies.find(enemy => enemy.type === 'warden');
  s.enemies = [e]; s.seed = 734;
  Object.assign(e, { hp: 1, mode: 'idle', x: 1504, y: 648 });
  Object.assign(s.player, { level: 20, x: 1464, y: 648 });
  setBag(s.player, { copperBand: 16 });
  assert.ok(command(s, { type: 'attack' }));
  const ref = s.drops[0].item, original = structuredClone(s.player.itemInstances[ref]);
  assert.equal(original.templateId, 'moonBlade'); assert.deepEqual(original.modifiers, { hp: 6, attack: -1 });
  Object.assign(s.player, { x: e.x, y: e.y }); step(s);
  assert.equal(s.drops.length, 1);
  s = deserialize(serialize(s)); assert.deepEqual(s.player.itemInstances[ref], original);
  command(s, { type: 'equip', id: bagIds(s.player, 'copperBand')[0], slot: 'ring1' });
  step(s); assert.equal(s.drops.length, 0); assert.equal(s.player.inventory[ref], 1);
  assert.deepEqual(s.player.itemInstances[ref], original);
});

test('authored quest rewards stay fixed even when the same template can roll in the shop', () => {
  const s = createGame(), elin = NPCS.find(n => n.id === 'elin');
  Object.assign(s.player, { x: elin.x, y: elin.y });
  s.quests.roots = { status: 'active', progress: [5] };
  const seed = s.seed;
  assert.ok(command(s, { type: 'complete', id: 'roots' }));
  const [ref] = bagIds(s.player, 'keeperBlade');
  assert.deepEqual(s.player.itemInstances[ref].modifiers, {});
  assert.equal(resolveItem(s.player, ref), ITEMS.keeperBlade);
  assert.equal(s.seed, seed);
});

test('actual 0.4.3 save keeps every record, owner, stat and progression field and gets an exact backup', () => {
  const old = JSON.parse(previous), memory = new Map([[SAVE_KEY, previous]]);
  const store = new SaveStore({ getItem: key => memory.get(key), setItem: (key, value) => memory.set(key, value) });
  const s = store.load();
  assert.equal(old.version, 5);
  assert.deepEqual(data(s), old.data);
  for (const record of Object.values(s.player.itemInstances)) {
    assert.deepEqual(record.modifiers, {}); assert.deepEqual(resolveItem(s.player, record.id), ITEMS[record.templateId]);
  }
  assert.equal(memory.get(SAVE_KEY + '.v5'), previous);
  assert.ok(store.save(s)); assert.equal(JSON.parse(memory.get(SAVE_KEY)).version, 6);
  assert.deepEqual(data(store.load()), old.data);
  assert.ok(store.replace(deserialize(previous), previous)); assert.equal(memory.get(SAVE_KEY + '.import.v5'), previous);
  addItem(s, 'copperBand', 1, fixedRandom(.9));
  const exported = serialize(s);
  assert.ok(store.replace(deserialize(exported), exported)); assert.deepEqual(data(store.load()), data(s));
});

test('save validation rejects mixed, out-of-tier, nonnumeric and nonfinite modifiers and protects recovery', () => {
  const s = createGame(); addItem(s, 'copperBand', 1, fixedRandom(.9));
  const [ref] = bagIds(s.player, 'copperBand'), backup = serialize(s);
  function invalid(modifiers, version = 6, target = ref) {
    const raw = JSON.parse(backup); raw.version = version;
    raw.data.player.itemInstances[target].modifiers = modifiers;
    return JSON.stringify(raw);
  }
  for (const bad of [{ hp: 6 }, { hp: 2, speed: 2 }, { hp: '2' }, { hp: null }, { hp: -20 }, { haste: .01 }, [], null, JSON.parse('{"__proto__":1}')]) {
    assert.throws(() => deserialize(invalid(bad)), /identities/);
  }
  assert.throws(() => deserialize(invalid({ hp: 2 }).replace('"hp":2}', '"hp":1e999}')), /identities/);
  assert.throws(() => deserialize(invalid({ hp: 2 }, 5)), /identities/);
  assert.throws(() => deserialize(invalid({ attack: 1 }, 6, s.player.equipment.weapon)), /identities/);
  const corrupt = invalid({ hp: 200 }), memory = new Map([[SAVE_KEY, corrupt], [SAVE_KEY + '.backup', backup]]);
  const store = new SaveStore({ getItem: k => memory.get(k), setItem: (k,v) => memory.set(k,v) });
  assert.deepEqual(data(store.load()), data(s)); assert.equal(memory.get(SAVE_KEY + '.recovery'), corrupt);
});

test('fixed legacy gear remains neutral in every supported pre-identity format', () => {
  for (let version = 0; version <= 4; version++) {
    const inventory = { moonBlade: version < 4 ? 3 : 2, potion: 4 };
    const player = { name: 'Legacy', level: 2, xp: 5, gold: 45, hp: 80, inventory, equipment: { weapon: 'moonBlade' } };
    const s = deserialize(JSON.stringify({ version, data: { player } }));
    assert.equal(bagIds(s.player, 'moonBlade').length, 2);
    const all = Object.values(s.player.itemInstances);
    assert.equal(all.length, 3);
    for (const record of all) {
      assert.deepEqual(record.modifiers, {}); assert.equal(resolveItem(s.player, record.id).attack, 10);
    }
    assert.deepEqual([s.player.level, s.player.xp, s.player.gold, s.player.hp], [2, 5, 45, 80]);
    assert.deepEqual(data(deserialize(serialize(s))), data(s));
  }
});

test('rare sale confirmation and full-bag buyback failures preserve the exact rolled copy and gold', () => {
  const s = merchant();
  addItem(s, 'moonBlade', 1, fixedRandom(.9));
  const [id] = bagIds(s.player, 'moonBlade'), original = data(s);
  assert.equal(command(s, { type: 'sell', id }), false); assert.deepEqual(data(s), original);
  assert.ok(command(s, { type: 'sell', id, confirm: true }));
  setBag(s.player, { copperBand: 16 });
  const sold = data(s), sale = s.buyback[0].id;
  assert.equal(command(s, { type: 'buyback', id: sale }), false); assert.deepEqual(data(s), sold);
  assert.ok(command(s, { type: 'equip', id: bagIds(s.player, 'copperBand')[0] }));
  assert.ok(command(s, { type: 'buyback', id: sale }));
  assert.equal(s.player.gold, original.player.gold); assert.equal(s.player.inventory[id], 1);
  assert.deepEqual(s.player.itemInstances[id], original.player.itemInstances[id]);
});
