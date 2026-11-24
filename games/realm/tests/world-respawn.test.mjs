import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createGame, command, step, enemyKillXP, giveXP } from '../js/simulation.js';
import { ENEMIES, QUESTS, NPCS, SPAWN, xpForLevel } from '../js/data.js';
import { respawnSeconds, spawnKey, placeAtHome } from '../js/enemy-life.js';
import { blocked, distance, inSafe, LANDMARKS } from '../js/world.js';
import { deserialize, serialize } from '../js/save.js';
import { bagIds } from './item-helpers.mjs';

const tick = 1 / 32; // Binary-exact seconds at a supported simulation step.
function run(s, seconds) {
  for (let i = 0; i < Math.round(seconds / tick); i++) step(s, {}, tick);
}
function encounter(type, level = ENEMIES[type].level) {
  const s = createGame(), e = s.enemies.find(enemy => enemy.type === type);
  s.enemies = [e]; s.player.level = level;
  s.discovered = ['village', 'camp', 'trail', 'forest', 'ruins', 'marsh'];
  return { s, e };
}
function defeat(s, e) {
  assert.ok(e.hp > 0);
  Object.assign(s.player, { x: e.x - 40, y: e.y });
  e.hp = 1; s.player.cooldowns.attack = 0;
  const kills = s.events.filter(event => event.type === 'kill').length;
  assert.ok(command(s, { type: 'attack' }));
  assert.equal(e.mode, 'dead');
  assert.equal(s.events.filter(event => event.type === 'kill').length, kills + 1);
  return s.events.findLast(event => event.type === 'kill');
}

test('kill XP uses rounded base percentages at every level boundary and rejects invalid inputs', () => {
  assert.deepEqual([1,2,3,4,5,6,7,8,11].map(level => enemyKillXP(16, 1, level)), [16,14,10,7,4,2,0,0,0]);
  assert.equal(enemyKillXP(16, 2, 1), 18); assert.equal(enemyKillXP(16, 3, 1), 20);
  assert.equal(enemyKillXP(145, 6, 1), 181); assert.equal(enemyKillXP(145, 6, 8), 94);
  assert.equal(enemyKillXP(145, 20, 20), 0);
  for (const bad of [-1, NaN, Infinity, '1', 1.3, 0]) {
    for (const args of [[bad,1,1],[16,bad,1],[16,1,bad]]) assert.equal(enemyKillXP(...args), 0);
  }
});

test('kill events and floating XP match the actual award, including level-ups, trivial kills and cap', () => {
  for (const [type, level, before, award] of [
    ['sprout', 1, 54, 16], ['sprout', 3, 0, 10], ['sprout', 5, 0, 4],
    ['sprout', 11, 0, 0], ['warden', 5, 0, 81], ['ancient', 20, 0, 0]
  ]) {
    const { s, e } = encounter(type, level); s.player.xp = before;
    const kill = defeat(s, e), remaining = before + award;
    assert.equal(kill.xp, award); assert.equal(s.player.gold, ENEMIES[type].gold); assert.equal(s.drops.length, 1);
    assert.equal(s.player.xp, remaining >= xpForLevel(level) ? remaining - xpForLevel(level) : remaining);
    assert.equal(s.player.level, level + Number(remaining >= xpForLevel(level)));
    assert.deepEqual(s.effects.filter(effect => effect.type === 'xp').map(f => f.text), award ? ['+' + award + ' XP'] : []);
    s.player.cooldowns.burst = 0; command(s, { type: 'burst' });
    assert.equal(s.drops.length, 1); assert.equal(s.events.filter(event => event.type === 'kill').length, 1);
  }
  const s = createGame(); s.player.level = 19; s.player.xp = xpForLevel(19) - 2;
  assert.equal(giveXP(s, 15), 2); assert.equal(s.player.level, 20); assert.equal(s.player.xp, 0);
  assert.equal(giveXP(s, 15), 0);
});

test('quest, cache, discovery and runestone XP stay fixed and cap feedback only reports earned points', () => {
  const { s } = encounter('sprout', 11), p = s.player;
  Object.assign(p, NPCS.find(n => n.id === 'elin'));
  s.quests.roots = { status: 'active', progress: [5] };
  assert.ok(command(s, { type: 'complete', id: 'roots' })); assert.equal(p.xp, QUESTS.roots.rewards.xp);
  function visit(id) { const {x,y} = LANDMARKS.find(l => l.id === id); Object.assign(p,{x,y}); command(s,{type:'interact'}); }
  visit('chest1'); assert.equal(p.xp, 75); assert.match(s.events.at(-1).text, /\+15 XP/);
  visit('rune1'); assert.equal(p.xp, 93); assert.equal(s.events.findLast(e => e.type === 'rune').xp, 18);
  s.discovered = ['village']; step(s); assert.equal(p.xp, 105); assert.equal(s.events.findLast(e => e.type === 'discovery').xp, 12);
  p.level = 19; p.xp = xpForLevel(19) - 1;
  visit('chest2'); assert.match(s.events.at(-1).text, /\+1 XP$/); assert.equal(p.level,20);
  visit('chest3'); assert.doesNotMatch(s.events.at(-1).text, /XP/);
});

