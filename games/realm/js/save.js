import { gearProfile } from './gear-rolls.js';
import { instance, instanceNumber, template, resolveItem, createItemInstance } from './item-instances.js';
import { tr } from './i18n.js';
import { createGame, stats } from './simulation.js';
import { ITEMS, QUESTS, SPAWN, CHECKPOINTS, xpForLevel } from './data.js';
import { respawnSeconds, spawnKey, placeAtHome } from './enemy-life.js';
import { blocked, LANDMARKS, sluiceOpen } from './world.js';
import { sanitizeTalents, availableTalentPoints } from './talents.js';
import { MERCHANTS, BUYBACK_LIMIT } from './trading.js';
import { MAX_STACK, EQUIPMENT_SLOTS, emptyEquipment, acceptsEquipment } from './inventory.js';
export const SAVE_KEY = 'hirrdirr.realm.save';
export const SAVE_VERSION = 6;
// A valid legacy bag can contain 999 copies of every template. Expansion into
// individual records must still fit export/import and recovery validation.
export const MAX_SAVE_BYTES = 8 * 1024 * 1024;
const MAX_INSTANCES = Object.values(ITEMS).filter(i => i.slot).length * 999 + 82;
const damaged = () => { throw new Error(tr('save.invalid_item_ownership')); };
const integer = (v, min, max, fallback) => Number.isFinite(v) ? Math.max(min, Math.min(max, Math.floor(v))) : fallback;
const idsOf = kind => LANDMARKS.filter(l => l.kind === kind).map(l => l.id);
const cleanList = (value, allowed) => Array.isArray(value) ? [...new Set(value.filter(v => allowed.includes(v)))] : [];
export function serialize(state) {
  const p = state.player;
  const respawns = state.enemies.filter(e => e.mode === 'dead').map(e => [spawnKey(e), e.respawn]);
  return JSON.stringify({ version: SAVE_VERSION, savedAt: new Date().toISOString(), data: {
    ...(respawns.length ? { respawns: Object.fromEntries(respawns) } : {}),
    player: { name: p.name, x: p.x, y: p.y, hp: p.hp, level: p.level, xp: p.xp, gold: p.gold, inventory: p.inventory, equipment: p.equipment, itemInstances: p.itemInstances, itemSequence: p.itemSequence, dead: p.dead, talents: p.talents, respecCount: p.respecCount, checkpoint: p.checkpoint, cooldowns: p.cooldowns },
    quests: state.quests, harvested: state.harvested, chests: state.chests, discovered: state.discovered, runes: state.runes,
    flags: state.flags, drops: state.drops, buyback: state.buyback, seed: state.seed, time: state.time
  } });
}
export function deserialize(raw) {
  if (typeof raw !== 'string' || raw.length > MAX_SAVE_BYTES) throw new Error(tr("save.the_save_file_is_empty_or_too_large"));
  const envelope = JSON.parse(raw);
  if (!envelope || !Number.isInteger(envelope.version)) throw new Error(tr("save.the_save_file_has_no_version_number"));
  if (envelope.version > SAVE_VERSION) {
    const error = new Error(tr("save.this_save_is_from_a_newer_version_it_has_been_left_untouched"));
    error.futureVersion = true; throw error;
  }
  // Prototype format v0 used the same stable content IDs but lacked discoveries.
  if (![0, 1, 2, 3, 4, 5, 6].includes(envelope.version)) throw new Error(tr("save.this_save_version_is_not_supported"));
  const d = envelope.data, old = d?.player;
  if (!d || !old || typeof old.name !== 'string' || !Number.isFinite(old.level) || !old.inventory || typeof old.inventory !== 'object' || Array.isArray(old.inventory)) throw new Error(tr("save.the_save_file_is_damaged"));
  const s = createGame(old.name), p = s.player;
  p.level = integer(old.level, 1, 20, 1);
  p.xp = p.level === 20 ? 0 : integer(old.xp, 0, xpForLevel(p.level) - 1, 0);
  p.gold = integer(old.gold, 0, 999999, 0);
  p.inventory = {}; p.equipment = emptyEquipment(); p.itemInstances = {}; p.itemSequence = 1;
  const seen = new Set(), modern = envelope.version >= 5;
  const claim = id => {
    if (!instance(p, id) || seen.has(id)) damaged();
    seen.add(id); return id;
  };
  if (modern) {
    if (!old.itemInstances || typeof old.itemInstances !== 'object' || Array.isArray(old.itemInstances) || Object.keys(old.itemInstances).length > MAX_INSTANCES) damaged();
    let highest = 0;
    for (const [id, record] of Object.entries(old.itemInstances)) {
      const number = instanceNumber(id);
      if (!number || record?.id !== id || !template(record.templateId)?.slot ||
          Object.keys(record).some(key => !['id', 'templateId', 'modifiers'].includes(key))) damaged();
      const profile = gearProfile(record.templateId, record.modifiers);
      if (!profile || (envelope.version === 5 && Object.keys(profile.delta).length)) damaged();
      p.itemInstances[id] = { id, templateId: record.templateId, modifiers: profile.delta };
      highest = Math.max(highest, number);
    }
    if (!Number.isSafeInteger(old.itemSequence) || old.itemSequence <= highest || old.itemSequence >= Number.MAX_SAFE_INTEGER) damaged();
    p.itemSequence = old.itemSequence;
    for (const [id, count] of Object.entries(old.inventory)) {
      if (instance(p, id)) { if (count !== 1) damaged(); p.inventory[claim(id)] = 1; }
      else {
        if (!template(id) || template(id).slot || !Number.isInteger(count) || count < 0 || count > 999) damaged();
        if (count) p.inventory[id] = count;
      }
    }
    if (!old.equipment || typeof old.equipment !== 'object' || Array.isArray(old.equipment) || Object.keys(old.equipment).some(k => !EQUIPMENT_SLOTS.includes(k))) damaged();
    for (const slot of EQUIPMENT_SLOTS) {
      const id = old.equipment[slot];
      if (id == null) continue;
      if (!acceptsEquipment(slot, instance(p, id)?.templateId)) damaged();
      p.equipment[slot] = claim(id);
    }
  } else {
    // First apply the pre-v4 shared-copy semantics, then mint each remaining
    // bag copy and each independently worn copy exactly once, in stable order.
    const counts = {};
    for (const id of Object.keys(ITEMS)) {
      const count = integer(old.inventory[id], 0, 999, 0);
      if (count) counts[id] = count;
    }
    for (const slot of EQUIPMENT_SLOTS) {
      const id = old.equipment?.[slot];
      if (!acceptsEquipment(slot, id)) continue;
      if (envelope.version < 4) {
        if (!counts[id]) continue;
        if (--counts[id] === 0) delete counts[id];
      }
      p.equipment[slot] = createItemInstance(p, id);
    }
    for (const [id, count] of Object.entries(counts)) {
      if (ITEMS[id].slot) for (let i = 0; i < count; i++) p.inventory[createItemInstance(p, id)] = 1;
      else p.inventory[id] = count;
    }
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
  s.harvested = cleanList(d.harvested, idsOf('herb'));
  s.chests = cleanList(d.chests, idsOf('chest'));
  s.runes = cleanList(d.runes, idsOf('rune'));
  s.discovered = cleanList(d.discovered, ['village', 'trail', 'forest', 'ruins', 'camp', 'marsh', 'reach']);
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
  if (Number.isFinite(old.x) && Number.isFinite(old.y) && !blocked(old.x, old.y, 11, sluiceOpen(s))) { p.x = old.x; p.y = old.y; }
  else Object.assign(p, CHECKPOINTS[p.checkpoint] || SPAWN);
  if (modern && (!Array.isArray(d.buyback) || d.buyback.length > BUYBACK_LIMIT || !Array.isArray(d.drops) || d.drops.length > 64)) damaged();
  if (envelope.version >= 3 && Array.isArray(d.buyback)) for (const entry of d.buyback.slice(0, BUYBACK_LIMIT)) {
    const item = modern ? resolveItem(p, entry?.item) : template(entry?.item);
    if (!entry || typeof entry.id !== 'string' || !/^sale-\d+$/.test(entry.id) || !item || !Object.hasOwn(MERCHANTS, entry.merchant)) { if (modern) damaged(); else continue; }
    const id = Number(entry.id.slice(5));
    if (!Number.isSafeInteger(id) || id < 1 || id > 1e9 || !item.value || item.questItem || s.buyback.some(e => e.id === entry.id)) { if (modern) damaged(); else continue; }
    const quantity = entry.quantity === undefined ? 1 : entry.quantity;
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > (item.slot ? 1 : MAX_STACK)) { if (modern) damaged(); else continue; }
    const ref = item.slot ? (modern ? claim(entry.item) : createItemInstance(p, entry.item)) : entry.item;
    s.buyback.push({ id: entry.id, merchant: entry.merchant, item: ref, price: item.value * quantity, ...(quantity > 1 ? { quantity } : {}) });
    s.tradeSequence = Math.max(s.tradeSequence, id + 1);
  }
  // Uncollected equipment is already an instance: pickup transfers that copy.
  if (Array.isArray(d.drops)) for (const drop of d.drops.slice(0, 64)) {
    const item = modern ? resolveItem(p, drop?.item) : template(drop?.item);
    if (!drop || !item || !Number.isFinite(drop.x) || !Number.isFinite(drop.y) || blocked(drop.x, drop.y, 2)) { if (modern) damaged(); else continue; }
    const ref = item.slot ? (modern ? claim(drop.item) : createItemInstance(p, drop.item)) : drop.item;
    s.drops.push({ id: ++s.sequence, x: drop.x, y: drop.y, item: ref, life: integer(drop.life, 1, 90, 90) });
  }
  // Ambiguous ownership is rejected as a whole. SaveStore retains the original
  // and tries its backup; it never silently deletes or clones an instance.
  if (modern && seen.size !== Object.keys(p.itemInstances).length) damaged();
  // Old saves have no remaining times. Story flags still count as quest credit.
  for (const e of s.enemies) {
    const remaining = d.respawns?.[spawnKey(e)];
    if (Number.isFinite(remaining) && remaining > 0) {
      Object.assign(e, { hp: 0, mode: 'dead', respawn: Math.min(remaining, respawnSeconds(e.type)) });
    } else placeAtHome(e, p);
  }
  return s;
}
export class SaveStore {
  constructor(storage) { this.storage = storage; this.blocked = false; this.message = ''; this.notice = ''; }
  readWithBackup(raw) {
    const state = deserialize(raw), version = JSON.parse(raw).version;
    if (version < SAVE_VERSION) {
      this.notice = version === 5 ? tr('save.rolls_migrated') : tr('save.equipment_migrated');
      if (version < 3) this.notice += ' ' + tr("save.your_journey_has_been_updated_three_talent_trees_replace_the_old", availableTalentPoints(state.player));
      try { if (!this.storage.getItem(SAVE_KEY + '.v' + version)) this.storage.setItem(SAVE_KEY + '.v' + version, raw); }
      catch { this.blocked = true; this.message = tr("save.you_can_play_your_older_journey_but_the_original_could_not_be_bac"); }
    }
    return state;
  }
  load() {
    try {
      const raw = this.storage.getItem(SAVE_KEY);
      if (!raw) return null;
      try {
        const state = this.readWithBackup(raw);
        return state;
      }
      catch (error) {
        if (error.futureVersion) { this.blocked = true; this.message = error.message; return null; }
        // Preserve the original before any future autosave can replace it.
        this.storage.setItem(SAVE_KEY + '.recovery', raw);
        const backup = this.storage.getItem(SAVE_KEY + '.backup');
        if (backup) {
          try { const state = this.readWithBackup(backup); if (!this.blocked) this.message = tr("save.a_damaged_save_was_restored_from_the_backup"); return state; }
          catch { /* Keep both originals for manual recovery. */ }
        }
        this.blocked = true;
        this.message = tr("save.the_save_could_not_be_read_the_original_is_preserved_you_can_play");
        return null;
      }
    } catch {
      this.message = tr("save.your_browser_is_blocking_local_saves_export_your_journey_from_the");
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
    } catch { this.message = tr("save.could_not_save_locally_export_your_journey_from_the_menu"); return false; }
  }
  // Called only after the player confirms an import or a new journey.
  replace(state, importedRaw = null) {
    const wasBlocked = this.blocked;
    try {
      // Keep the exact imported legacy file as well as the current local journey.
      if (importedRaw !== null) {
        const version = JSON.parse(importedRaw).version;
        if (version < SAVE_VERSION) this.storage.setItem(SAVE_KEY + '.import.v' + version, importedRaw);
      }
      const original = this.storage.getItem(SAVE_KEY);
      if (original) this.storage.setItem(SAVE_KEY + '.recovery', original);
      this.blocked = false;
      if (this.save(state)) return true;
    } catch { this.message = tr("save.could_not_replace_the_save"); }
    this.blocked = wasBlocked; return false;
  }
}
