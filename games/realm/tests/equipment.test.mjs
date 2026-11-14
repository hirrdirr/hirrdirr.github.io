import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ITEMS, NPCS } from '../js/data.js';
import { createGame, command, stats, addItem, step } from '../js/simulation.js';
import { BAG_SLOTS, MAX_STACK, EQUIPMENT_SLOTS, occupiedSlots, transferEquipment } from '../js/inventory.js';
import { serialize, deserialize, SaveStore, SAVE_KEY, SAVE_VERSION } from '../js/save.js';
import { tradeQuote } from '../js/trading.js';
import { bagButton, compareEquipment, tradePanel } from '../js/ui-panels.js';

// Generated using the actual v0.3.1 modules at 0da30f1, before changing ownership.
const legacy = await readFile(new URL('./fixtures/v0.3.1-equipment.json', import.meta.url), 'utf8');
const data = s => JSON.parse(serialize(s)).data;
const total = p => Object.fromEntries(Object.keys(ITEMS).map(id => [id,
  (p.inventory[id] || 0) + EQUIPMENT_SLOTS.filter(slot => p.equipment[slot] === id).length]));
function fullBag(p, exclude = []) {
  p.inventory = Object.fromEntries(Object.keys(ITEMS).filter(id => !exclude.includes(id)).slice(0, BAG_SLOTS).map(id => [id, 1]));
  assert.equal(occupiedSlots(p), BAG_SLOTS);
}
function storage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return { map, getItem: key => map.get(key), setItem: (key, value) => map.set(key, value) };
}

test('new characters own exactly one starter sword and coat outside the bag', () => {
  const s = createGame(), p = s.player;
  assert.deepEqual(p.inventory, { potion: 3 });
  assert.deepEqual(p.equipment, { weapon: 'trainingSword', armor: 'linenCoat', charm: null });
  assert.equal(occupiedSlots(p), 1); assert.equal(total(p).trainingSword, 1);
  assert.equal(stats(p).attack, 11); assert.equal(stats(p).defense, 1);
  assert.deepEqual(data(deserialize(serialize(s))), data(s));
});

test('all three slots transfer one copy, swap atomically and clean up empty stacks', () => {
  for (const [slot, id] of [['weapon', 'moonBlade'], ['armor', 'marshCoat'], ['charm', 'trailCharm']]) {
    const s = createGame(), p = s.player, previous = p.equipment[slot]; p.inventory[id] = 1;
    const owned = total(p), hp = p.hp;
    assert.equal(command(s, { type: 'equip', id }), true);
    assert.equal(p.inventory[id], undefined); assert.equal(p.equipment[slot], id);
    if (previous) assert.equal(p.inventory[previous], 1);
    assert.deepEqual(total(p), owned); assert.equal(p.hp, hp);
    assert.equal(s.events.at(-1).type, 'equip');
    assert.equal(command(s, { type: 'unequip', slot }), true);
    assert.equal(p.equipment[slot], null); assert.equal(p.inventory[id], 1);
    assert.deepEqual(total(p), owned); assert.equal(s.events.at(-1).type, 'unequip');
  }
});

test('two identical swords retain their quantities through equip, same-item swap and unequip', () => {
  const s = createGame(), p = s.player; p.equipment.weapon = null; p.inventory.moonBlade = 2;
  const owned = total(p);
  assert.equal(command(s, { type: 'equip', id: 'moonBlade' }), true);
  assert.equal(p.inventory.moonBlade, 1); const equippedStats = stats(p);
  assert.equal(command(s, { type: 'equip', id: 'moonBlade' }), true);
  assert.equal(p.inventory.moonBlade, 1); assert.deepEqual(stats(p), equippedStats);
  assert.equal(command(s, { type: 'unequip', slot: 'weapon' }), true);
  assert.equal(p.inventory.moonBlade, 2); assert.deepEqual(total(p), owned);
  assert.equal(command(s, { type: 'unequip', slot: 'weapon' }), false);
});