for (const [type, seconds] of Object.entries({ sprout: 28, wolf: 28, wisp: 28, warden: 120, ancient: 180 })) {
  test(type + ' returns on time at home with a fresh encounter', () => {
    const { s, e } = encounter(type), def = ENEMIES[type];
    // Kill away from home while the previous encounter has transient state.
    Object.assign(e, { x:1504, y:648, timer:2, wander:2.7, aim:{x:-1,y:0}, windupMax:1, pounceTime:.4, pounceHit:true, facing:-1 });
    s.projectiles.push({owner:e.id}); s.hazards.push({owner:e.id});
    defeat(s, e); assert.equal(e.respawn, seconds);
    assert.equal(s.projectiles.length,0); assert.equal(s.hazards.length,0);
    Object.assign(s.player, SPAWN);
    run(s, seconds - tick); assert.equal(e.hp, 0); assert.equal(e.respawn, tick);
    step(s, {}, tick);
    assert.deepEqual([e.x,e.y,e.hp,e.mode,e.cooldown,e.windup,e.windupMax,e.hit,e.timer,e.respawn],
      [e.homeX,e.homeY,def.hp,'idle',1,0,0,0,0,0]);
    assert.equal(e.aim,null); assert.equal(e.wander,undefined); assert.equal(e.pounceTime,0); assert.equal(e.pounceHit,false);
    if (def.boss) {
      Object.assign(s.player, {x:e.x-35,y:e.y}); run(s,1.1);
      assert.equal(e.mode,'windup'); assert.ok(e.aim);
      if (type === 'ancient') assert.equal(s.hazards.length,1);
      run(s,1.1);
      assert.ok(s.effects.some(f=>f.type===(type==='ancient'?'eruption':'slam')));
    }
  });
}

test('all authored homes can respawn immediately beside a camping player with solid terrain clearance', () => {
  const s = createGame();
  for (const e of s.enemies) {
    const radius = ENEMIES[e.type].radius, gap = radius + 19;
    // One unobstructed outer point guarantees clearance for *any* player
    // anywhere inside the home circle, including between the sample angles.
    assert.ok(Array.from({length:8}, (_,i) => {
      const x = e.homeX + (2*gap+1)*Math.cos(i*Math.PI/4);
      const y = e.homeY + (2*gap+1)*Math.sin(i*Math.PI/4);
      return !blocked(x,y,radius) && !inSafe(x,y);
    }).some(Boolean));
    for (const displacement of [0, gap/2, gap-.01]) for (let i=0; i<16; i++) {
      const p = {x:e.homeX + displacement*Math.cos(i*Math.PI/8), y:e.homeY + displacement*Math.sin(i*Math.PI/8)};
      placeAtHome(e,p);
      assert.ok(distance(e,p) >= gap);
      assert.ok(!blocked(e.x,e.y,radius) && !inSafe(e.x,e.y));
    }
  }
  const {s:camp,e} = encounter('ancient'); defeat(camp,e);
  Object.assign(camp.player,{x:e.homeX,y:e.homeY}); run(camp,180);
  assert.equal(e.hp,ENEMIES.ancient.hp); assert.equal(e.mode,'idle');
  assert.ok(distance(e,camp.player) >= ENEMIES.ancient.radius+19);
});

test('ordinary and boss countdowns survive repeated saves and reloads independently of story flags', () => {
  let s = createGame(); const originals = s.enemies.filter(e => ['warden','ancient','wolf'].includes(e.type));
  for (const e of originals) { e.mode='dead'; e.hp=0; e.respawn=respawnSeconds(e.type)-.625; }
  const times = JSON.parse(serialize(s)).data.respawns;
  for (let i=0;i<12;i++) s=deserialize(serialize(s));
  assert.deepEqual(JSON.parse(serialize(s)).data.respawns,times);
  run(s, 28); assert.ok(s.enemies.filter(e=>e.type==='wolf').every(e=>e.hp>0));
  const w=s.enemies.find(e=>e.type==='warden'); assert.equal(w.respawn,91.375); assert.equal(s.flags.wardenDefeated,false);
  const raw=JSON.parse(serialize(s));
  raw.data.respawns[spawnKey(w)]=1e20; raw.data.respawns.unknown=120;
  const ancient=s.enemies.find(e=>e.type==='ancient'); raw.data.respawns[spawnKey(ancient)]='Infinity';
  s=deserialize(JSON.stringify(raw)); assert.equal(s.enemies.find(e=>e.type==='warden').respawn,120);
  assert.equal(s.enemies.find(e=>e.type==='ancient').mode,'idle');
});

