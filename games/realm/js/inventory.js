import { ITEMS } from './data.js';
export const BAG_SLOTS = 16;
export const MAX_STACK = 999;
export const MAX_GOLD = 999999;
export const occupiedSlots = p => Object.entries(p.inventory).filter(([id, n]) => Object.hasOwn(ITEMS, id) && n > 0).length;
export function capacityReason(p, id, count = 1) {
  if (!Object.hasOwn(ITEMS, id) || !Number.isInteger(count) || count < 1) return 'Ogiltigt föremål.';
  if ((p.inventory[id] || 0) + count > MAX_STACK) return 'Den här stapeln är full.';
  if (!p.inventory[id] && occupiedSlots(p) >= BAG_SLOTS) return 'Väskan är full. Sälj ett föremål hos Ivo för att frigöra ett fack.';
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
