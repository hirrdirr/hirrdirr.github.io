import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ENEMIES, LOOT_TABLES, NPCS, QUESTS } from '../js/data.js';
import { respawnSeconds } from '../js/enemy-life.js';
import { templateId } from '../js/item-instances.js';
import { deserialize, serialize } from '../js/save.js';
import { command, createGame, enemyKillXP, questReady, stats, step, TICK } from '../js/simulation.js';
import { blocked, LANDMARKS, sluiceOpen, zoneAt } from '../js/world.js';
import { bagCount, bagIds, setGear } from './item-helpers.mjs';

const oldSave = readFileSync(new URL('./fixtures/v0.5.1-sluice.json', import.meta.url), 'utf8');
const load = () => deserialize(oldSave);
const reload = s => deserialize(serialize(s));
const ada = NPCS.find(n => n.id === 'ada');

function visit(s, { x, y }) {
  Object.assign(s.player, { x, y });
}

function walk(s, seconds, input = {}) {
  for (let i = 0; i < Math.ceil(seconds / TICK); i++) step(s, input);
}

function inspect(s, id) {
  visit(s, LANDMARKS.find(l => l.id === id));
  assert.ok(command(s, { type: 'interact' }));
}

function turnIn(s, id) {
  visit(s, ada);
  const gold = s.player.gold;
  assert.ok(command(s, { type: 'complete', id }));
  assert.equal(s.player.gold, gold + QUESTS[id].rewards.gold);
  const awarded = JSON.parse(serialize(s)).data;
  assert.equal(command(s, { type: 'complete', id }), false);
  assert.deepEqual(JSON.parse(serialize(s)).data, awarded);
}

// Exercise normal kill, loot, XP and quest dispatch for a finishing blow.
function finish(s, type) {
  const e = s.enemies.find(e => e.type === type && e.hp > 0);
  const level = s.player.level;
  visit(s, { x: e.x - 35, y: e.y });
  command(s, { type: 'target', id: e.id });
  e.hp = 1;
  s.player.cooldowns.attack = 0;
  command(s, { type: 'attack' });
  assert.equal(e.mode, 'dead');
  assert.equal(e.respawn, respawnSeconds(type));
  const kill = s.events.findLast(event => event.type === 'kill');
  assert.equal(kill.typeId, type);
  assert.equal(kill.xp, enemyKillXP(ENEMIES[type].xp, ENEMIES[type].level, level));
  assert.ok(LOOT_TABLES[type].some(([item]) => item === templateId(s.player, s.drops.at(-1).item)));
  return e;
}

test('0.5.1 save retains position, rolls, ownership, buyback, pending loot and timers', () => {
  const s = load();
  assert.deepEqual(JSON.parse(serialize(s)).data, JSON.parse(oldSave).data);
  assert.ok(sluiceOpen(s));
  for (const type of ['skitter', 'sentry', 'striker']) {
    for (const e of s.enemies.filter(e => e.type === type)) {
      assert.equal(zoneAt(e.x, e.y).id, 'reach');
      assert.equal(blocked(e.x, e.y, ENEMIES[type].radius), false);
    }
  }
  // The old world allowed a player or dropped item to touch its exact east edge.
  assert.equal(blocked(1877, 630, 11, false), false);
  assert.equal(blocked(1886, 630, 2), false);
});

test('only a restored and reported seal opens the spillway in both directions', () => {
  for (const [seal, reported] of [[false, false], [true, false], [false, true]]) {
    const s = createGame();
    s.flags.sealRestored = seal;
    if (reported) s.quests.heart = { status: 'done', progress: [1, 1] };
    visit(s, { x: 1868, y: 1224 });
    walk(s, .1, { x: 1 });
    command(s, { type: 'dodge' });
    walk(s, 2, { x: 1 });
    assert.ok(s.player.x <= 1877);
    assert.equal(s.discovered.includes('reach'), false);
    s.player.x = 2010;
    assert.ok(reload(s).player.x < 1888);
  }
  const s = load();
  walk(s, 1.6, { x: 1 });
  assert.equal(zoneAt(s.player.x, s.player.y).id, 'reach');
  assert.ok(reload(s).discovered.includes('reach'));
  walk(s, 1.6, { x: -1 });
  assert.equal(zoneAt(s.player.x, s.player.y).id, 'marsh');
  assert.ok(Math.abs(s.player.x - 1816) < 1);
});

