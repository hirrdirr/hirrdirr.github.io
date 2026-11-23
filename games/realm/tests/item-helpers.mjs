// Fixture builders use the production factory. They may deliberately bypass bag
// capacity to represent pre-existing overflow saves, but never runtime commands.
import { ITEMS } from '../js/data.js';
import { createItemInstance, templateId, discardItem } from '../js/item-instances.js';
import { command } from '../js/simulation.js';
export const bagIds = (p, template) => Object.keys(p.inventory).filter(id => p.inventory[id] > 0 && templateId(p, id) === template);
export const bagCount = (p, template) => bagIds(p, template).reduce((n, id) => n + p.inventory[id], 0);
export const bagId = (p, template) => bagIds(p, template)[0];
export function put(p, template, count = 1) {
  const ids = [];
  if (ITEMS[template].slot) for (let i = 0; i < count; i++) { const id = createItemInstance(p, template); p.inventory[id] = 1; ids.push(id); }
  else p.inventory[template] = (p.inventory[template] || 0) + count;
  return ids;
}
export function setBag(p, counts) {
  for (const id of Object.keys(p.inventory)) discardItem(p, id);
  p.inventory = {};
  for (const [id, count] of Object.entries(counts)) put(p, id, count);
}
export function setGear(p, slot, template) {
  discardItem(p, p.equipment[slot]);
  return p.equipment[slot] = template ? createItemInstance(p, template) : null;
}
export const equipTemplate = (s, id, slot) => command(s, { type: 'equip', id: bagId(s.player, id) || id, slot });
export const sellTemplate = (s, id, confirm = false) => command(s, { type: 'sell', id: bagId(s.player, id) || s.player.equipment[Object.keys(s.player.equipment).find(k=>templateId(s.player,s.player.equipment[k])===id)] || id, confirm });
export const itemRef = (p, id) => ITEMS[id].slot ? createItemInstance(p, id) : id;
export const gearTemplates = p => Object.fromEntries(Object.entries(p.equipment).map(([slot,id])=>[slot,templateId(p,id)]));
export const bagTemplates = p => Object.fromEntries(Object.keys(ITEMS).filter(id=>bagCount(p,id)).map(id=>[id,bagCount(p,id)]));
export const totals = p => Object.fromEntries(Object.keys(ITEMS).map(id=>[id,bagCount(p,id)+Object.values(gearTemplates(p)).filter(t=>t===id).length]));
export function legacyView(s) {
  const data = JSON.parse(JSON.stringify(s));
  data.player.inventory = bagTemplates(s.player); data.player.equipment = gearTemplates(s.player);
  delete data.player.itemInstances; delete data.player.itemSequence;
  for (const e of [...data.drops, ...data.buyback]) e.item = templateId(s.player, e.item);
  return data;
}
