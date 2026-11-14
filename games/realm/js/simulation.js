import { tr } from './i18n.js';
// Pure game rules. No DOM, Canvas, storage, clocks or network access.
// Clients send commands; step() advances a fixed tick and emits presentation events.
import { ITEMS, ENEMIES, QUESTS, NPCS, SPAWN, CHECKPOINTS, LOOT_TABLES, xpForLevel } from './data.js';
import { distance, inSafe, moveBody, blocked, lineClear, LANDMARKS, ENEMY_SPAWNS, zoneAt } from './world.js';
import { stepEnemies } from './enemy-ai.js';
import { talentEffects, talentRank, learnTalent, talentRequirement, spentTalentPoints, respecCost } from './talents.js';
import { capacityReason, bundleCapacityReason, MAX_GOLD } from './inventory.js';
import { transact } from './trading.js';
export const TICK = 1 / 60;
export function stats(player) {
  const result = { maxHp: 100 + (player.level - 1) * 16, attack: 9 + (player.level - 1) * 2, defense: Math.floor((player.level - 1) / 2), speed: 158, haste: 0, dodgeCooldown: 2.5 };
  const talents = talentEffects(player);
  let spellPower = 0;
  for (const item of [...Object.values(player.equipment).map(id => ITEMS[id]), talents]) {
    if (item) { result.maxHp += item.hp || 0; result.attack += item.attack || 0; result.defense += item.defense || 0; result.haste += item.haste || 0; result.speed += item.speed || 0; result.dodgeCooldown -= item.recovery || 0; }
    spellPower += item?.spellPower || 0;
  }
  result.attackCooldown = .42 / (1 + result.haste);
  Object.assign(result, {
    meleeMultiplier: 1 + (talents.meleeBonus || 0), comboMultiplier: 1.35 + (talents.comboBonus || 0),
    critChance: talents.critChance || 0, critMultiplier: 1.5 + (talents.critPower || 0),
    burstMultiplier: 1.8 * (1 + (talents.burstBonus || 0) + spellPower), burstRadius: 100 + (talents.burstRadius || 0),
    burstCooldown: 5 / (1 + (talents.magicHaste || 0)), burstHealing: (talents.burstHealing || 0) + result.maxHp * (talents.burstHealPercent || 0),
    boltMultiplier: 1.5 * (1 + (talents.boltBonus || 0) + spellPower), boltCooldown: 4 / (1 + (talents.magicHaste || 0)), boltPierce: talents.boltPierce || 0,
    guardDuration: 4 + (talents.guardDuration || 0), guardReduction: .4 + (talents.guardReduction || 0), guardCooldown: 14 - (talents.guardRecovery || 0),
    rushCooldown: 12, potionHealing: 55 + (talents.potionHealing || 0),
    retaliation: Boolean(talents.retaliation), dance: Boolean(talents.dance), killHealing: talents.killHealing || 0
  });
  return result;
}
export function createGame(name = tr("simulation.wanderer")) {
  const state = {
    time: 0, seed: 784533, sequence: 0, events: [], drops: [], effects: [], projectiles: [], playerShots: [], hazards: [], targetId: null,
    buyback: [], tradeSequence: 1, bagNotice: 0,
    player: { name: name.trim().slice(0, 18) || tr("simulation.wanderer"), ...SPAWN, hp: 100, level: 1, xp: 0, gold: 0, facing: { x: 0, y: 1 }, moveFacing: { x: 0, y: 1 }, dodgeDirection: { x: 0, y: 1 },
      inventory: { trainingSword: 1, linenCoat: 1, potion: 3 }, equipment: { weapon: 'trainingSword', armor: 'linenCoat', charm: null },
      cooldowns: { attack: 0, burst: 0, dodge: 0, potion: 0, guard: 0, rush: 0, bolt: 0 }, talents: {}, respecCount: 0, guardTime: 0, counterTime: 0, checkpoint: 'village', combo: 0, comboTime: 0, invulnerable: 0, dodging: 0, attackTime: 0, moving: false, combat: 0, dead: false },
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
  if (capacityReason(s.player, id, quantity)) return false;
  s.player.inventory[id] = (s.player.inventory[id] || 0) + quantity;
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
    effect(s, 'level', p.x, p.y, tr("simulation.level", p.level));
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
  const reason = bundleCapacityReason(s.player, QUESTS[id].rewards.items);
  if (reason) { emit(s, 'message', { text: tr("simulation.your_reward_will_stay_here", reason) }); return false; }
  s.quests[id].status = 'done'; // Commit before rewarding: repeated commands cannot duplicate rewards.
  const rewards = QUESTS[id].rewards;
  giveXP(s, rewards.xp);
  s.player.gold = Math.min(MAX_GOLD, s.player.gold + rewards.gold);
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
    emit(s, 'message', { text: tr("simulation.glimmerherb_gathered_3", s.harvested.length) });
  } else if (target.kind === 'chest') {
    const reason = capacityReason(s.player, target.item, target.quantity);
    if (reason) { emit(s, 'message', { text: tr("simulation.the_cache_is_left_untouched", reason) }); return false; }
    s.chests.push(target.id);
    s.player.gold = Math.min(MAX_GOLD, s.player.gold + 12);
    addItem(s, target.item, target.quantity);
    giveXP(s, 15);
    emit(s, 'message', { text: tr("simulation.cache_discovered_12_gold_15_xp") });
  } else if (target.kind === 'beacon') {
    if (!s.flags.wardenDefeated) emit(s, 'message', { text: tr("simulation.the_wardens_roots_keep_the_beacon_dark") });
    else if (!s.flags.beaconLit) {
      s.flags.beaconLit = true;
      questEvent(s, 'beacon', 'beacon');
      emit(s, 'beacon');
      effect(s, 'level', target.x, target.y, tr("simulation.the_light_has_returned"));
    } else emit(s, 'message', { text: tr("simulation.the_beacon_shines_over_lantern_vale_once_more") });
  } else if (target.kind === 'fire') {
    s.player.hp = stats(s.player).maxHp;
    s.player.checkpoint = target.id === 'campfire' ? 'camp' : 'village';
    emit(s, 'checkpoint', { name: target.id === 'campfire' ? tr("world.wanderers_camp") : tr("world.lantern_vale") });
  } else if (target.kind === 'rune') {
    if (!s.runes.includes(target.id)) { s.runes.push(target.id); giveXP(s, 18); questEvent(s, 'rune', 'ember'); emit(s, 'rune'); }
    emit(s, 'message', { text: target.text });
  } else if (target.kind === 'seal') {
    if (!s.flags.ancientDefeated) emit(s, 'message', { text: tr("simulation.fenhearts_embers_hold_the_seal_open") });
    else if (!s.flags.sealRestored) {
      s.flags.sealRestored = true; questEvent(s, 'seal', 'seal'); emit(s, 'seal');
      effect(s, 'level', target.x, target.y, tr("simulation.the_fen_breathes_again"));
    } else emit(s, 'message', { text: tr("simulation.the_seal_glows_softly_the_road_beyond_the_sluice_must_wait") });
  } else if (target.kind === 'gate') emit(s, 'message', { text: tr("simulation.beyond_the_sluice_lie_the_ashlands_your_journey_will_continue_in") });
  else emit(s, 'message', { text: target.id === 'marshSign' ? tr("simulation.old_beacon_signes_camp_emberfen_level_4_6") : tr("simulation.lantern_vale_bridge_old_beacon_to_the_northeast") });
  return true;
}
function kill(s, enemy) {
  const def = ENEMIES[enemy.type];
  enemy.hp = 0; enemy.mode = 'dead'; enemy.respawn = def.boss ? Infinity : 28;
  giveXP(s, def.xp);
  s.player.gold = Math.min(MAX_GOLD, s.player.gold + def.gold);
  heal(s, stats(s.player).killHealing);
  questEvent(s, 'kill', enemy.type);
  if (def.flag) s.flags[def.flag] = true;
  s.hazards = s.hazards.filter(h => h.owner !== enemy.id);
  s.projectiles = s.projectiles.filter(shot => shot.owner !== enemy.id);
  if (s.targetId === enemy.id) s.targetId = null;
  const table = LOOT_TABLES[enemy.type];
  let roll = random(s) * table.reduce((sum, [, weight]) => sum + weight, 0), item = table[0][0];
  for (const [id, weight] of table) { roll -= weight; if (roll < 0) { item = id; break; } }
  s.drops.push({ id: ++s.sequence, x: enemy.x, y: enemy.y, item, life: 90 });
  if (s.drops.length > 64) s.drops.shift();
  emit(s, 'kill', { typeId: enemy.type, xp: def.xp, gold: def.gold });
  effect(s, 'xp', enemy.x, enemy.y - 16, '+' + def.xp + ' XP');
}
function heal(s, amount) {
  if (amount <= 0 || s.player.dead) return;
  const p = s.player, restored = Math.min(Math.round(amount), stats(p).maxHp - p.hp);
  if (restored <= 0) return;
  p.hp += restored; effect(s, 'heal', p.x, p.y - 24, '+' + Math.round(restored));
}
function combatTargets(s, reach) {
  const p = s.player;
  return s.enemies.filter(e => e.hp > 0 && e.mode !== 'return' && distance(p, e) <= reach + ENEMIES[e.type].radius && lineClear(p, e))
    .sort((a, b) => (b.id === s.targetId) - (a.id === s.targetId) || distance(p, a) - distance(p, b));
}
function hitEnemy(s, e, power, critChance = 0, critMultiplier = 1.5) {
  if (e.hp <= 0 || e.mode === 'return') return;
  if (e.mode === 'idle') e.mode = 'chase';
  const critical = critChance > 0 && random(s) < critChance;
  const damage = Math.max(1, Math.round(power * (critical ? critMultiplier : 1)));
  e.hp -= damage; e.hit = .15;
  effect(s, critical ? 'critical' : 'damage', e.x, e.y - 24, String(damage) + (critical ? '!' : ''));
  effect(s, 'impact', e.x, e.y - 18);
  if (critical) emit(s, 'critical');
  if (e.hp <= 0) kill(s, e);
}
function attack(s, burst) {
  const p = s.player, st = stats(p), key = burst ? 'burst' : 'attack';
  if (p.cooldowns[key] > 0 || p.dodging > 0) return false;
  p.cooldowns[key] = burst ? st.burstCooldown : st.attackCooldown;
  p.attackTime = .2; p.combat = 5;
  const targets = combatTargets(s, burst ? st.burstRadius : 65);
  if (targets.length) {
    const nearest = targets[0], d = distance(p, nearest) || 1;
    p.facing = { x: (nearest.x - p.x) / d, y: (nearest.y - p.y) / d };
  }
  if (!burst) { p.combo = targets.length ? (p.comboTime > 0 ? p.combo % 3 : 0) + 1 : 0; p.comboTime = targets.length ? 1.1 : 0; }
  const finisher = !burst && p.combo === 3, counter = !burst && targets.length > 0 && p.counterTime > 0;
  effect(s, burst ? 'burst' : finisher ? 'finisher' : 'slash', p.x, p.y, '', { angle: Math.atan2(p.facing.y, p.facing.x), radius: st.burstRadius });
  for (const e of (burst ? targets : targets.slice(0, 1))) {
    const def = ENEMIES[e.type];
    if (burst && !def.boss) { e.windup = 0; e.cooldown = Math.max(e.cooldown, .8); e.mode = 'chase'; }
    else if (!['windup', 'pounce'].includes(e.mode)) e.mode = 'chase';
    if (!def.boss && (burst || finisher)) {
      const d = distance(p, e) || 1; moveBody(e, (e.x - p.x) / d * 14, (e.y - p.y) / d * 14, def.radius);
    }
    if (!burst) s.targetId = e.id;
    const multiplier = burst ? st.burstMultiplier : st.meleeMultiplier * (finisher ? st.comboMultiplier : 1) * (counter ? 1.5 : 1);
    hitEnemy(s, e, st.attack * multiplier, burst ? 0 : st.critChance, st.critMultiplier);
  }
  if (counter) p.counterTime = 0;
  if (burst && targets.length) heal(s, st.burstHealing);
  if (finisher && targets.length && st.dance) {
    p.cooldowns.rush = Math.max(0, p.cooldowns.rush - 2);
    p.cooldowns.dodge = Math.max(0, p.cooldowns.dodge - .5);
  }
  emit(s, burst ? 'burst' : finisher ? 'finisher' : 'attack', { hit: targets.length > 0 });
  return true;
}
function castAbility(s, id) {
  const p = s.player, st = stats(p);
  if (!talentRank(p, id) || p.cooldowns[id] > 0 || p.dodging > 0) return false;
  if (id !== 'guard' && inSafe(p.x, p.y)) {
    emit(s, 'message', { text: tr("simulation.leave_the_safe_area_to_use", id === 'rush' ? tr("simulation.shadow_rush") : tr("simulation.glimmerbolt")) }); return false;
  }
  if (id === 'guard') {
    p.guardTime = st.guardDuration; p.cooldowns.guard = st.guardCooldown;
    effect(s, 'guard', p.x, p.y, '', { radius: 34 });
  } else if (id === 'rush') {
    const target = combatTargets(s, 210)[0];
    if (!target) { emit(s, 'message', { text: tr("simulation.shadow_rush_needs_a_target_in_range_and_a_clear_line_of_sight") }); return false; }
    const d = distance(p, target) || 1, fromX = p.x, fromY = p.y, travel = Math.max(0, d - 30);
    p.cooldowns.rush = st.rushCooldown; p.facing = { x: (target.x - p.x) / d, y: (target.y - p.y) / d };
    moveBody(p, p.facing.x * travel, p.facing.y * travel);
    p.invulnerable = Math.max(p.invulnerable, .28); p.attackTime = .2; s.targetId = target.id;
    effect(s, 'rush', p.x, p.y, '', { fromX, fromY });
    if (distance(p, target) <= 55 && lineClear(p, target)) hitEnemy(s, target, st.attack * 1.4 * st.meleeMultiplier, st.critChance, st.critMultiplier);
  } else if (id === 'bolt') {
    if (s.playerShots.length >= 6) return false;
    const target = combatTargets(s, 360)[0];
    if (target) { const d = distance(p, target) || 1; p.facing = { x: (target.x - p.x) / d, y: (target.y - p.y) / d }; s.targetId = target.id; }
    p.cooldowns.bolt = st.boltCooldown;
    s.playerShots.push({ x: p.x, y: p.y, vx: p.facing.x * 360, vy: p.facing.y * 360, life: 1,
      power: st.attack * st.boltMultiplier, critChance: st.critChance, critMultiplier: st.critMultiplier,
      remaining: 1 + st.boltPierce, hit: [] });
  }
  p.combat = 5; emit(s, id); return true;
}
function stepPlayerShots(s, dt) {
  s.playerShots = s.playerShots.filter(shot => {
    shot.life -= dt;
    const steps = Math.max(1, Math.ceil(Math.hypot(shot.vx, shot.vy) * dt / 5));
    for (let i = 0; i < steps; i++) {
      shot.x += shot.vx * dt / steps; shot.y += shot.vy * dt / steps;
      if (blocked(shot.x, shot.y, 3)) return false;
      for (const enemy of s.enemies) if (enemy.hp > 0 && enemy.mode !== 'return' && !shot.hit.includes(enemy.id) && distance(shot, enemy) <= ENEMIES[enemy.type].radius + 5) {
        shot.hit.push(enemy.id); hitEnemy(s, enemy, shot.power, shot.critChance, shot.critMultiplier);
        if (--shot.remaining <= 0) return false;
      }
    }
    return shot.life > 0;
  });
}
function hurt(s, amount) {
  const p = s.player, st = stats(p);
  if (p.invulnerable > 0 || p.dead || inSafe(p.x, p.y)) return;
  const damage = Math.max(1, Math.round(Math.max(1, amount - st.defense) * (p.guardTime > 0 ? 1 - st.guardReduction : 1)));
  p.hp = Math.max(0, p.hp - damage); p.invulnerable = .35; p.combat = 7;
  if (p.guardTime > 0 && st.retaliation) p.counterTime = 5;
  effect(s, 'hurt', p.x, p.y - 28, '-' + damage); emit(s, 'hurt');
  if (p.hp <= 0) { p.dead = true; p.moving = false; p.guardTime = 0; p.counterTime = 0; s.playerShots = []; emit(s, 'death'); }
}
export function command(s, input) {
  const p = s.player;
  if (input.type === 'respawn' && p.dead) {
    Object.assign(p, CHECKPOINTS[p.checkpoint] || SPAWN, { hp: stats(p).maxHp, dead: false, invulnerable: 2, dodging: 0, combat: 0, combo: 0, comboTime: 0, guardTime: 0, counterTime: 0 });
    s.playerShots = []; s.hazards = []; s.projectiles = []; s.targetId = null;
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
    case 'learnTalent': {
      const reason = talentRequirement(p, input.id);
      if (reason) { emit(s, 'message', { text: reason }); return false; }
      if (!learnTalent(p, input.id)) return false;
      p.hp = Math.min(p.hp, stats(p).maxHp); emit(s, 'talent', { id: input.id }); return true;
    }
    case 'respec': {
      if (!nearNpc(s, 'mira') || p.combat > 0 || !spentTalentPoints(p) || p.gold < respecCost(p) || input.confirm !== true) return false;
      p.gold -= respecCost(p); p.talents = {}; p.respecCount++; p.guardTime = 0; p.counterTime = 0; s.playerShots = [];
      p.hp = Math.min(p.hp, stats(p).maxHp); emit(s, 'respec'); return true;
    }
    case 'guard': case 'rush': case 'bolt': return castAbility(s, input.type);
    case 'attack': return attack(s, false);
    case 'burst': return attack(s, true);
    case 'dodge':
      if (p.cooldowns.dodge > 0) return false;
      p.cooldowns.dodge = stats(p).dodgeCooldown; p.dodging = .18; p.invulnerable = .28;
      p.dodgeDirection = { ...(p.moving ? p.moveFacing : p.facing) }; p.facing = { ...p.dodgeDirection };
      emit(s, 'dodge'); return true;
    case 'potion':
      if (!p.inventory.potion || p.cooldowns.potion > 0 || p.hp >= stats(p).maxHp) return false;
      p.inventory.potion--; heal(s, stats(p).potionHealing); p.cooldowns.potion = 8;
      emit(s, 'heal'); return true;
    case 'interact': return interact(s);
    case 'accept': return acceptQuest(s, input.id);
    case 'complete': return completeQuest(s, input.id);
    case 'equip': return equip(s, input.id);
    case 'unequip': {
      if (!Object.hasOwn(p.equipment, input.slot) || !p.equipment[input.slot]) return false;
      const id = p.equipment[input.slot]; p.equipment[input.slot] = null;
      p.hp = Math.min(p.hp, stats(p).maxHp); emit(s, 'unequip', { id }); return true;
    }
    case 'buy': case 'sell': case 'buyback': {
      const result = transact(s, input);
      if (!result.ok) { emit(s, 'message', { text: result.reason }); return false; }
      emit(s, 'trade', { action: result.type, id: result.item, price: result.price }); return true;
    }
    default: return false;
  }
}
export function step(s, input = {}, dt = TICK) {
  if (!Number.isFinite(dt) || dt <= 0 || dt > .05 || s.player.dead) return;
  s.time += dt;
  const p = s.player;
  for (const key of Object.keys(p.cooldowns)) p.cooldowns[key] = Math.max(0, p.cooldowns[key] - dt);
  for (const key of ['invulnerable', 'attackTime', 'combat', 'comboTime', 'guardTime', 'counterTime']) p[key] = Math.max(0, p[key] - dt);
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
  stepPlayerShots(s, dt);
  stepEnemies(s, dt, { random, hurt, effect });
  s.bagNotice = Math.max(0, s.bagNotice - dt);
  if (s.targetId && !s.enemies.some(e => e.id === s.targetId && e.hp > 0 && distance(p, e) < 370)) s.targetId = null;
  s.drops = s.drops.filter(drop => {
    drop.life -= dt;
    if (!p.dead && distance(drop, p) < 32) {
      if (addItem(s, drop.item)) return false;
      drop.life = Math.max(3, drop.life);
      if (s.bagNotice === 0) { emit(s, 'message', { text: capacityReason(p, drop.item) }); s.bagNotice = 4; }
    }
    return drop.life > 0;
  });
  for (const fx of s.effects) fx.life -= dt;
  s.effects = s.effects.filter(fx => fx.life > 0);
}