test('Ada’s investigations, fights and one-time rewards survive reloads and a second Striker kill', () => {
  const fresh = createGame();
  visit(fresh, ada);
  assert.equal(command(fresh, { type: 'accept', id: 'thirdStroke' }), false);
  let s = load();
  visit(s, ada);
  for (const id of ['flume', 'lastCasting']) assert.equal(command(s, { type: 'accept', id }), false);
  assert.ok(command(s, { type: 'accept', id: 'thirdStroke' }));
  inspect(s, 'gauge');
  inspect(s, 'gauge');
  s = reload(s);
  assert.deepEqual(s.quests.thirdStroke.progress, [1, 0]);
  inspect(s, 'bell');
  assert.ok(questReady(s, 'thirdStroke'));
  assert.equal(command(s, { type: 'complete', id: 'thirdStroke' }), false);
  turnIn(s, 'thirdStroke');
  assert.ok(command(s, { type: 'accept', id: 'flume' }));
  finish(s, 'skitter');
  s = reload(s);
  assert.deepEqual(s.quests.flume.progress, [1, 0]);
  finish(s, 'sentry');
  finish(s, 'skitter');
  turnIn(s, 'flume');
  assert.equal(bagCount(s.player, 'fenBoots'), 1);
  assert.ok(command(s, { type: 'accept', id: 'lastCasting' }));
  finish(s, 'striker');
  s = reload(s);
  assert.ok(questReady(s, 'lastCasting'));
  turnIn(s, 'lastCasting');
  const reward = bagIds(s.player, 'emberBand');
  assert.equal(reward.length, 1);
  s = reload(s);
  const elite = s.enemies.find(e => e.type === 'striker');
  assert.equal(elite.mode, 'dead');
  step(s, {}, TICK);
  assert.ok(elite.respawn < respawnSeconds('striker'));
  walk(s, elite.respawn + TICK);
  assert.equal(elite.hp, ENEMIES.striker.hp);
  finish(s, 'striker');
  visit(s, ada);
  assert.equal(command(s, { type: 'complete', id: 'lastCasting' }), false);
  assert.deepEqual(bagIds(s.player, 'emberBand'), reward);
  assert.equal(reload(s).quests.lastCasting.status, 'done');
});

test('Slag Runner commits to its pounce and Flue Watcher releases a travelling shot', () => {
  for (const [type, distance] of [['skitter', 96], ['sentry', 140]]) {
    const s = load(), e = s.enemies.find(e => e.type === type);
    s.enemies = [e];
    visit(s, { x: e.x - distance, y: e.y });
    s.player.hp = stats(s.player).maxHp;
    e.cooldown = 0;
    step(s);
    assert.equal(e.mode, 'windup');
    assert.ok(e.windupMax >= .6);
    walk(s, e.windupMax + TICK);
    if (type === 'skitter') assert.equal(e.mode, 'pounce');
    else assert.ok(s.projectiles.some(shot => shot.owner === e.id));
    walk(s, 1);
    assert.ok(s.player.hp < stats(s.player).maxHp);
  }
});

test('a level-eight player can defeat the Hollow Striker using unrolled story equipment', () => {
  const s = load(), e = s.enemies.find(e => e.type === 'striker');
  s.enemies = [e];
  setGear(s.player, 'weapon', 'emberBlade');
  setGear(s.player, 'armor', 'marshCoat');
  setGear(s.player, 'charm', 'beaconCharm');
  visit(s, { x: e.x - 55, y: e.y });
  s.player.hp = stats(s.player).maxHp;
  let warnings = 0;
  for (let tick = 0; tick < 45 / TICK && e.hp > 0 && !s.player.dead; tick++) {
    const prior = e.mode;
    command(s, { type: 'burst' });
    if (s.player.hp < stats(s.player).maxHp - 55) command(s, { type: 'potion' });
    step(s, { attack: true });
    if (e.mode === 'windup' && prior !== 'windup') warnings++;
  }
  assert.ok(warnings >= 2);
  assert.equal(e.mode, 'dead');
  assert.equal(s.player.dead, false);
});