test('repeated boss kills preserve completed stories and create one unique tradable reward per defeat', () => {
  for (const [type,quest,npc,storyFlag,loot] of [
    ['warden','beacon','elin','beaconLit','moonBlade'], ['ancient','heart','signe','sealRestored','emberCharm']
  ]) {
    let {s,e}=encounter(type); const def=ENEMIES[type];
    s.quests[quest]={status:'active',progress:[0,0]};
    defeat(s,e); const first=s.drops[0].item;
    Object.assign(s.player,{x:e.x,y:e.y}); step(s); assert.equal(s.player.inventory[first],1);
    const landmark = LANDMARKS.find(l => l.kind === (type === 'warden' ? 'beacon' : 'seal'));
    Object.assign(s.player,{x:landmark.x,y:landmark.y+25});
    assert.ok(command(s,{type:'interact'}));
    assert.deepEqual(s.quests[quest].progress,[1,1]);
    Object.assign(s.player,NPCS.find(n=>n.id===npc)); assert.ok(command(s,{type:'complete',id:quest}));
    const completed=structuredClone(s.quests[quest]);
    run(s,respawnSeconds(type)); assert.ok(e.hp>0);
    const expected=enemyKillXP(def.xp,def.level,s.player.level),gold=s.player.gold;
    const kill=defeat(s,e); assert.equal(kill.xp,expected); assert.equal(s.player.gold,gold+def.gold);
    const next=s.drops.at(-1).item; assert.notEqual(next,first);
    assert.equal(s.player.itemInstances[next].templateId,loot);
    assert.deepEqual(s.quests[quest],completed); assert.ok(s.flags[storyFlag]); assert.ok(s.flags[def.flag]);
    Object.assign(s.player,NPCS.find(n=>n.id===npc));
    const beforeClaim=JSON.parse(serialize(s)).data;
    assert.equal(command(s,{type:'complete',id:quest}),false);
    assert.deepEqual(JSON.parse(serialize(s)).data,beforeClaim);
    const records=structuredClone(s.player.itemInstances); s=deserialize(serialize(s));
    assert.deepEqual(s.player.itemInstances,records); assert.equal(s.drops.at(-1).item,next);
    assert.equal(bagIds(s.player,loot).length,1);
  }
});

test('0.4.4 journey keeps its rolled gear, buyback, drops and completed story with both bosses available', async () => {
  const raw=await readFile(new URL('./fixtures/v0.4.4-world.json',import.meta.url),'utf8');
  const s=deserialize(raw), original=JSON.parse(raw);
  assert.deepEqual(JSON.parse(serialize(s)).data, original.data);
  for (const e of s.enemies.filter(e=>ENEMIES[e.type].boss)) {
    assert.ok(s.flags[ENEMIES[e.type].flag]); assert.equal(e.hp,ENEMIES[e.type].hp);
  }
  const sale=s.buyback[0], record=structuredClone(s.player.itemInstances[sale.item]);
  assert.ok(Object.keys(record.modifiers).length>0);
  Object.assign(s.player,NPCS.find(n=>n.id==='ivo')); assert.ok(command(s,{type:'buyback',id:sale.id}));
  assert.deepEqual(s.player.itemInstances[sale.item],record); assert.equal(s.player.inventory[sale.item],1);
});

test('a wounded Dusk Wolf blocked by terrain completes its evade without awarding a kill', () => {
  const { s, e } = encounter('wolf');
  Object.assign(e, { x: 1230, y: 409, hp: 1, mode: 'chase' });
  Object.assign(s.player, SPAWN);
  step(s, {}, tick);
  assert.equal(e.mode, 'return');
  run(s, 8);
  assert.equal(e.mode, 'idle');
  assert.equal(e.hp, ENEMIES.wolf.hp);
  assert.ok(Math.hypot(e.x - e.homeX, e.y - e.homeY) < 8);
  assert.equal(s.events.some(event => event.type === 'kill'), false);
  defeat(s, e);
});

test('a zero-HP wolf with a stale AI mode resumes its respawn timer without duplicating rewards', () => {
  for (const remaining of [0, 3]) {
    const { s, e } = encounter('wolf');
    Object.assign(e, { hp: 0, mode: 'pounce', respawn: remaining });
    run(s, (remaining || respawnSeconds('wolf')) - tick);
    assert.equal(e.mode, 'dead');
    assert.equal(e.respawn, tick);
    step(s, {}, tick);
    assert.equal(e.hp, ENEMIES.wolf.hp);
    assert.equal(e.mode, 'idle');
    assert.equal(s.events.some(event => event.type === 'kill'), false);
    assert.equal(s.drops.length, 0);
  }
});
