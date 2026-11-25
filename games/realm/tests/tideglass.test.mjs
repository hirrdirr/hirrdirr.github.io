import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CHECKPOINTS, ENEMIES, NPCS, QUESTS, questRecipient } from '../js/data.js';
import { TIDE_MARKS, TIDE_NPCS, TIDE_QUESTS, TIDE_SPAWNS } from '../js/tideglass.js';
import { blocked, LANDMARKS, zoneAt } from '../js/world.js';
import { deserialize, serialize } from '../js/save.js';
import { command, createGame, enemyKillXP, nearestInteraction, questReady, stats, step, TICK } from '../js/simulation.js';
import { respawnSeconds } from '../js/enemy-life.js';
import { bagIds, put } from './item-helpers.mjs';
import { UI } from '../js/ui.js';

const fixture = readFileSync(new URL('./fixtures/v0.5.2.1-casting.json', import.meta.url), 'utf8');
const load = () => deserialize(fixture);
const reload = s => deserialize(serialize(s));
const data = s => JSON.parse(serialize(s)).data;
function approach(s, id) {
  const target = [...NPCS, ...LANDMARKS].find(o => o.id === id);
  assert.ok(!blocked(target.x, target.y), id);
  Object.assign(s.player, { x: target.x, y: target.y });
  assert.equal(nearestInteraction(s).id, id);
}
function interact(s, id) {
  approach(s, id);
  assert.ok(command(s, { type: 'interact' }), id);
}
function quest(s, type, id) {
  approach(s, type === 'accept' ? QUESTS[id].npc : questRecipient(QUESTS[id]));
  return command(s, { type, id });
}
// Fight with ordinary attacks and cooldowns against a full-health opponent.
function fight(s, type) {
  const e = s.enemies.find(e => e.type === type && e.hp > 0);
  const roster = s.enemies; s.enemies = [e];
  Object.assign(s.player, { x: e.x - 30, y: e.y });
  command(s, { type: 'target', id: e.id });
  assert.equal(s.targetId, e.id);
  const level = s.player.level;
  for (let tick = 0; tick < 60 / TICK && !s.player.dead && e.hp > 0; tick++) {
    if (s.player.hp < stats(s.player).maxHp - 55) command(s, { type: 'potion' });
    command(s, { type: 'burst' }); step(s, { attack: true });
  }
  assert.equal(e.mode, 'dead', type);
  const kill = s.events.findLast(event => event.type === 'kill');
  assert.equal(kill.xp, enemyKillXP(ENEMIES[type].xp, ENEMIES[type].level, level));
  assert.equal(e.respawn, respawnSeconds(type) - TICK);
  s.enemies = roster;
}

test('an eight-quest 0.5.2.1 character can take the eastern road immediately', () => {
  const s = load(), before = JSON.parse(fixture).data;
  assert.equal(Object.keys(before.quests).length, 8);
  assert.deepEqual(data(s), before);
  assert.ok(quest(s, 'accept', 'blueRoad'));
  interact(s, 'pilot');
  assert.ok(!quest(s, 'accept', 'soundings'));
  assert.ok(quest(s, 'complete', 'blueRoad'));
  assert.ok(quest(reload(s), 'accept', 'soundings'));
  for (const [id, q] of Object.entries(before.quests)) assert.deepEqual(s.quests[id], q);
  assert.ok(!quest(createGame(), 'accept', 'blueRoad'));
});

test('all fifteen commissions resolve using world interactions, combat, the correct recipient and one reward', () => {
  let s = load();
  for (const [id, def] of Object.entries(TIDE_QUESTS)) {
    assert.ok(quest(s, 'accept', id), id);
    for (const [i, obj] of def.objectives.entries()) {
      if (obj.type === 'kill') {
        for (let count = 0; count < obj.count; count++) fight(s, obj.target);
      } else interact(s, obj.target);
      s = reload(s);
      assert.equal(s.quests[id].progress[i], obj.count, id + '/' + obj.target);
    }
    assert.ok(questReady(s, id), id);
    if (def.turnIn) {
      approach(s, def.npc);
      assert.equal(command(s, { type: 'complete', id }), false);
      const ui = Object.create(UI.prototype); ui.state = () => s;
      assert.doesNotMatch(ui.questHTML(id, def.npc), /data-action="complete"/);
      assert.match(ui.questHTML(id, def.turnIn), /data-action="complete"/);
    }
    const gold = s.player.gold;
    assert.ok(quest(s, 'complete', id), id);
    assert.equal(s.player.gold, gold + def.rewards.gold);
    const awarded = data(s);
    assert.equal(quest(s, 'complete', id), false);
    assert.deepEqual(data(s), awarded);
  }
  assert.ok(s.player.level >= 12);
  assert.equal(Object.values(s.quests).filter(q => q.status === 'done').length, 23);
  const [ring] = bagIds(s.player, 'pilotRing');
  assert.deepEqual(s.player.itemInstances[ring].modifiers, {});
});

