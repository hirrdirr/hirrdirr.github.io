import { createGame, stats } from './simulation.js';
import { ITEMS, QUESTS, SPAWN, ENEMIES, CHECKPOINTS, xpForLevel } from './data.js';
import { blocked, LANDMARKS } from './world.js';
import { sanitizeTalents, availableTalentPoints } from './talents.js';
import { MERCHANTS, BUYBACK_LIMIT } from './trading.js';
export const SAVE_KEY = 'hirrdirr.realm.save';
export const SAVE_VERSION = 3;
const MAX_BYTES = 262144;
const integer = (v, min, max, fallback) => Number.isFinite(v) ? Math.max(min, Math.min(max, Math.floor(v))) : fallback;
const idsOf = kind => LANDMARKS.filter(l => l.kind === kind).map(l => l.id);
const cleanList = (value, allowed) => Array.isArray(value) ? [...new Set(value.filter(v => allowed.includes(v)))] : [];
export function serialize(state) {
  const p = state.player;
  return JSON.stringify({ version: SAVE_VERSION, savedAt: new Date().toISOString(), data: {
    player: { name: p.name, x: p.x, y: p.y, hp: p.hp, level: p.level, xp: p.xp, gold: p.gold, inventory: p.inventory, equipment: p.equipment, dead: p.dead, talents: p.talents, respecCount: p.respecCount, checkpoint: p.checkpoint, cooldowns: p.cooldowns },
    quests: state.quests, harvested: state.harvested, chests: state.chests, discovered: state.discovered, runes: state.runes,
    flags: state.flags, drops: state.drops, buyback: state.buyback, seed: state.seed, time: state.time
  } });
}
export function deserialize(raw) {
  if (typeof raw !== 'string' || raw.length > MAX_BYTES) throw new Error('Sparfilen är för stor eller saknar innehåll.');
  const envelope = JSON.parse(raw);
  if (!envelope || !Number.isInteger(envelope.version)) throw new Error('Sparfilen saknar versionsnummer.');
  if (envelope.version > SAVE_VERSION) {
    const error = new Error('Sparfilen kommer från en nyare version. Den lämnas orörd.');
    error.futureVersion = true; throw error;
  }
  // Prototype format v0 used the same stable content IDs but lacked discoveries.
  if (![0, 1, 2, 3].includes(envelope.version)) throw new Error('Den här sparversionen stöds inte.');
  const d = envelope.data, old = d?.player;
  if (!d || !old || typeof old.name !== 'string' || !Number.isFinite(old.level) || !old.inventory || typeof old.inventory !== 'object' || Array.isArray(old.inventory)) throw new Error('Sparfilen är skadad.');
  const s = createGame(old.name), p = s.player;
  p.level = integer(old.level, 1, 20, 1);
  p.xp = p.level === 20 ? 0 : integer(old.xp, 0, xpForLevel(p.level) - 1, 0);
  p.gold = integer(old.gold, 0, 999999, 0);
  p.inventory = {};
  for (const id of Object.keys(ITEMS)) {
    const count = integer(old.inventory[id], 0, 999, 0);
    if (count) p.inventory[id] = count;
  }
  p.equipment = { weapon: null, armor: null, charm: null };
  // Pre-trading saves could not sell these items. v3 must never recreate sold gear.
  if (envelope.version < 3) {
    p.inventory.trainingSword = Math.max(1, p.inventory.trainingSword || 0);
    p.inventory.linenCoat = Math.max(1, p.inventory.linenCoat || 0);
    p.equipment.weapon = 'trainingSword'; p.equipment.armor = 'linenCoat';
  }
  for (const slot of ['weapon', 'armor', 'charm']) {
    const id = old.equipment?.[slot];
    if (Object.hasOwn(ITEMS, id) && ITEMS[id].slot === slot && p.inventory[id]) p.equipment[slot] = id;
  }
  p.talents = envelope.version >= 3 ? sanitizeTalents(old.talents, p.level) : {};
  p.respecCount = integer(old.respecCount, 0, 999999, 0);
  p.checkpoint = Object.hasOwn(CHECKPOINTS, old.checkpoint) ? old.checkpoint : 'village';
  for (const [key, max] of Object.entries({ attack: .42, burst: 5, dodge: 2.5, potion: 8, guard: 14, rush: 12, bolt: 4 })) {
    const value = old.cooldowns?.[key];
    p.cooldowns[key] = Number.isFinite(value) ? Math.max(0, Math.min(max, value)) : 0;
  }
  p.hp = integer(old.hp, 0, stats(p).maxHp, stats(p).maxHp);
  p.dead = old.dead === true || p.hp === 0;
  if (Number.isFinite(old.x) && Number.isFinite(old.y) && !blocked(old.x, old.y)) { p.x = old.x; p.y = old.y; }
  else Object.assign(p, CHECKPOINTS[p.checkpoint] || SPAWN);
  s.harvested = cleanList(d.harvested, idsOf('herb'));
  s.chests = cleanList(d.chests, idsOf('chest'));
  s.runes = cleanList(d.runes, idsOf('rune'));
  s.discovered = cleanList(d.discovered, ['village', 'trail', 'forest', 'ruins', 'camp', 'marsh']);
  if (!s.discovered.includes('village')) s.discovered.unshift('village');
  s.flags.wardenDefeated = d.flags?.wardenDefeated === true;
  s.flags.beaconLit = s.flags.wardenDefeated && d.flags?.beaconLit === true;
  s.flags.ancientDefeated = d.flags?.ancientDefeated === true;
  s.flags.sealRestored = s.flags.ancientDefeated && d.flags?.sealRestored === true;
  for (const id of Object.keys(QUESTS)) {
    const q = d.quests?.[id];
    if (!q || !['active', 'done'].includes(q.status)) continue;
    s.quests[id] = { status: q.status, progress: QUESTS[id].objectives.map((o, i) => q.status === 'done' ? o.count : integer(q.progress?.[i], 0, o.count, 0)) };
  }
  s.seed = integer(d.seed, 0, 4294967295, s.seed);
  s.time = integer(d.time, 0, 100000000, 0);
  if (envelope.version >= 3 && Array.isArray(d.buyback)) for (const entry of d.buyback.slice(0, BUYBACK_LIMIT)) {
    if (!entry || typeof entry.id !== 'string' || !/^sale-\d+$/.test(entry.id) || !Object.hasOwn(ITEMS, entry.item) || !Object.hasOwn(MERCHANTS, entry.merchant)) continue;
    const id = Number(entry.id.slice(5)), item = ITEMS[entry.item];
    if (!Number.isSafeInteger(id) || id < 1 || id > 1e9 || !item.value || item.questItem || s.buyback.some(e => e.id === entry.id)) continue;
    s.buyback.push({ id: entry.id, merchant: entry.merchant, item: entry.item, price: item.value });
    s.tradeSequence = Math.max(s.tradeSequence, id + 1);
  }
  // Uncollected rewards survive closing the tab, including a defeated boss's loot.
  if (Array.isArray(d.drops)) for (const drop of d.drops.slice(0, 64)) {
    if (!drop || !Object.hasOwn(ITEMS, drop.item) || !Number.isFinite(drop.x) || !Number.isFinite(drop.y) || blocked(drop.x, drop.y, 2)) continue;
    s.drops.push({ id: ++s.sequence, x: drop.x, y: drop.y, item: drop.item, life: integer(drop.life, 1, 90, 90) });
  }
  for (const e of s.enemies) if (ENEMIES[e.type].flag && s.flags[ENEMIES[e.type].flag]) Object.assign(e, { hp: 0, mode: 'dead', respawn: Infinity });
  return s;
}
export class SaveStore {
  constructor(storage) { this.storage = storage; this.blocked = false; this.message = ''; this.notice = ''; }
  load() {
    try {
      const raw = this.storage.getItem(SAVE_KEY);
      if (!raw) return null;
      try {
        const state = deserialize(raw);
        const version = JSON.parse(raw).version;
        if (version < SAVE_VERSION) {
          this.notice = `Din resa har uppdaterats. Den gamla inriktningen ersätts av tre talentträd. Du har ${availableTalentPoints(state.player)} poäng att fördela med N.`;
          try { if (!this.storage.getItem(SAVE_KEY + '.v' + version)) this.storage.setItem(SAVE_KEY + '.v' + version, raw); }
          catch { this.blocked = true; this.message = 'Din äldre resa kan spelas, men originalet kunde inte säkerhetskopieras. Exportera resan via menyn.'; }
        }
        return state;
      }
      catch (error) {
        if (error.futureVersion) { this.blocked = true; this.message = error.message; return null; }
        // Preserve the original before any future autosave can replace it.
        this.storage.setItem(SAVE_KEY + '.recovery', raw);
        const backup = this.storage.getItem(SAVE_KEY + '.backup');
        if (backup) {
          try { const state = deserialize(backup); this.message = 'En skadad sparning återställdes från säkerhetskopian.'; return state; }
          catch { /* Keep both originals for manual recovery. */ }
        }
        this.blocked = true;
        this.message = 'Sparningen kunde inte läsas. Originalet är bevarat. Du kan spela tillfälligt eller importera en säkerhetskopia i menyn.';
        return null;
      }
    } catch {
      this.message = 'Webbläsaren blockerar lokal sparning. Exportera din resa via menyn innan du stänger.';
      return null;
    }
  }
  save(state) {
    if (this.blocked) return false;
    try {
      const previous = this.storage.getItem(SAVE_KEY);
      if (previous) {
        try { deserialize(previous); this.storage.setItem(SAVE_KEY + '.backup', previous); }
        catch { this.storage.setItem(SAVE_KEY + '.recovery', previous); }
      }
      this.storage.setItem(SAVE_KEY, serialize(state));
      this.message = ''; return true;
    } catch { this.message = 'Kunde inte spara lokalt. Exportera din resa via menyn.'; return false; }
  }
  // Called only after the player confirms an import or a new journey.
  replace(state) {
    const wasBlocked = this.blocked;
    try {
      const original = this.storage.getItem(SAVE_KEY);
      if (original) this.storage.setItem(SAVE_KEY + '.recovery', original);
      this.blocked = false;
      if (this.save(state)) return true;
    } catch { this.message = 'Kunde inte ersätta sparningen.'; }
    this.blocked = wasBlocked; return false;
  }
}
