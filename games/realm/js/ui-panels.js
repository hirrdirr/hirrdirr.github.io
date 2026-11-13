import { ITEMS, RARITIES, NPCS } from './data.js';
import { stats } from './simulation.js';
import { BAG_SLOTS, occupiedSlots } from './inventory.js';
import { MERCHANTS, BUYBACK_LIMIT, tradeQuote } from './trading.js';
import { TALENTS, TALENT_TREES, TIER_POINTS, talentRank, talentRequirement, spentTalentPoints, availableTalentPoints, earnedTalentPoints, respecCost } from './talents.js';
export const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const itemIcon = name => `<svg class="item-icon" viewBox="0 0 32 32" aria-hidden="true"><use href="./assets/icons.svg#${name}"></use></svg>`;
export const itemStats = item => [item.attack ? `+${item.attack} attack` : '', item.defense ? `+${item.defense} försvar` : '', item.hp ? `+${item.hp} maxhälsa` : '', item.haste ? `+${Math.round(item.haste * 100)}% attackhastighet` : '', item.speed ? `+${Math.round(item.speed / 158 * 100)}% rörelsefart` : '', item.recovery ? `−${item.recovery} s undanmanöver` : '', item.spellPower ? `+${Math.round(item.spellPower * 100)}% skada med Lyktslag / Glimtskott` : ''].filter(Boolean).join(' · ');
export function compareEquipment(p, id) {
  const item = ITEMS[id];
  if (!item?.slot || p.equipment[item.slot] === id) return '';
  const before = stats(p), after = stats({ ...p, equipment: { ...p.equipment, [item.slot]: id } });
  const rows = [
    ['Huggskada', st => Math.round(st.attack * st.meleeMultiplier), v => v],
    ['Maxhälsa', st => st.maxHp, v => v], ['Försvar', st => st.defense, v => v],
    ['Hugg / sekund', st => 1 / st.attackCooldown, v => v.toFixed(2)],
    ['Rörelsefart', st => st.speed, v => Math.round(v / 158 * 100) + '%'],
    ['Undanmanöver', st => st.dodgeCooldown, v => v.toFixed(2) + ' s', true],
    ['Lyktslag', st => st.attack * st.burstMultiplier, v => Math.round(v)]
  ].filter(([, value]) => Math.abs(value(after) - value(before)) > .0001);
  if (!rows.length) return '<p class="detail-note">Samma stridsvärden som din nuvarande utrustning.</p>';
  return '<table class="compare-table"><caption>Hela karaktären före → efter byte</caption><thead><tr><th>Egenskap</th><th>Nu</th><th>Efter</th></tr></thead><tbody>' + rows.map(([label, value, format, lower]) => {
    const a = value(before), b = value(after), good = lower ? b < a : b > a;
    return `<tr><th>${label}</th><td>${format(a)}</td><td class="${good ? 'stat-up' : 'stat-down'}">${format(b)}</td></tr>`;
  }).join('') + '</tbody></table>';
}
export function bagButton(p, id, selected, attribute = 'item') {
  const item = ITEMS[id], worn = Object.values(p.equipment).includes(id), count = p.inventory[id];
  return `<button class="item-button ${item.rarity}${selected ? ' selected' : ''}" data-${attribute}="${id}" aria-label="${escapeHTML(item.name)}${worn ? ', utrustad' : ''}, antal ${count}" aria-pressed="${selected}" title="${escapeHTML(item.name + ' · ' + itemStats(item))}"><span class="item-symbol">${itemIcon(item.icon)}</span>${worn ? '<em>UTR.</em>' : item.questItem ? '<em>BUNDEN</em>' : ''}<small>${count}</small></button>`;
}
export function tradePanel(s, selection) {
  const p = s.player, merchant = MERCHANTS.ivo, side = selection.side;
  const entry = side === 'buyback' ? s.buyback.find(e => e.id === selection.id) : null;
  const id = entry?.item || selection.id, item = ITEMS[id];
  const quote = tradeQuote(s, { type: side === 'stock' ? 'buy' : side === 'buyback' ? 'buyback' : 'sell', id: selection.id, merchant: 'ivo', confirm: true });
  let html = `<div class="trade-summary"><p>${merchant.greeting}</p><strong aria-live="polite">${p.gold} <span>guld</span></strong></div><div class="trade-layout"><section class="merchant-stock"><h3>På hyllorna</h3><p class="panel-hint">Välj ett föremål för pris och jämförelse.</p><div class="stock-list">`;
  for (const offer of merchant.stock) {
    const data = ITEMS[offer.id];
    html += `<button class="stock-item ${data.rarity}${side === 'stock' && selection.id === offer.id ? ' selected' : ''}" data-stock="${offer.id}" aria-pressed="${side === 'stock' && selection.id === offer.id}" title="${escapeHTML(itemStats(data) || data.description)}"><span class="stock-icon">${itemIcon(data.icon)}</span><span><strong>${data.name}</strong><small>${RARITIES[data.rarity]}</small></span><b>${offer.price} g</b></button>`;
  }
  html += `</div></section><section class="trade-bag"><div class="bag-heading"><h3>Din väska</h3><span>${occupiedSlots(p)} / ${BAG_SLOTS} fack</span></div><p class="panel-hint">Välj exakt vad du vill sälja. Ett exemplar per köp.</p><div class="inventory-grid">`;
  for (const [key, count] of Object.entries(p.inventory)) if (count > 0) html += bagButton(p, key, side === 'bag' && selection.id === key, 'sale-item');
  if (!occupiedSlots(p)) html += '<p>Väskan är tom.</p>';
  html += `</div><div class="buyback-heading"><h4>Återköp</h4><span>Dina senaste ${BUYBACK_LIMIT} försäljningar</span></div><div class="buyback-list">`;
  for (const sale of s.buyback) html += `<button class="buyback-item${side === 'buyback' && selection.id === sale.id ? ' selected' : ''}" data-buyback-item="${sale.id}" title="Återköp ${escapeHTML(ITEMS[sale.item].name)} · ${sale.price} guld">${itemIcon(ITEMS[sale.item].icon)}<span>${ITEMS[sale.item].name}</span><b>${sale.price} g</b></button>`;
  if (!s.buyback.length) html += '<p class="panel-hint">Felsålt något? Det hamnar här, till samma pris.</p>';
  html += '</div></section></div><section class="trade-detail" aria-live="polite">';
  if (item) {
    html += `<div><span class="item-rarity ${item.rarity}">${RARITIES[item.rarity]}${item.questItem ? ' · Bunden till uppdrag' : ''}</span><h3>${item.name}</h3><p>${item.description}</p><p class="item-properties">${itemStats(item)}</p></div><div>${compareEquipment(p, id)}</div><div class="trade-actions">`;
    if (side === 'bag' && Object.values(p.equipment).includes(id)) html += `<button data-action="unequip" data-slot="${item.slot}">Ta av ${item.name}</button>`;
    const label = side === 'stock' ? 'Köp 1' : side === 'buyback' ? 'Återköp' : 'Sälj 1';
    html += `<button class="primary" data-action="${quote.type}" data-id="${selection.id}" ${quote.ok ? '' : 'disabled'}>${label} · ${quote.price} guld</button>`;
    if (quote.reason) html += `<p class="panel-hint">${quote.reason}</p>`;
    else if (side === 'bag' && item.rarity === 'rare') html += '<p class="panel-hint">Sällsynta fynd kräver en bekräftelse.</p>';
    html += '</div>';
  } else html += '<p>Välj ett föremål från hyllorna eller din väska.</p>';
  return html + '</section>';
}
export function talentPanel(s, selected, activeTree = 'guardian') {
  const p = s.player, free = availableTalentPoints(p), learned = spentTalentPoints(p);
  let html = `<div class="talent-summary"><div><strong>${free}</strong><span>lediga poäng</span></div><p>Nivå ${p.level} · ${learned} av ${earnedTalentPoints(p.level)} poäng investerade<br><small>En poäng per nivå från nivå 3. Lär talanger utanför strid; Mira hjälper dig att återställa poängen.</small></p></div>`;
  html += `<p id="talent-combat-notice" class="talent-combat-notice" role="status" ${p.combat > 0 ? '' : 'hidden'}>Du är i strid – vänta <strong id="talent-combat-seconds">${Math.ceil(p.combat)}</strong> s innan du lär en talang.</p>`;
  html += '<nav class="talent-tabs" aria-label="Talanggren">' + Object.entries(TALENT_TREES).map(([id, tree]) => `<button data-tree="${id}" aria-pressed="${id === activeTree}" title="${tree.name}">${{guardian:'Väktare',hunter:'Jägare',weaver:'Vävare'}[id]}</button>`).join('') + '</nav><div class="talent-forest">';
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
      const tooltip = `${t.name} · ${rank}/${t.maxRank}\n${rank ? 'Nu: ' + t.description(rank) + '\n' : ''}${rank < t.maxRank ? 'Nästa: ' + t.description(rank + 1) + '\n' : ''}${reason || 'Kan läras för 1 poäng.'}`;
      html += `<button class="talent-node ${state}${id === selected ? ' selected' : ''}" style="grid-column:${t.column + 1};grid-row:${t.tier + 1}" data-talent="${id}" aria-label="${t.name}, rank ${rank} av ${t.maxRank}" aria-pressed="${id === selected}" title="${escapeHTML(tooltip)}"><span class="talent-icon">${itemIcon(t.icon)}<em>${rank}/${t.maxRank}</em></span><strong>${t.name}</strong><small>${['guard', 'rush', 'bolt'].includes(id) ? 'AKTIV · ' + ({guard:'1',rush:'2',bolt:'3'}[id]) : t.tier === 3 ? 'MÄSTARTALANG' : TIER_POINTS[t.tier] ? TIER_POINTS[t.tier] + ' poäng i grenen' : 'GRUNDTALANG'}</small></button>`;
    }
    html += '</div></section>';
  }
  const t = TALENTS[selected] || TALENTS.vigor, id = Object.hasOwn(TALENTS, selected) ? selected : 'vigor', rank = talentRank(p, id), reason = talentRequirement(p, id);
  const mira = NPCS.find(n => n.id === 'mira'), near = Math.hypot(p.x - mira.x, p.y - mira.y) <= 80;
  html += `</div><section class="talent-detail" aria-live="polite"><div class="talent-description"><p class="eyebrow">${TALENT_TREES[t.tree].name} · RANK ${rank}/${t.maxRank}</p><h3>${t.name}</h3>${rank ? '<p>Nu: ' + t.description(rank) + '</p>' : ''}${rank < t.maxRank ? '<p class="talent-next">Nästa rank: ' + t.description(rank + 1) + '</p>' : ''}<p class="panel-hint">${reason || 'Redo att lära. Kostar 1 talentpoäng.'}</p></div><div class="talent-actions"><button class="primary" data-action="learnTalent" data-id="${id}" ${reason ? 'disabled' : ''}>${rank === t.maxRank ? 'Fullt utvecklad' : 'Lär rank ' + (rank + 1) + ' · 1 poäng'}</button><button data-action="respec" ${!near || !learned || p.gold < respecCost(p) || p.combat > 0 ? 'disabled' : ''}>Återställ · ${respecCost(p) ? respecCost(p) + ' guld' : 'gratis första gången'}</button><p class="panel-hint">${near ? 'Mira hjälper dig att välja en ny väg.' : 'Besök Mira i Lyktdalen för att återställa.'}</p></div></section>`;
  return html;
}