test('invalid, unowned, consumable, mismatched-slot and dead-player transfers cannot mutate ownership', () => {
  const s = createGame(); s.player.inventory.moonBlade = 1;
  for (const action of [
    { type: 'equip', id: '__proto__' }, { type: 'equip', id: 'constructor' },
    { type: 'equip', id: 'potion' }, { type: 'equip', id: 'trainingSword' },
    { type: 'equip', id: 'missing' }, { type: 'equip', id: ['moonBlade'] }, { type: 'unequip', slot: '__proto__' },
    { type: 'unequip', slot: 'charm' }
  ]) { const before = data(s); assert.equal(command(s, action), false); assert.deepEqual(data(s), before); }
  const before = data(s); assert.equal(transferEquipment(s.player, 'armor', 'moonBlade').ok, false); assert.deepEqual(data(s), before);
  s.player.dead = true; const dead = data(s);
  assert.equal(command(s, { type: 'equip', id: 'moonBlade' }), false);
  assert.equal(command(s, { type: 'unequip', slot: 'weapon' }), false); assert.deepEqual(data(s), dead);
});

test('a full bag rejects unequip without changing gear, health, inventory or stats', () => {
  const s = createGame(), p = s.player; fullBag(p, ['trainingSword']);
  const before = data(s), st = stats(p);
  assert.equal(command(s, { type: 'unequip', slot: 'weapon' }), false);
  assert.deepEqual(data(s), before); assert.deepEqual(stats(p), st);
  assert.match(s.events.at(-1).text, /Cannot return.*bag is full/);
});

test('full-bag swaps use the newly freed slot; keeping the incoming stack requires room', () => {
  const s = createGame(), p = s.player; fullBag(p, ['trainingSword']);
  const owned = total(p);
  assert.equal(command(s, { type: 'equip', id: 'moonBlade' }), true);
  assert.equal(p.inventory.moonBlade, undefined); assert.equal(p.inventory.trainingSword, 1);
  assert.equal(occupiedSlots(p), BAG_SLOTS); assert.deepEqual(total(p), owned);
  command(s, { type: 'equip', id: 'trainingSword' }); p.inventory.moonBlade = 2;
  const before = data(s);
  assert.equal(command(s, { type: 'equip', id: 'moonBlade' }), false); assert.deepEqual(data(s), before);
});

test('returning gear may stack in a full bag but cannot overflow a full stack', () => {
  const s = createGame(), p = s.player; fullBag(p);
  assert.equal(command(s, { type: 'unequip', slot: 'weapon' }), true);
  assert.equal(p.inventory.trainingSword, 2); assert.equal(occupiedSlots(p), BAG_SLOTS);
  command(s, { type: 'equip', id: 'trainingSword' }); p.inventory.trainingSword = MAX_STACK;
  for (const action of [{ type: 'unequip', slot: 'weapon' }, { type: 'equip', id: 'moonBlade' }]) {
    const before = data(s); assert.equal(command(s, action), false); assert.deepEqual(data(s), before);
    assert.match(s.events.at(-1).text, /stack is full/);
  }
  assert.equal(command(s, { type: 'equip', id: 'trainingSword' }), true);
  assert.equal(p.inventory.trainingSword, MAX_STACK);
});

test('gear changes never heal, permanently stack bonuses or disturb talents and cooldowns', () => {
  const s = createGame(), p = s.player; p.level = 7; p.talents = { vigor: 3, guard: 1, steel: 1 };
  p.inventory.forestCoat = 1; p.cooldowns.guard = 8; p.hp = 75;
  const baseline = stats(p), owned = total(p);
  for (let i = 0; i < 10; i++) {
    assert.equal(command(s, { type: 'equip', id: 'forestCoat' }), true);
    assert.equal(stats(p).maxHp, baseline.maxHp + 12); assert.equal(p.hp, 75);
    assert.equal(command(s, { type: 'equip', id: 'linenCoat' }), true);
    assert.deepEqual(stats(p), baseline); assert.equal(p.hp, 75);
  }
  assert.deepEqual(total(p), owned); assert.equal(p.cooldowns.guard, 8);
  command(s, { type: 'equip', id: 'forestCoat' }); p.hp = stats(p).maxHp;
  command(s, { type: 'equip', id: 'linenCoat' }); assert.equal(p.hp, baseline.maxHp);
});

