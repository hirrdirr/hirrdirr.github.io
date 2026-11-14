import { tr } from './i18n.js';
import { ITEMS } from './data.js';
export const BAG_SLOTS = 16;
export const MAX_STACK = 999;
export const MAX_GOLD = 999999;
// Each slot owns one copy; inventory counts only copies carried in the bag.
export const EQUIPMENT_SLOTS = Object.freeze(['weapon', 'armor', 'charm']);
export const emptyEquipment = () => Object.fromEntries(EQUIPMENT_SLOTS.map(slot => [slot, null]));
export function transferEquipment(p, slot, nextId = null) {
  const fail = reason => ({ ok: false, reason });
  if (!EQUIPMENT_SLOTS.includes(slot) || p.dead) return fail(tr('inventory.cannot_change_equipment'));
  const previous = p.equipment[slot];
  if (previous && (typeof previous !== 'string' || !Object.hasOwn(ITEMS, previous) || ITEMS[previous].slot !== slot)) return fail(tr('inventory.invalid_item'));
  if (nextId !== null && (typeof nextId !== 'string' || !Object.hasOwn(ITEMS, nextId) || ITEMS[nextId].slot !== slot || !(p.inventory[nextId] > 0))) return fail(tr('inventory.item_not_in_bag'));
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