test('early fieldwork, the two-pool puzzle and ordered repairs survive mistakes and reloads', () => {
  let s = load();
  interact(s, 'eastStaff'); interact(s, 'eastStaff');
  interact(s, 'pilot'); assert.ok(quest(s, 'accept', 'blueRoad'));
  assert.ok(quest(s, 'complete', 'blueRoad')); s = reload(s);
  assert.ok(quest(s, 'accept', 'soundings'));
  interact(s, 'eastValve'); assert.deepEqual(s.quests.soundings.progress, [0,1,0]);
  interact(s, 'westStaff'); interact(s, 'westValve');
  assert.match(s.events.at(-1).text, /draws air/);
  assert.deepEqual(s.quests.soundings.progress, [1,1,0]);
  interact(s, 'eastValve'); assert.ok(questReady(reload(s), 'soundings'));
  assert.equal(s.records.filter(id => id === 'eastStaff').length, 1);
  interact(s, 'farLamp'); assert.ok(quest(s, 'accept', 'lanterns'));
  interact(s, 'farLamp'); assert.match(s.events.at(-1).text, /First/);
  interact(s, 'nearLamp'); s = reload(s); interact(s, 'farLamp');
  assert.ok(quest(s, 'complete', 'lanterns'));
});

test('field notes, secrets, safe checkpoint and regional discoveries round trip without duplicate loot', () => {
  let s = load();
  for (const spot of [...TIDE_MARKS, ...TIDE_NPCS]) approach(s, spot.id);
  interact(s, 'whistle'); interact(s, 'cove'); interact(s, 'survivorsBox');
  const ids = bagIds(s.player, 'seaGrips');
  interact(s, 'soundingFire'); step(s);
  assert.equal(s.player.checkpoint, 'sounding');
  approach(s, 'mail'); step(s); s = reload(s);
  assert.ok(s.discovered.includes('postyard') && s.discovered.includes('shelf'));
  assert.ok(s.records.includes('whistle') && s.records.includes('cove'));
  assert.equal(s.player.checkpoint, 'sounding');
  assert.deepEqual(bagIds(s.player, 'seaGrips'), ids);
  assert.ok(s.chests.includes('survivorsBox'));
  const at = LANDMARKS.find(l => l.id === 'survivorsBox');
  Object.assign(s.player, {x:at.x, y:at.y});
  assert.notEqual(nearestInteraction(s)?.id, at.id);
  s.player.dead = true; command(s, {type:'respawn'});
  assert.deepEqual({ x:s.player.x, y:s.player.y }, CHECKPOINTS.sounding);
  assert.equal(zoneAt(s.player.x,s.player.y).safe, true);
});

test('a full bag holds the final reward and repeat kills cannot issue a second loop', () => {
  let s = load();
  fight(s, 'ebbwright'); s = reload(s);
  s.quests.balance = { status:'done', progress:[1,1] };
  assert.ok(quest(s,'accept','moonDial'));
  assert.deepEqual(s.quests.moonDial.progress,[1,0]);
  interact(s,'dialBrake');
  const fillers = put(s.player,'copperBand',16 - Object.keys(s.player.inventory).length);
  const before = data(s);
  assert.equal(quest(s,'complete','moonDial'),false);
  assert.deepEqual(s.player.itemInstances,before.player.itemInstances);
  assert.equal(s.player.gold,before.player.gold);
  approach(s,'ivo');
  assert.ok(command(s,{type:'sell',id:fillers[0]}));
  assert.ok(quest(s,'complete','moonDial'));
  const copies = bagIds(s.player,'pilotRing');
  const e = s.enemies.find(e=>e.type==='ebbwright');
  e.respawn = TICK; step(s);
  assert.equal(e.hp,ENEMIES.ebbwright.hp);
  fight(s,'ebbwright');
  assert.equal(quest(s,'complete','moonDial'),false);
  assert.deepEqual(bagIds(reload(s).player,'pilotRing'),copies);
});

test('the Ebbwright alternates a hollow ring and aimed surge, each with a readable windup', () => {
  const s = load(), e = s.enemies.find(e => e.type === 'ebbwright');
  s.enemies = [e]; e.cooldown = 0;
  Object.assign(s.player, { x:e.x - 28, y:e.y, hp:stats(s.player).maxHp });
  step(s); assert.equal(e.mode,'windup'); assert.equal(s.hazards[0].inner,50);
  const hp = s.player.hp;
  for (let i=0;i<66;i++) step(s);
  assert.equal(s.player.hp,hp);
  for (let i=0;i<240 && !s.hazards.length;i++) step(s);
  assert.ok(s.hazards.length);
  assert.equal(s.hazards[0].inner,undefined);
  for (let i=0;i<66;i++) step(s);
  assert.ok(s.player.hp<hp);
});

test('new wildlife has valid homes, four fighting roles across the region, kill rewards and respawns', () => {
  for (const type of new Set(TIDE_SPAWNS.map(([id])=>id))) {
    const s=load(), e=s.enemies.find(e=>e.type===type);
    assert.ok(!blocked(e.x,e.y,ENEMIES[type].radius));
    fight(s,type);
    e.respawn=TICK;step(s);
    assert.equal(e.hp,ENEMIES[type].hp);
    assert.equal(e.mode,'idle');
  }
});

test('Knell telegraphs a fan and releases three distinct shots from the toll arch', () => {
  const s = load(), e = s.enemies.find(e => e.type === 'knell');
  s.enemies = [e]; e.cooldown = 0;
  Object.assign(s.player, { x:e.x + 100, y:e.y });
  step(s);
  assert.equal(e.mode, 'windup');
  assert.equal(e.windupMax, 1);
  for (let i=0; i<62; i++) step(s);
  const shots = s.projectiles.filter(p => p.owner === e.id);
  assert.equal(shots.length, 3);
  assert.ok(shots[0].vy < 0 && shots[2].vy > 0);
  assert.ok(Math.abs(shots[1].vy) < 1e-6);
});
