import { tr } from './i18n.js';
import { ITEMS } from './data.js';
export const BAG_SLOTS = 16;
export const MAX_STACK = 999;
export const MAX_GOLD = 999999;
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
