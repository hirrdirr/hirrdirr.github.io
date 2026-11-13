import { ITEMS, NPCS } from './data.js';
import { capacityReason, MAX_GOLD } from './inventory.js';
export const BUYBACK_LIMIT = 8;
export const MERCHANTS = Object.freeze({
  ivo: { name: 'Ivos handelsbod', greeting: 'Välj vad du behöver. Jag köper också det du har vuxit ur.', stock: [
    { id: 'potion', price: 12 }, { id: 'keeperBlade', price: 62 },
    { id: 'forestCoat', price: 64 }, { id: 'trailCharm', price: 58 },
    { id: 'ironCharm', price: 72 }, { id: 'runnerWrap', price: 78 }, { id: 'runeFocus', price: 82 }
  ] }
});
export const nearMerchant = (s, id) => Object.hasOwn(MERCHANTS, id) && NPCS.some(n => n.id === id && Math.hypot(s.player.x - n.x, s.player.y - n.y) <= 80);
export function tradeQuote(s, action) {
  const p = s.player, merchant = action.merchant || 'ivo';
  const result = { ok: false, reason: '', merchant, item: action.id, price: 0, type: action.type };
  const fail = reason => ({ ...result, reason });
  if (p.dead || !nearMerchant(s, merchant)) return fail('Gå fram till handlaren först.');
  if (action.quantity !== undefined && action.quantity !== 1) return fail('Välj ett föremål åt gången.');
  if (action.type === 'buyback') {
    const entry = s.buyback.find(e => e.id === action.id && e.merchant === merchant);
    if (!entry) return fail('Det föremålet finns inte längre i återköpslistan.');
    result.item = entry.item; result.price = entry.price;
  } else if (!Object.hasOwn(ITEMS, action.id)) return fail('Välj ett föremål.');
  const item = ITEMS[result.item];
  if (action.type === 'sell') {
    result.price = item.value || 0;
    if (!p.inventory[action.id]) return fail('Du äger inte det föremålet.');
    if (item.questItem || !result.price) return fail('Uppdragsföremål kan inte säljas.');
    if (Object.values(p.equipment).includes(action.id)) return fail('Ta av föremålet innan du säljer det.');
    if (p.gold + result.price > MAX_GOLD) return fail('Du kan inte bära mer guld.');
    if (item.rarity === 'rare' && action.confirm !== true) return { ...fail('Bekräfta försäljningen av det sällsynta föremålet.'), confirmRequired: true };
  } else if (action.type === 'buy' || action.type === 'buyback') {
    if (action.type === 'buy') {
      const offer = MERCHANTS[merchant].stock.find(o => o.id === action.id);
      if (!offer) return fail('Handlaren säljer inte det föremålet.');
      result.price = offer.price;
    }
    if (p.gold < result.price) return fail(`Du behöver ${result.price - p.gold} guld till.`);
    const reason = capacityReason(p, result.item);
    if (reason) return fail(reason);
  } else return fail('Ogiltig handel.');
  return { ...result, ok: true };
}
export function transact(s, action) {
  const q = tradeQuote(s, action);
  if (!q.ok) return q;
  const p = s.player;
  // Validate everything first, then transfer exactly one item and its price.
  if (q.type === 'sell') {
    p.inventory[q.item]--;
    if (!p.inventory[q.item]) delete p.inventory[q.item];
    p.gold += q.price;
    s.buyback.unshift({ id: 'sale-' + s.tradeSequence++, merchant: q.merchant, item: q.item, price: q.price });
    s.buyback.length = Math.min(s.buyback.length, BUYBACK_LIMIT);
  } else {
    p.gold -= q.price; p.inventory[q.item] = (p.inventory[q.item] || 0) + 1;
    if (q.type === 'buyback') s.buyback = s.buyback.filter(e => e.id !== action.id);
  }
  return q;
}