test('real 0.3.1 save migrates exactly one owned copy per slot, preserving all other persisted data', () => {
  const original = JSON.parse(legacy), expected = structuredClone(original.data);
  expected.player.inventory.moonBlade = 2; delete expected.player.inventory.marshCoat; delete expected.player.inventory.trailCharm;
  let s = deserialize(legacy); assert.equal(SAVE_VERSION, 4); assert.deepEqual(data(s), expected);
  for (const id of Object.keys(ITEMS)) assert.equal(total(s.player)[id], original.data.player.inventory[id] || 0, id);
  const beforeStats = stats(s.player);
  for (let i = 0; i < 10; i++) { s = deserialize(serialize(s)); assert.deepEqual(data(s), expected); assert.deepEqual(stats(s.player), beforeStats); }
});

test('all legacy versions migrate once; missing and mismatched references never consume or create items', () => {
  for (const version of [0, 1, 2, 3]) {
    const raw = JSON.parse(legacy); raw.version = version;
    raw.data.player.inventory = { trainingSword: 3, moonBlade: 1, potion: 5 };
    raw.data.player.equipment = { weapon: 'trainingSword', armor: 'moonBlade', charm: 'trailCharm', unknown: 'moonBlade' };
    let s = deserialize(JSON.stringify(raw));
    assert.deepEqual(s.player.inventory, { trainingSword: 2, moonBlade: 1, potion: 5 });
    assert.deepEqual(s.player.equipment, { weapon: 'trainingSword', armor: null, charm: null });
    const before = data(s); s = deserialize(serialize(s)); assert.deepEqual(data(s), before);
    raw.data.player.equipment = { weapon: ['moonBlade'], armor: { id: 'marshCoat' }, charm: 12 };
    s = deserialize(JSON.stringify(raw)); assert.deepEqual(s.player.inventory, raw.data.player.inventory);
    assert.deepEqual(s.player.equipment, { weapon: null, armor: null, charm: null });
    raw.data.player.equipment = { weapon: '__proto__', armor: 'constructor', charm: 'potion' };
    s = deserialize(JSON.stringify(raw)); assert.deepEqual(s.player.inventory, raw.data.player.inventory);
    assert.deepEqual(s.player.equipment, { weapon: null, armor: null, charm: null });
  }
});

test('v4 slots preserve independently owned gear and do not subtract bag duplicates or resurrect sold starters', () => {
  const raw = JSON.parse(legacy); raw.version = 4;
  raw.data.player.inventory = { moonBlade: 2, potion: 5 };
  const s = deserialize(JSON.stringify(raw));
  assert.deepEqual(s.player.inventory, raw.data.player.inventory);
  assert.deepEqual(s.player.equipment, raw.data.player.equipment);
  assert.equal(total(s.player).moonBlade, 3); assert.equal(s.player.inventory.trainingSword, undefined);
});

test('old overflow inventories retain every owned copy while equipment can free bag slots', () => {
  const raw = JSON.parse(legacy); raw.data.player.inventory = Object.fromEntries(Object.keys(ITEMS).map(id => [id, 2]));
  const s = deserialize(JSON.stringify(raw)); assert.ok(occupiedSlots(s.player) > BAG_SLOTS);
  for (const id of Object.keys(ITEMS)) assert.equal(total(s.player)[id], 2);
});

test('migration keeps the untouched version backup through repeated loads and refuses autosave if backup fails', () => {
  const mem = storage({ [SAVE_KEY]: legacy }), store = new SaveStore(mem);
  let s = store.load(); assert.equal(mem.getItem(SAVE_KEY + '.v3'), legacy); assert.match(store.notice, /equipped items/);
  for (let i = 0; i < 4; i++) { assert.equal(store.save(s), true); s = new SaveStore(mem).load(); }
  assert.equal(mem.getItem(SAVE_KEY + '.v3'), legacy); assert.equal(s.player.inventory.moonBlade, 2);
  const blocked = new SaveStore({ getItem: key => key === SAVE_KEY ? legacy : null, setItem() { throw Error('quota'); } });
  const temporary = blocked.load(); assert.ok(temporary); assert.equal(blocked.blocked, true); assert.equal(blocked.save(temporary), false);
});

test('corruption recovery also backs up the old schema before subsequent autosaves', () => {
  const mem = storage({ [SAVE_KEY]: 'broken', [SAVE_KEY + '.backup']: legacy }), store = new SaveStore(mem);
  const s = store.load(); assert.equal(mem.getItem(SAVE_KEY + '.recovery'), 'broken'); assert.equal(mem.getItem(SAVE_KEY + '.v3'), legacy);
  assert.equal(store.save(s), true); assert.equal(store.save(s), true); assert.equal(mem.getItem(SAVE_KEY + '.v3'), legacy);
});

