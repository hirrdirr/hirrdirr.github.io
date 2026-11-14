import { tr } from './i18n.js';
import { ITEMS, NPCS } from './data.js';
import { capacityReason, MAX_GOLD } from './inventory.js';
export const BUYBACK_LIMIT = 8;
export const MERCHANTS = Object.freeze({
  ivo: { name: tr("trading.ivos_trading_post"), greeting: tr("trading.choose_what_you_need_i_also_buy_what_you_have_outgrown"), stock: [
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
  if (p.dead || !nearMerchant(s, merchant)) return fail(tr("trading.approach_the_merchant_first"));
  if (action.quantity !== undefined && action.quantity !== 1) return fail(tr("trading.select_one_item_at_a_time"));
  if (action.type === 'buyback') {
    const entry = s.buyback.find(e => e.id === action.id && e.merchant === merchant);
    if (!entry) return fail(tr("trading.that_item_is_no_longer_available_for_buyback"));
    result.item = entry.item; result.price = entry.price;
  } else if (!Object.hasOwn(ITEMS, action.id)) return fail(tr("trading.select_an_item"));
  const item = ITEMS[result.item];
  if (action.type === 'sell') {
    result.price = item.value || 0;
    if (!p.inventory[action.id]) return fail(tr("trading.you_do_not_own_that_item"));
    if (item.questItem || !result.price) return fail(tr("trading.quest_items_cannot_be_sold"));
    if (Object.values(p.equipment).includes(action.id)) return fail(tr("trading.unequip_the_item_before_selling_it"));
    if (p.gold + result.price > MAX_GOLD) return fail(tr("trading.you_cannot_carry_any_more_gold"));
    if (item.rarity === 'rare' && action.confirm !== true) return { ...fail(tr("trading.confirm_the_sale_of_this_rare_item")), confirmRequired: true };
  } else if (action.type === 'buy' || action.type === 'buyback') {
    if (action.type === 'buy') {
      const offer = MERCHANTS[merchant].stock.find(o => o.id === action.id);
      if (!offer) return fail(tr("trading.the_merchant_does_not_sell_that_item"));
      result.price = offer.price;
    }
    if (p.gold < result.price) return fail(tr("trading.you_need_more_gold", result.price - p.gold));
    const reason = capacityReason(p, result.item);
    if (reason) return fail(reason);
  } else return fail(tr("trading.invalid_transaction"));
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
