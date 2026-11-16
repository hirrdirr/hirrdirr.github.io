import { tr } from './i18n.js';
import { ITEMS } from './data.js';
export const BAG_SLOTS = 16;
export const MAX_STACK = 999;
export const MAX_GOLD = 999999;
// Each slot owns one copy; inventory counts only copies carried in the bag.
export const EQUIPMENT_DEFINITIONS = Object.freeze({
  weapon: { category: 'weapon', label: 'ui.weapon', icon: 'sword' },
  armor: { category: 'armor', label: 'ui.armor', icon: 'armor' },
  charm: { category: 'charm', label: 'ui.charm', icon: 'charm' },
  head: { category: 'head', label: 'equipment.head', icon: 'helm' },
  shoulders: { category: 'shoulders', label: 'equipment.shoulders', icon: 'shoulders' },
  hands: { category: 'hands', label: 'equipment.hands', icon: 'gloves' },
  legs: { category: 'legs', label: 'equipment.legs', icon: 'leggings' },
  feet: { category: 'feet', label: 'equipment.feet', icon: 'boots' },
  ring1: { category: 'ring', label: 'equipment.ring1', icon: 'band' },
  ring2: { category: 'ring', label: 'equipment.ring2', icon: 'band' }
});
export const EQUIPMENT_SLOTS = Object.freeze(Object.keys(EQUIPMENT_DEFINITIONS));
export const equipmentLabel = slot => Object.hasOwn(EQUIPMENT_DEFINITIONS, slot) ? tr(EQUIPMENT_DEFINITIONS[slot].label) : '';
export const acceptsEquipment = (slot, id) => typeof id === 'string' && Object.hasOwn(ITEMS, id) &&
  typeof slot === 'string' && Object.hasOwn(EQUIPMENT_DEFINITIONS, slot) && ITEMS[id].slot === EQUIPMENT_DEFINITIONS[slot].category;
export const compatibleSlots = id => EQUIPMENT_SLOTS.filter(slot => acceptsEquipment(slot, id));
// Existing single-slot commands keep working. Ring UI always sends an explicit target.
export function equipmentTarget(p, id, requested) {
  if (requested !== undefined) return requested;
  const slots = compatibleSlots(id);
  return slots.find(slot => !p.equipment[slot]) || slots[0];
}
export const emptyEquipment = () => Object.fromEntries(EQUIPMENT_SLOTS.map(slot => [slot, null]));
export function transferEquipment(p, slot, nextId = null) {
  const fail = reason => ({ ok: false, reason });
  if (!EQUIPMENT_SLOTS.includes(slot) || p.dead) return fail(tr('inventory.cannot_change_equipment'));
  const previous = p.equipment[slot];
  if (previous && !acceptsEquipment(slot, previous)) return fail(tr('inventory.invalid_item'));
  if (nextId !== null && (!acceptsEquipment(slot, nextId) || !(p.inventory[nextId] > 0))) return fail(tr('inventory.item_not_in_bag'));
  if (nextId === null && !previous) return fail(tr('inventory.slot_is_empty'));
  // Stage both transfers. Removing the new item may free a slot for the old one.
  const inventory = { ...p.inventory };
  if (nextId !== null && --inventory[nextId] === 0) delete inventory[nextId];
  if (previous) {
    const reason = capacityReason({ inventory }, previous);
    if (reason) return fail(tr('inventory.cannot_return_equipment', ITEMS[previous].name, reason));
    inventory[previous] = (inventory[previous] || 0) + 1;
  }
  p.inventory = inventory;
  p.equipment = { ...p.equipment, [slot]: nextId };
  return { ok: true, id: nextId || previous };
}
export const occupiedSlots = p => Object.entries(p.inventory).filter(([id, n]) => Object.hasOwn(ITEMS, id) && n > 0).length;
export function capacityReason(p, id, count = 1) {
  if (!Object.hasOwn(ITEMS, id) || !Number.isInteger(count) || count < 1) return tr("inventory.invalid_item");
  if ((p.inventory[id] || 0) + count > MAX_STACK) return tr("inventory.this_stack_is_full");
  if (!p.inventory[id] && occupiedSlots(p) >= BAG_SLOTS) return tr("inventory.your_bag_is_full_sell_an_item_to_ivo_to_free_a_slot");
  return '';
}
export function bundleCapacityReason(p, items) {
  const copy = { inventory: { ...p.inventory } };
  for (const [id, count] of Object.entries(items)) {
    const reason = capacityReason(copy, id, count);
    if (reason) return reason;
    copy.inventory[id] = (copy.inventory[id] || 0) + count;
  }
  return '';
}