test('legacy import preserves the imported original and current save, and storage failure leaves current journey intact', () => {
  const current = serialize(createGame('Current')), mem = storage({ [SAVE_KEY]: current }), store = new SaveStore(mem);
  assert.equal(store.replace(deserialize(legacy), legacy), true);
  assert.equal(mem.getItem(SAVE_KEY + '.import.v3'), legacy); assert.equal(mem.getItem(SAVE_KEY + '.recovery'), current);
  assert.equal(JSON.parse(mem.getItem(SAVE_KEY)).version, 4); assert.equal(store.load().player.inventory.moonBlade, 2);
  const failing = storage({ [SAVE_KEY]: current });
  failing.setItem = () => { throw Error('quota'); };
  assert.equal(new SaveStore(failing).replace(deserialize(legacy), legacy), false);
  assert.equal(failing.getItem(SAVE_KEY), current);
});

test('merchant sells bag duplicates while keeping worn copies protected, including rare confirmation and buyback', () => {
  const s = deserialize(legacy), p = s.player, owned = total(p), money = p.gold;
  assert.equal(tradeQuote(s, { type: 'sell', id: 'marshCoat', confirm: true }).ok, false);
  assert.equal(command(s, { type: 'sell', id: 'moonBlade' }), false);
  assert.equal(command(s, { type: 'sell', id: 'moonBlade', confirm: true }), true);
  assert.equal(p.inventory.moonBlade, 1); assert.equal(p.equipment.weapon, 'moonBlade'); assert.equal(p.gold, money + ITEMS.moonBlade.value);
  const sale = s.buyback[0].id; assert.equal(command(s, { type: 'buyback', id: sale }), true);
  assert.equal(command(s, { type: 'buyback', id: sale }), false); assert.equal(p.gold, money); assert.deepEqual(total(p), owned);
  assert.equal(command(s, { type: 'buy', id: 'keeperBlade' }), true);
  assert.equal(command(s, { type: 'equip', id: 'keeperBlade' }), true);
  assert.equal(p.inventory.keeperBlade, undefined); assert.equal(p.inventory.moonBlade, 3);
  assert.equal(command(s, { type: 'sell', id: 'keeperBlade', confirm: true }), false);
  command(s, { type: 'unequip', slot: 'weapon' }); assert.equal(command(s, { type: 'sell', id: 'keeperBlade' }), true);
});

test('repeated buy/equip/unequip/sell/buyback cycles conserve copies without generating currency', () => {
  let s = createGame(); Object.assign(s.player, NPCS.find(n => n.id === 'ivo'), { gold: 500 });
  assert.equal(command(s, { type: 'buy', id: 'keeperBlade' }), true);
  const owned = total(s.player), gold = s.player.gold;
  for (let i = 0; i < 20; i++) {
    for (const id of ['keeperBlade', 'trainingSword']) assert.equal(command(s, { type: 'equip', id }), true);
    assert.equal(command(s, { type: 'sell', id: 'keeperBlade' }), true);
    assert.equal(command(s, { type: 'buyback', id: s.buyback[0].id }), true);
    s = deserialize(serialize(s)); assert.deepEqual(total(s.player), owned); assert.equal(s.player.gold, gold);
  }
});

test('bag capacity and drops count only bag stacks; UI treats a duplicate as an unequipped copy', () => {
  const s = createGame(), p = s.player;
  assert.equal(addItem(s, 'trainingSword'), true); assert.equal(occupiedSlots(p), 2);
  s.drops = [{ id: 1, x: p.x, y: p.y, item: 'trainingSword', life: 90 }]; step(s);
  assert.equal(p.inventory.trainingSword, 2); assert.equal(total(p).trainingSword, 3);
  assert.doesNotMatch(bagButton(p, 'trainingSword', true), /Equipped|<em>/);
  assert.match(compareEquipment(p, 'trainingSword'), /same combat stats/);
  Object.assign(p, { x: 640, y: 784 });
  const html = tradePanel(s, { side: 'bag', id: 'trainingSword' });
  assert.match(html, /data-action="sell"[^>]*>Sell/); assert.doesNotMatch(html, /data-action="unequip"/);
});
