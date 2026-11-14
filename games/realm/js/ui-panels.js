import { tr } from './i18n.js';
import { ITEMS, RARITIES, NPCS } from './data.js';
import { stats } from './simulation.js';
import { BAG_SLOTS, occupiedSlots } from './inventory.js';
import { MERCHANTS, BUYBACK_LIMIT, tradeQuote } from './trading.js';
import { TALENTS, TALENT_TREES, TIER_POINTS, talentRank, talentRequirement, spentTalentPoints, availableTalentPoints, earnedTalentPoints, respecCost } from './talents.js';
export const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const itemIcon = name => `<svg class="item-icon" viewBox="0 0 32 32" aria-hidden="true"><use href="./assets/icons.svg#${name}"></use></svg>`;
export const itemStats = item => [item.attack ? tr("ui-panels.attack", item.attack) : '', item.defense ? tr("ui-panels.defense", item.defense) : '', item.hp ? tr("ui-panels.max_health", item.hp) : '', item.haste ? tr("ui-panels.attack_speed", Math.round(item.haste * 100)) : '', item.speed ? tr("ui-panels.movement_speed", Math.round(item.speed / 158 * 100)) : '', item.recovery ? tr("ui-panels.s_dodge_cooldown", item.recovery) : '', item.spellPower ? tr("ui-panels.lantern_burst_glimmerbolt_damage", Math.round(item.spellPower * 100)) : ''].filter(Boolean).join(' · ');
export function compareEquipment(p, id) {
  const item = ITEMS[id];
  if (!item?.slot || p.equipment[item.slot] === id) return '';
  const before = stats(p), after = stats({ ...p, equipment: { ...p.equipment, [item.slot]: id } });
  const rows = [
    [tr("ui-panels.strike_damage"), st => Math.round(st.attack * st.meleeMultiplier), v => v],
    [tr("ui-panels.max_health_2"), st => st.maxHp, v => v], [tr("ui-panels.defense_2"), st => st.defense, v => v],
    [tr("ui-panels.strikes_second"), st => 1 / st.attackCooldown, v => v.toFixed(2)],
    [tr("ui-panels.movement_speed_2"), st => st.speed, v => Math.round(v / 158 * 100) + '%'],
    [tr("ui-panels.dodge"), st => st.dodgeCooldown, v => v.toFixed(2) + ' s', true],
    [tr("ui-panels.lantern_burst"), st => st.attack * st.burstMultiplier, v => Math.round(v)]
  ].filter(([, value]) => Math.abs(value(after) - value(before)) > .0001);
  if (!rows.length) return `<p class="detail-note">${tr("ui-panels.the_same_combat_stats_as_your_current_equipment")}</p>`;
  return `<table class="compare-table"><caption>${tr("ui-panels.character_stats_before_after_equipping")}</caption><thead><tr><th>${tr("ui-panels.stat")}</th><th>${tr("ui-panels.current")}</th><th>${tr("ui-panels.after")}</th></tr></thead><tbody>${rows.map(([label, value, format, lower]) => {
    const a = value(before), b = value(after), good = lower ? b < a : b > a;
    return `<tr><th>${label}</th><td>${format(a)}</td><td class="${good ? 'stat-up' : 'stat-down'}">${format(b)}</td></tr>`;
  }).join('')}</tbody></table>`;
}
export function bagButton(p, id, selected, attribute = 'item') {
  const item = ITEMS[id], worn = Object.values(p.equipment).includes(id), count = p.inventory[id];
  return `<button class="item-button ${item.rarity}${selected ? ' selected' : ''}" data-${attribute}="${id}" aria-label="${tr("ui-panels.quantity", escapeHTML(item.name), worn ? tr("ui-panels.equipped") : '', count)}" aria-pressed="${selected}" title="${escapeHTML(item.name + ' · ' + itemStats(item))}"><span class="item-symbol">${itemIcon(item.icon)}</span>${worn ? `<em>${tr("ui-panels.equip")}</em>` : item.questItem ? `<em>${tr("ui-panels.bound")}</em>` : ''}<small>${count}</small></button>`;
}
export function tradePanel(s, selection) {
  const p = s.player, merchant = MERCHANTS.ivo, side = selection.side;
  const entry = side === 'buyback' ? s.buyback.find(e => e.id === selection.id) : null;
  const id = entry?.item || selection.id, item = ITEMS[id];
  const quote = tradeQuote(s, { type: side === 'stock' ? 'buy' : side === 'buyback' ? 'buyback' : 'sell', id: selection.id, merchant: 'ivo', confirm: true });
  let html = `<div class="trade-summary"><p>${merchant.greeting}</p><strong aria-live="polite">${p.gold} <span>${tr("ui-panels.gold")}</span></strong></div><div class="trade-layout"><section class="merchant-stock"><h3>${tr("ui-panels.in_stock")}</h3><p class="panel-hint">${tr("ui-panels.select_an_item_to_see_its_price_and_compare_stats")}</p><div class="stock-list">`;
  for (const offer of merchant.stock) {
    const data = ITEMS[offer.id];
    html += `<button class="stock-item ${data.rarity}${side === 'stock' && selection.id === offer.id ? ' selected' : ''}" data-stock="${offer.id}" aria-pressed="${side === 'stock' && selection.id === offer.id}" title="${escapeHTML(itemStats(data) || data.description)}"><span class="stock-icon">${itemIcon(data.icon)}</span><span><strong>${data.name}</strong><small>${RARITIES[data.rarity]}</small></span><b>${tr("ui-panels.g", offer.price)}</b></button>`;
  }
  html += `</div></section><section class="trade-bag"><div class="bag-heading"><h3>${tr("ui-panels.your_bag")}</h3><span>${tr("ui-panels.slots", occupiedSlots(p), BAG_SLOTS)}</span></div><p class="panel-hint">${tr("ui-panels.select_the_item_you_want_to_sell_one_item_per_transaction")}</p><div class="inventory-grid">`;
  for (const [key, count] of Object.entries(p.inventory)) if (count > 0) html += bagButton(p, key, side === 'bag' && selection.id === key, 'sale-item');
  if (!occupiedSlots(p)) html += `<p>${tr("ui-panels.your_bag_is_empty")}</p>`;
  html += `</div><div class="buyback-heading"><h4>${tr("ui-panels.buyback")}</h4><span>${tr("ui-panels.your_last_sales", BUYBACK_LIMIT)}</span></div><div class="buyback-list">`;
  for (const sale of s.buyback) html += `<button class="buyback-item${side === 'buyback' && selection.id === sale.id ? ' selected' : ''}" data-buyback-item="${sale.id}" title="${tr("ui-panels.buyback_gold", escapeHTML(ITEMS[sale.item].name), sale.price)}">${itemIcon(ITEMS[sale.item].icon)}<span>${ITEMS[sale.item].name}</span><b>${tr("ui-panels.g", sale.price)}</b></button>`;
  if (!s.buyback.length) html += `<p class="panel-hint">${tr("ui-panels.sold_something_by_mistake_buy_it_back_here_for_the_same_price")}</p>`;
  html += '</div></section></div><section class="trade-detail" aria-live="polite">';
  if (item) {
    html += `<div><span class="item-rarity ${item.rarity}">${RARITIES[item.rarity]}${item.questItem ? tr("ui-panels.quest_bound") : ''}</span><h3>${item.name}</h3><p>${item.description}</p><p class="item-properties">${itemStats(item)}</p></div><div>${compareEquipment(p, id)}</div><div class="trade-actions">`;
    if (side === 'bag' && Object.values(p.equipment).includes(id)) html += `<button data-action="unequip" data-slot="${item.slot}">${tr("ui-panels.unequip", item.name)}</button>`;
    const label = side === 'stock' ? tr("ui-panels.buy_1") : side === 'buyback' ? tr("ui-panels.buyback") : tr("ui-panels.sell_1");
    html += `<button class="primary" data-action="${quote.type}" data-id="${selection.id}" ${quote.ok ? '' : 'disabled'}>${tr("ui-panels.gold_2", label, quote.price)}</button>`;
    if (quote.reason) html += `<p class="panel-hint">${quote.reason}</p>`;
    else if (side === 'bag' && item.rarity === 'rare') html += `<p class="panel-hint">${tr("ui-panels.rare_items_require_confirmation_before_selling")}</p>`;
    html += '</div>';
  } else html += `<p>${tr("ui-panels.select_an_item_from_the_shelves_or_your_bag")}</p>`;
  return html + '</section>';
}
export function talentPanel(s, selected, activeTree = 'guardian') {
  const p = s.player, free = availableTalentPoints(p), learned = spentTalentPoints(p);
  let html = `<div class="talent-summary"><div><strong>${free}</strong><span>${tr("ui-panels.unspent_points")}</span></div><p>${tr("ui-panels.level_of_points_spent", p.level, learned, earnedTalentPoints(p.level))}<br><small>${tr("ui-panels.one_point_per_level_from_level_3_learn_talents_outside_combat_vis")}</small></p></div>`;
  html += `<p id="talent-combat-notice" class="talent-combat-notice" role="status" ${p.combat > 0 ? '' : 'hidden'}>${tr("ui-panels.you_are_in_combat_wait")}<strong id="talent-combat-seconds">${Math.ceil(p.combat)}</strong>${tr("ui-panels.s_before_learning_a_talent_the_world_is_still_running")}</p>`;
  html += `<nav class="talent-tabs" aria-label="${tr("ui-panels.talent_branch")}">${Object.entries(TALENT_TREES).map(([id, tree]) => `<button data-tree="${id}" aria-pressed="${id === activeTree}" title="${tree.name}">${{guardian:tr("ui-panels.guardian"),hunter:tr("ui-panels.hunter"),weaver:tr("ui-panels.weaver")}[id]}</button>`).join('')}</nav><div class="talent-forest">`;
  for (const [treeId, tree] of Object.entries(TALENT_TREES)) {
    const nodes = Object.entries(TALENTS).filter(([, t]) => t.tree === treeId);
    html += `<section class="talent-tree tree-${treeId}${treeId === activeTree ? ' current-tree' : ''}" style="--tree-color:${tree.color}"><header>${itemIcon(tree.icon)}<div><h3>${tree.name}</h3><p>${tree.subtitle}</p></div><b>${spentTalentPoints(p, treeId)}</b></header><div class="talent-grid"><svg class="talent-links" viewBox="0 0 200 442" preserveAspectRatio="none" aria-hidden="true">`;
    for (const [, t] of nodes) for (const [id, rank] of t.requires) {
      const parent = TALENTS[id], x1 = parent.column * 100 + 50, y1 = parent.tier * 114 + 30, x2 = t.column * 100 + 50, y2 = t.tier * 114 + 30;
      html += `<path class="${talentRank(p, id) >= rank ? 'lit' : ''}" d="M${x1} ${y1} L${x1} ${y1 + 56} L${x2} ${y2 - 48} L${x2} ${y2}"/>`;
    }
    html += '</svg>';
    for (const [id, t] of nodes) {
      const rank = talentRank(p, id), reason = talentRequirement(p, id);
      const state = rank === t.maxRank ? 'maxed' : rank ? 'learned' : reason ? 'locked' : 'available';
      const tooltip = `${t.name} · ${rank}/${t.maxRank}\n${rank ? tr("ui-panels.current_2", t.description(rank)) : ''}${rank < t.maxRank ? tr("ui-panels.next", t.description(rank + 1)) : ''}${reason || tr("ui-panels.learn_for_1_point")}`;
      html += `<button class="talent-node ${state}${id === selected ? ' selected' : ''}" style="grid-column:${t.column + 1};grid-row:${t.tier + 1}" data-talent="${id}" aria-label="${tr("ui-panels.rank_of", t.name, rank, t.maxRank)}" aria-pressed="${id === selected}" title="${escapeHTML(tooltip)}"><span class="talent-icon">${itemIcon(t.icon)}<em>${rank}/${t.maxRank}</em></span><strong>${t.name}</strong><small>${['guard', 'rush', 'bolt'].includes(id) ? tr("ui-panels.active", {guard:'1',rush:'2',bolt:'3'}[id]) : t.tier === 3 ? tr("ui-panels.capstone") : TIER_POINTS[t.tier] ? tr("ui-panels.branch_points", TIER_POINTS[t.tier]) : tr("ui-panels.foundation")}</small></button>`;
    }
    html += '</div></section>';
  }
  const t = TALENTS[selected] || TALENTS.vigor, id = Object.hasOwn(TALENTS, selected) ? selected : 'vigor', rank = talentRank(p, id), reason = talentRequirement(p, id);
  const mira = NPCS.find(n => n.id === 'mira'), near = Math.hypot(p.x - mira.x, p.y - mira.y) <= 80;
  html += `</div><section class="talent-detail" aria-live="polite"><div class="talent-description"><p class="eyebrow">${tr("ui-panels.rank", TALENT_TREES[t.tree].name, rank, t.maxRank)}</p><h3>${t.name}</h3>${rank ? `<p>${tr("ui-panels.current_3", t.description(rank))}</p>` : ''}${rank < t.maxRank ? `<p class="talent-next">${tr("ui-panels.next_rank", t.description(rank + 1))}</p>` : ''}<p class="panel-hint">${reason || tr("ui-panels.ready_to_learn_costs_1_talent_point")}</p></div><div class="talent-actions"><button class="primary" data-action="learnTalent" data-id="${id}" ${reason ? 'disabled' : ''}>${rank === t.maxRank ? tr("ui-panels.fully_learned") : tr("ui-panels.learn_rank_1_point", rank + 1)}</button><button data-action="respec" ${!near || !learned || p.gold < respecCost(p) || p.combat > 0 ? 'disabled' : ''}>${tr("ui-panels.reset", respecCost(p) ? tr("ui-panels.gold_3", respecCost(p)) : tr("ui-panels.first_reset_free"))}</button><p class="panel-hint">${near ? tr("ui-panels.mira_can_help_you_choose_a_new_path") : tr("ui-panels.visit_mira_in_lantern_vale_to_respecialize")}</p></div></section>`;
  return html;
}
