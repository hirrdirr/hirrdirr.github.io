// Pure game rules. No DOM, Canvas, storage, clocks or network access.
// Clients send commands; step() advances a fixed tick and emits presentation events.
import { ITEMS, ENEMIES, QUESTS, NPCS, SPAWN, xpForLevel } from './data.js';
import { distance, inSafe, moveBody, LANDMARKS, ENEMY_SPAWNS, zoneAt } from './world.js';
export const TICK = 1 / 60;
export function stats(player) {
  const result = { maxHp: 100 + (player.level - 1) * 16, attack: 9 + (player.level - 1) * 2, defense: Math.floor((player.level - 1) / 2) };
  for (const id of Object.values(player.equipment)) {
    const item = ITEMS[id];
    if (item) { result.maxHp += item.hp || 0; result.attack += item.attack || 0; result.defense += item.defense || 0; }
  }
  return result;
}
export function createGame(name = 'Vandrare') {
  const state = {
    time: 0, seed: 784533, sequence: 0, events: [], drops: [], effects: [],
    player: { name: name.trim().slice(0, 18) || 'Vandrare', ...SPAWN, hp: 100, level: 1, xp: 0, gold: 0, facing: { x: 0, y: 1 },
      inventory: { trainingSword: 1, linenCoat: 1, potion: 3 }, equipment: { weapon: 'trainingSword', armor: 'linenCoat', charm: null },
      cooldowns: { attack: 0, burst: 0, dodge: 0, potion: 0 }, invulnerable: 0, dodging: 0, attackTime: 0, moving: false, combat: 0, dead: false },
    quests: {}, harvested: [], chests: [], discovered: ['village'], flags: { beaconLit: false, wardenDefeated: false }, enemies: []
  };
  state.enemies = ENEMY_SPAWNS.map(([type, x, y], index) => ({ id: 'enemy' + index, type, x, y, homeX: x, homeY: y, hp: ENEMIES[type].hp, mode: 'idle', timer: 0, cooldown: .5, windup: 0, hit: 0, respawn: 0, facing: 1 }));
  return state;
}
export function emit(s, type, data = {}) {
  s.events.push({ type, ...data });
  if (s.events.length > 100) s.events.shift();
}
function random(s) { s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0; return s.seed / 4294967296; }
function effect(s, type, x, y, text = '') {
  s.effects.push({ type, x, y, text, life: type === 'slash' ? .2 : .8, maxLife: type === 'slash' ? .2 : .8 });
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
  s.quests[id] = { status: 'active', progress: q.objectives.map(o => o.type === 'gather' ? Math.min(s.harvested.length, o.count) : o.type === 'kill' && o.target === 'warden' ? Number(s.flags.wardenDefeated) : o.type === 'beacon' ? Number(s.flags.beaconLit) : 0) };
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
    emit(s, 'message', { text: 'Lyktans värme återställer din hälsa.' });
  } else emit(s, 'message', { text: '← Lyktdalen · Bron → · Gamla fyren i nordost' });
  return true;
}
function kill(s, enemy) {
  const def = ENEMIES[enemy.type];
  enemy.hp = 0; enemy.mode = 'dead'; enemy.respawn = def.boss ? Infinity : 28;
  giveXP(s, def.xp);
  s.player.gold += def.gold;
  questEvent(s, 'kill', enemy.type);
  if (def.boss) s.flags.wardenDefeated = true;
  const item = def.boss ? 'moonBlade' : random(s) < .28 ? 'potion' : 'amber';
  s.drops.push({ id: ++s.sequence, x: enemy.x, y: enemy.y, item, life: 90 });
  emit(s, 'kill', { typeId: enemy.type, xp: def.xp, gold: def.gold });
  effect(s, 'xp', enemy.x, enemy.y - 16, '+' + def.xp + ' XP');
}
function attack(s, burst) {
  const p = s.player, key = burst ? 'burst' : 'attack';
  if (p.cooldowns[key] > 0 || p.dodging > 0) return false;
  p.cooldowns[key] = burst ? 5 : .42;
  p.attackTime = .2;
  p.combat = 5;
  const reach = burst ? 100 : 65;
  const targets = s.enemies.filter(e => e.hp > 0 && distance(p, e) <= reach + ENEMIES[e.type].radius).sort((a, b) => distance(p, a) - distance(p, b));
  if (targets.length) {
    const nearest = targets[0], d = distance(p, nearest) || 1;
    p.facing = { x: (nearest.x - p.x) / d, y: (nearest.y - p.y) / d };
  }
  effect(s, burst ? 'burst' : 'slash', p.x, p.y);
  for (const e of (burst ? targets : targets.slice(0, 1))) {
    const damage = Math.round(stats(p).attack * (burst ? 1.8 : 1));
    e.hp -= damage; e.hit = .15;
    e.mode = e.mode === 'windup' ? 'windup' : 'chase';
    effect(s, 'damage', e.x, e.y - 24, String(damage));
    if (e.hp <= 0) kill(s, e);
  }
  emit(s, burst ? 'burst' : 'attack', { hit: targets.length > 0 });
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
    Object.assign(p, SPAWN, { hp: stats(p).maxHp, dead: false, invulnerable: 2, dodging: 0, combat: 0 });
    for (const e of s.enemies) if (e.hp > 0) Object.assign(e, { x: e.homeX, y: e.homeY, hp: ENEMIES[e.type].hp, mode: 'idle', windup: 0, cooldown: 1 });
    emit(s, 'respawn'); return true;
  }
  if (p.dead) return false;
  switch (input.type) {
    case 'attack': return attack(s, false);
    case 'burst': return attack(s, true);
    case 'dodge':
      if (p.cooldowns.dodge > 0) return false;
      p.cooldowns.dodge = 2.5; p.dodging = .18; p.invulnerable = .28;
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
      if (!nearNpc(s, 'ivo') || !p.inventory.amber) return false;
      const gold = p.inventory.amber * ITEMS.amber.value; p.gold += gold; p.inventory.amber = 0;
      emit(s, 'message', { text: 'Bärnsten såld · +' + gold + ' guld' }); return true;
    }
    default: return false;
  }
}
export function step(s, input = {}, dt = TICK) {
  if (!Number.isFinite(dt) || dt <= 0 || dt > .05 || s.player.dead) return;
  s.time += dt;
  const p = s.player;
  for (const key of Object.keys(p.cooldowns)) p.cooldowns[key] = Math.max(0, p.cooldowns[key] - dt);
  for (const key of ['invulnerable', 'attackTime', 'combat']) p[key] = Math.max(0, p[key] - dt);
  let dx = Number.isFinite(input.x) ? input.x : 0, dy = Number.isFinite(input.y) ? input.y : 0;
  const length = Math.hypot(dx, dy);
  if (length > 0) { dx /= length; dy /= length; if (p.dodging <= 0) p.facing = { x: dx, y: dy }; }
  if (p.dodging > 0) { dx = p.facing.x; dy = p.facing.y; }
  p.moving = Math.abs(dx) + Math.abs(dy) > .01;
  moveBody(p, dx * (p.dodging > 0 ? 510 : 158) * dt, dy * (p.dodging > 0 ? 510 : 158) * dt);
  p.dodging = Math.max(0, p.dodging - dt);
  if (input.attack) command(s, { type: 'attack' });
  if (p.combat === 0) p.hp = Math.min(stats(p).maxHp, p.hp + (inSafe(p.x, p.y) ? 9 : 1.5) * dt);
  const zone = zoneAt(p.x, p.y);
  if (!s.discovered.includes(zone.id)) {
    s.discovered.push(zone.id); giveXP(s, 12);
    emit(s, 'discovery', { name: zone.name });
  }
  for (const e of s.enemies) {
    const def = ENEMIES[e.type];
    if (e.mode === 'dead') {
      e.respawn -= dt;
      if (e.respawn <= 0 && distance(p, e) > 280) Object.assign(e, { hp: def.hp, x: e.homeX, y: e.homeY, mode: 'idle', cooldown: 1, windup: 0 });
      continue;
    }
    e.hit = Math.max(0, e.hit - dt); e.cooldown = Math.max(0, e.cooldown - dt);
    const d = distance(p, e), homeDistance = Math.hypot(e.x - e.homeX, e.y - e.homeY);
    const loseTarget = inSafe(p.x, p.y) || d > def.leash + 70 || homeDistance > def.leash;
    if (e.mode === 'windup') {
      if (loseTarget) { e.mode = 'return'; e.windup = 0; continue; }
      e.windup -= dt;
      if (e.windup <= 0) {
        if (d < (def.boss ? 100 : 45)) hurt(s, def.attack);
        if (def.boss) effect(s, 'slam', e.x, e.y);
        e.cooldown = def.cooldown; e.mode = 'chase';
      }
      continue;
    }
    if (e.mode === 'chase' && loseTarget) e.mode = 'return';
    if (e.mode === 'idle' && d < def.aggro && !inSafe(p.x, p.y)) e.mode = 'chase';
    if (e.mode === 'return') {
      if (homeDistance < 8) { e.mode = 'idle'; e.hp = def.hp; }
      else moveBody(e, (e.homeX - e.x) / homeDistance * def.speed * dt, (e.homeY - e.y) / homeDistance * def.speed * dt, def.radius);
    } else if (e.mode === 'chase') {
      e.facing = p.x < e.x ? -1 : 1;
      if (d < (def.boss ? 85 : 34) && e.cooldown === 0) { e.mode = 'windup'; e.windup = def.boss ? 1 : .5; }
      else if (d > 27) {
        const nx = e.x + (p.x - e.x) / d * def.speed * dt, ny = e.y + (p.y - e.y) / d * def.speed * dt;
        if (!inSafe(nx, ny)) moveBody(e, nx - e.x, ny - e.y, def.radius);
      }
    } else {
      e.timer += dt;
      if (e.timer > 2.5) { e.timer = 0; e.wander = random(s) * Math.PI * 2; }
      if (e.timer < .75 && e.wander !== undefined && homeDistance < 38) moveBody(e, Math.cos(e.wander) * 12 * dt, Math.sin(e.wander) * 12 * dt, def.radius);
      else if (homeDistance >= 38) e.mode = 'return';
    }
  }
  s.drops = s.drops.filter(drop => {
    drop.life -= dt;
    if (distance(drop, p) < 32) { addItem(s, drop.item); return false; }
    return drop.life > 0;
  });
  for (const fx of s.effects) fx.life -= dt;
  s.effects = s.effects.filter(fx => fx.life > 0);
}
