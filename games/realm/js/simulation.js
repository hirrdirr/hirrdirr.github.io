// Pure game rules. No DOM, Canvas, storage, clocks or network access.
// Clients send commands; step() advances a fixed tick and emits presentation events.
import { ITEMS, ENEMIES, QUESTS, NPCS, SPAWN, CHECKPOINTS, SPECIALIZATIONS, LOOT_TABLES, xpForLevel } from './data.js';
import { distance, inSafe, moveBody, lineClear, LANDMARKS, ENEMY_SPAWNS, zoneAt } from './world.js';
import { stepEnemies } from './enemy-ai.js';
export const TICK = 1 / 60;
export function stats(player) {
  const result = { maxHp: 100 + (player.level - 1) * 16, attack: 9 + (player.level - 1) * 2, defense: Math.floor((player.level - 1) / 2), speed: 158, haste: 0, dodgeCooldown: 2.5 };
  for (const item of [...Object.values(player.equipment).map(id => ITEMS[id]), player.level >= 3 ? SPECIALIZATIONS[player.specialization] : null]) {
    if (item) { result.maxHp += item.hp || 0; result.attack += item.attack || 0; result.defense += item.defense || 0; result.haste += item.haste || 0; result.speed += item.speed || 0; result.dodgeCooldown -= item.recovery || 0; }
  }
  result.attackCooldown = .42 / (1 + result.haste);
  return result;
}
export function createGame(name = 'Vandrare') {
  const state = {
    time: 0, seed: 784533, sequence: 0, events: [], drops: [], effects: [], projectiles: [], hazards: [], targetId: null,
    player: { name: name.trim().slice(0, 18) || 'Vandrare', ...SPAWN, hp: 100, level: 1, xp: 0, gold: 0, facing: { x: 0, y: 1 }, moveFacing: { x: 0, y: 1 }, dodgeDirection: { x: 0, y: 1 },
      inventory: { trainingSword: 1, linenCoat: 1, potion: 3 }, equipment: { weapon: 'trainingSword', armor: 'linenCoat', charm: null },
      cooldowns: { attack: 0, burst: 0, dodge: 0, potion: 0 }, specialization: null, checkpoint: 'village', combo: 0, comboTime: 0, invulnerable: 0, dodging: 0, attackTime: 0, moving: false, combat: 0, dead: false },
    quests: {}, harvested: [], chests: [], runes: [], discovered: ['village'], flags: { beaconLit: false, wardenDefeated: false, ancientDefeated: false, sealRestored: false }, enemies: []
  };
  state.enemies = ENEMY_SPAWNS.map(([type, x, y], index) => ({ id: 'enemy' + index, type, x, y, homeX: x, homeY: y, hp: ENEMIES[type].hp, mode: 'idle', timer: 0, cooldown: .5, windup: 0, hit: 0, respawn: 0, facing: 1 }));
  return state;
}
export function emit(s, type, data = {}) {
  s.events.push({ type, ...data });
  if (s.events.length > 100) s.events.shift();
}
function random(s) { s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0; return s.seed / 4294967296; }
function effect(s, type, x, y, text = '', extra = {}) {
  const life = ['slash', 'finisher', 'impact'].includes(type) ? .24 : .8;
  s.effects.push({ type, x, y, text, life, maxLife: life, ...extra });
  if (s.effects.length > 70) s.effects.shift();
}
export function addItem(s, id, quantity = 1) {
  if (!Object.hasOwn(ITEMS, id) || !Number.isInteger(quantity) || quantity < 1) return false;
  s.player.inventory[id] = Math.min(999, (s.player.inventory[id] || 0) + quantity);
  emit(s, 'item', { id, quantity });
  return true;
}
export function giveXP(s, amount) {
  const p = s.player;
  if (p.level >= 20) return;
  p.xp += amount;
  while (p.level < 20 && p.xp >= xpForLevel(p.level)) {
    p.xp -= xpForLevel(p.level);
    p.level++;
    p.hp = stats(p).maxHp;
    effect(s, 'level', p.x, p.y, 'Nivå ' + p.level);
    emit(s, 'level', { level: p.level });
  }
  if (p.level === 20) p.xp = 0;
}
export function questReady(s, id) {
  const q = s.quests[id];
  return q?.status === 'active' && QUESTS[id].objectives.every((o, i) => q.progress[i] >= o.count);
}
export function questEvent(s, type, target) {
  for (const [id, q] of Object.entries(s.quests)) {
    if (q.status !== 'active') continue;
    const before = questReady(s, id);
    QUESTS[id].objectives.forEach((o, i) => { if (o.type === type && o.target === target) q.progress[i] = Math.min(o.count, q.progress[i] + 1); });
    if (!before && questReady(s, id)) emit(s, 'questReady', { id });
  }
}
function nearNpc(s, id) { return NPCS.some(n => n.id === id && distance(s.player, n) <= 80); }
export function acceptQuest(s, id) {
  const q = QUESTS[id];
  if (!q || s.quests[id] || !nearNpc(s, q.npc) || s.player.dead || (q.requires && s.quests[q.requires]?.status !== 'done')) return false;
  s.quests[id] = { status: 'active', progress: q.objectives.map(o => {
    if (o.type === 'gather') return Math.min(s.harvested.length, o.count);
    if (o.type === 'rune') return Math.min(s.runes.length, o.count);
    if (o.type === 'kill' && ENEMIES[o.target]?.flag) return Number(s.flags[ENEMIES[o.target].flag]);
    if (o.type === 'beacon') return Number(s.flags.beaconLit);
    if (o.type === 'seal') return Number(s.flags.sealRestored);
    return 0;
  }) };
  emit(s, 'questAccepted', { id });
  return true;
}
export function completeQuest(s, id) {
  if (!QUESTS[id] || !questReady(s, id) || !nearNpc(s, QUESTS[id].npc) || s.player.dead) return false;
  s.quests[id].status = 'done'; // Commit before rewarding: repeated commands cannot duplicate rewards.
  const rewards = QUESTS[id].rewards;
  giveXP(s, rewards.xp);
  s.player.gold += rewards.gold;
  for (const [item, count] of Object.entries(rewards.items)) addItem(s, item, count);
  emit(s, 'questDone', { id });
  return true;
}
export function equip(s, id) {
  const item = ITEMS[id];
  if (s.player.dead || !item?.slot || !s.player.inventory[id]) return false;
  s.player.equipment[item.slot] = id;
  s.player.hp = Math.min(s.player.hp, stats(s.player).maxHp);
  emit(s, 'equip', { id });
  return true;
}
export function nearestInteraction(s) {
  const candidates = [...NPCS.map(n => ({ ...n, kind: 'npc' })), ...LANDMARKS.filter(l => (l.kind !== 'herb' || !s.harvested.includes(l.id)) && (l.kind !== 'chest' || !s.chests.includes(l.id)))];
  return candidates.filter(n => distance(n, s.player) < 72).sort((a, b) => distance(a, s.player) - distance(b, s.player))[0] || null;
}
export function interact(s) {
  const target = nearestInteraction(s);
  if (!target || s.player.dead) return false;
  if (target.kind === 'npc') {
    if (target.id === 'mira') { s.player.hp = stats(s.player).maxHp; emit(s, 'heal'); }
    emit(s, 'dialogue', { id: target.id });
  } else if (target.kind === 'herb') {
    s.harvested.push(target.id);
    questEvent(s, 'gather', 'glimmer');
    emit(s, 'message', { text: 'Glimört samlad · ' + s.harvested.length + '/3' });
  } else if (target.kind === 'chest') {
    s.chests.push(target.id);
    s.player.gold += 12;
    addItem(s, target.item, target.quantity);
    giveXP(s, 15);
    emit(s, 'message', { text: 'Gömma upptäckt · +12 guld · +15 XP' });
  } else if (target.kind === 'beacon') {
    if (!s.flags.wardenDefeated) emit(s, 'message', { text: 'Väktarens rötter håller fyren släckt.' });
    else if (!s.flags.beaconLit) {
      s.flags.beaconLit = true;
      questEvent(s, 'beacon', 'beacon');
      emit(s, 'beacon');
      effect(s, 'level', target.x, target.y, 'Ljuset har återvänt');
    } else emit(s, 'message', { text: 'Fyren lyser åter över Lyktdalen.' });
  } else if (target.kind === 'fire') {
    s.player.hp = stats(s.player).maxHp;
    s.player.checkpoint = target.id === 'campfire' ? 'camp' : 'village';
    emit(s, 'checkpoint', { name: target.id === 'campfire' ? 'Vandrarlägret' : 'Lyktdalen' });
  } else if (target.kind === 'rune') {
    if (!s.runes.includes(target.id)) { s.runes.push(target.id); giveXP(s, 18); questEvent(s, 'rune', 'ember'); emit(s, 'rune'); }
    emit(s, 'message', { text: target.text });
  } else if (target.kind === 'seal') {
    if (!s.flags.ancientDefeated) emit(s, 'message', { text: 'Myrhjärtats glöd håller sigillet öppet.' });
    else if (!s.flags.sealRestored) {
      s.flags.sealRestored = true; questEvent(s, 'seal', 'seal'); emit(s, 'seal');
      effect(s, 'level', target.x, target.y, 'Myren andas igen');
    } else emit(s, 'message', { text: 'Sigillet lyser stilla. Vägen bortom slussen får vänta.' });
  } else if (target.kind === 'gate') emit(s, 'message', { text: 'Bortom slussen ligger Asklanden. Din resa fortsätter i ett kommande kapitel.' });
  else emit(s, 'message', { text: target.id === 'marshSign' ? '↑ Gamla fyren · ← Signes läger · Glödmyren ↓ (nivå 4–6)' : '← Lyktdalen · Bron → · Gamla fyren i nordost' });
  return true;
}
function kill(s, enemy) {
  const def = ENEMIES[enemy.type];
  enemy.hp = 0; enemy.mode = 'dead'; enemy.respawn = def.boss ? Infinity : 28;
  giveXP(s, def.xp);
  s.player.gold += def.gold;
  questEvent(s, 'kill', enemy.type);
  if (def.flag) s.flags[def.flag] = true;
  s.hazards = s.hazards.filter(h => h.owner !== enemy.id);
  s.projectiles = s.projectiles.filter(shot => shot.owner !== enemy.id);
  if (s.targetId === enemy.id) s.targetId = null;
  const table = LOOT_TABLES[enemy.type];
  let roll = random(s) * table.reduce((sum, [, weight]) => sum + weight, 0), item = table[0][0];
  for (const [id, weight] of table) { roll -= weight; if (roll < 0) { item = id; break; } }
  s.drops.push({ id: ++s.sequence, x: enemy.x, y: enemy.y, item, life: 90 });
  emit(s, 'kill', { typeId: enemy.type, xp: def.xp, gold: def.gold });
  effect(s, 'xp', enemy.x, enemy.y - 16, '+' + def.xp + ' XP');
}
function attack(s, burst) {
  const p = s.player, key = burst ? 'burst' : 'attack';
  if (p.cooldowns[key] > 0 || p.dodging > 0) return false;
  p.cooldowns[key] = burst ? 5 : stats(p).attackCooldown;
  p.attackTime = .2;
  p.combat = 5;
  const reach = burst ? 100 : 65;
  const targets = s.enemies.filter(e => e.hp > 0 && e.mode !== 'return' && distance(p, e) <= reach + ENEMIES[e.type].radius && lineClear(p, e)).sort((a, b) => (b.id === s.targetId) - (a.id === s.targetId) || distance(p, a) - distance(p, b));
  if (targets.length) {
    const nearest = targets[0], d = distance(p, nearest) || 1;
    p.facing = { x: (nearest.x - p.x) / d, y: (nearest.y - p.y) / d };
  }
  if (!burst) { p.combo = targets.length ? (p.comboTime > 0 ? p.combo % 3 : 0) + 1 : 0; p.comboTime = targets.length ? 1.1 : 0; }
  const finisher = !burst && p.combo === 3;
  effect(s, burst ? 'burst' : finisher ? 'finisher' : 'slash', p.x, p.y, '', { angle: Math.atan2(p.facing.y, p.facing.x) });
  for (const e of (burst ? targets : targets.slice(0, 1))) {
    const def = ENEMIES[e.type], damage = Math.round(stats(p).attack * (burst ? 1.8 : finisher ? 1.35 : 1));
    e.hp -= damage; e.hit = .15;
    if (burst && !def.boss) { e.windup = 0; e.cooldown = Math.max(e.cooldown, .8); e.mode = 'chase'; }
    else if (!['windup', 'pounce'].includes(e.mode)) e.mode = 'chase';
    if (!def.boss && (burst || finisher)) {
      const d = distance(p, e) || 1; moveBody(e, (e.x - p.x) / d * 14, (e.y - p.y) / d * 14, def.radius);
    }
    if (!burst) s.targetId = e.id;
    effect(s, 'impact', e.x, e.y - 18);
    effect(s, 'damage', e.x, e.y - 24, String(damage));
    if (e.hp <= 0) kill(s, e);
  }
  emit(s, burst ? 'burst' : finisher ? 'finisher' : 'attack', { hit: targets.length > 0 });
  return true;
}
function hurt(s, amount) {
  const p = s.player;
  if (p.invulnerable > 0 || p.dead || inSafe(p.x, p.y)) return;
  const damage = Math.max(1, amount - stats(p).defense);
  p.hp = Math.max(0, p.hp - damage); p.invulnerable = .35; p.combat = 7;
  effect(s, 'hurt', p.x, p.y - 28, '-' + damage);
  emit(s, 'hurt');
  if (p.hp <= 0) { p.dead = true; p.moving = false; emit(s, 'death'); }
}
export function command(s, input) {
  const p = s.player;
  if (input.type === 'respawn' && p.dead) {
    Object.assign(p, CHECKPOINTS[p.checkpoint] || SPAWN, { hp: stats(p).maxHp, dead: false, invulnerable: 2, dodging: 0, combat: 0, combo: 0, comboTime: 0 });
    s.hazards = []; s.projectiles = []; s.targetId = null;
    for (const e of s.enemies) if (e.hp > 0) Object.assign(e, { x: e.homeX, y: e.homeY, hp: ENEMIES[e.type].hp, mode: 'idle', windup: 0, cooldown: 1 });
    emit(s, 'respawn'); return true;
  }
  if (p.dead) return false;
  switch (input.type) {
    case 'target': {
      const targets = s.enemies.filter(e => e.hp > 0 && e.mode !== 'return' && distance(p, e) < 330).sort((a, b) => distance(p, a) - distance(p, b));
      if (input.id) s.targetId = targets.find(e => e.id === input.id)?.id || null;
      else s.targetId = targets[(targets.findIndex(e => e.id === s.targetId) + 1) % targets.length]?.id || null;
      return true;
    }
    case 'specialize':
      if (p.level < 3 || !Object.hasOwn(SPECIALIZATIONS, input.id) || !inSafe(p.x, p.y)) return false;
      p.specialization = input.id; p.hp = Math.min(p.hp, stats(p).maxHp); emit(s, 'specialized'); return true;
    case 'attack': return attack(s, false);
    case 'burst': return attack(s, true);
    case 'dodge':
      if (p.cooldowns.dodge > 0) return false;
      p.cooldowns.dodge = stats(p).dodgeCooldown; p.dodging = .18; p.invulnerable = .28;
      p.dodgeDirection = { ...(p.moving ? p.moveFacing : p.facing) }; p.facing = { ...p.dodgeDirection };
      emit(s, 'dodge'); return true;
    case 'potion':
      if (!p.inventory.potion || p.cooldowns.potion > 0 || p.hp >= stats(p).maxHp) return false;
      p.inventory.potion--; p.hp = Math.min(stats(p).maxHp, p.hp + 55); p.cooldowns.potion = 8;
      effect(s, 'heal', p.x, p.y - 24, '+55'); emit(s, 'heal'); return true;
    case 'interact': return interact(s);
    case 'accept': return acceptQuest(s, input.id);
    case 'complete': return completeQuest(s, input.id);
    case 'equip': return equip(s, input.id);
    case 'buy':
      if (!nearNpc(s, 'ivo') || p.gold < 12 || (p.inventory.potion || 0) >= 999) return false;
      p.gold -= 12; addItem(s, 'potion'); return true;
    case 'sell': {
      if (!nearNpc(s, 'ivo')) return false;
      let gold = 0;
      for (const id of ['amber', 'emberShard']) { gold += (p.inventory[id] || 0) * ITEMS[id].value; p.inventory[id] = 0; }
      if (!gold) return false;
      p.gold += gold; emit(s, 'message', { text: 'Fynd sålda · +' + gold + ' guld' }); return true;
    }
    default: return false;
  }
}
export function step(s, input = {}, dt = TICK) {
  if (!Number.isFinite(dt) || dt <= 0 || dt > .05 || s.player.dead) return;
  s.time += dt;
  const p = s.player;
  for (const key of Object.keys(p.cooldowns)) p.cooldowns[key] = Math.max(0, p.cooldowns[key] - dt);
  for (const key of ['invulnerable', 'attackTime', 'combat', 'comboTime']) p[key] = Math.max(0, p[key] - dt);
  if (p.comboTime === 0) p.combo = 0;
  let dx = Number.isFinite(input.x) ? input.x : 0, dy = Number.isFinite(input.y) ? input.y : 0;
  const length = Math.hypot(dx, dy);
  if (length > 0) { dx /= length; dy /= length; if (p.dodging <= 0) { p.facing = { x: dx, y: dy }; p.moveFacing = { x: dx, y: dy }; } }
  if (p.dodging > 0) { dx = p.dodgeDirection.x; dy = p.dodgeDirection.y; }
  p.moving = Math.abs(dx) + Math.abs(dy) > .01;
  moveBody(p, dx * (p.dodging > 0 ? 510 : stats(p).speed) * dt, dy * (p.dodging > 0 ? 510 : stats(p).speed) * dt);
  p.dodging = Math.max(0, p.dodging - dt);
  if (input.attack) command(s, { type: 'attack' });
  if (p.combat === 0) p.hp = Math.min(stats(p).maxHp, p.hp + (inSafe(p.x, p.y) ? 9 : 1.5) * dt);
  const zone = zoneAt(p.x, p.y);
  if (!s.discovered.includes(zone.id)) {
    s.discovered.push(zone.id); giveXP(s, 12);
    emit(s, 'discovery', { name: zone.name });
  }
  stepEnemies(s, dt, { random, hurt, effect });
  if (s.targetId && !s.enemies.some(e => e.id === s.targetId && e.hp > 0 && distance(p, e) < 370)) s.targetId = null;
  s.drops = s.drops.filter(drop => {
    drop.life -= dt;
    if (!p.dead && distance(drop, p) < 32) {
      if (ITEMS[drop.item].slot && p.inventory[drop.item]) {
        const gold = ITEMS[drop.item].value || 12;
        p.gold += gold; emit(s, 'salvage', { id: drop.item, gold });
      } else addItem(s, drop.item);
      return false;
    }
    return drop.life > 0;
  });
  for (const fx of s.effects) fx.life -= dt;
  s.effects = s.effects.filter(fx => fx.life > 0);
}
