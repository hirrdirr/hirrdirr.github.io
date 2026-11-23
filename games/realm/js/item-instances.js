import { gearProfile, rollModifiers } from './gear-rolls.js';
import { ITEMS } from './data.js';

// Journey-local, monotonic identities. Ownership lives in bag/slots/drops/buyback;
// this registry stores each equipment record once, independent of its location.
export const instanceNumber = id => typeof id === 'string' && /^gear-[1-9]\d{0,15}$/.test(id) && Number.isSafeInteger(Number(id.slice(5))) ? Number(id.slice(5)) : 0;
export const template = id => typeof id === 'string' && Object.hasOwn(ITEMS, id) ? ITEMS[id] : null;
export const instance = (p, id) => typeof id === 'string' && Object.hasOwn(p.itemInstances || {}, id) ? p.itemInstances[id] : null;
export const templateId = (p, id) => instance(p, id)?.templateId || (template(id) ? id : null);
export function resolveItem(p, id) {
  const record = instance(p, id);
  if (!record) return template(id);
  return gearProfile(record.templateId, record.modifiers)?.effective || null;
}
export function createItemInstance(p, id, rng) {
  if (!template(id)?.slot || !Number.isSafeInteger(p.itemSequence) || p.itemSequence < 1 || p.itemSequence >= Number.MAX_SAFE_INTEGER) throw new Error('Invalid equipment allocation');
  const key = 'gear-' + p.itemSequence;
  if (Object.hasOwn(p.itemInstances, key)) throw new Error('Duplicate equipment identity');
  const modifiers = rollModifiers(id, rng);
  p.itemInstances[key] = { id: key, templateId: id, modifiers };
  p.itemSequence++;
  return key;
}
export function discardItem(p, id) { if (instance(p, id)) delete p.itemInstances[id]; }
