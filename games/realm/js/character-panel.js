import { templateId, resolveItem } from './item-instances.js';
import { tr } from './i18n.js';
import { RARITIES, xpForLevel } from './data.js';
import { stats } from './simulation.js';
import { EQUIPMENT_DEFINITIONS, BAG_SLOTS, occupiedSlots, compatibleSlots, equipmentLabel } from './inventory.js';
import { availableTalentPoints, spentTalentPoints } from './talents.js';
import { escapeHTML, itemIcon, itemStats, bagButton, compareEquipment } from './ui-panels.js';

const slotIcon = slot => EQUIPMENT_DEFINITIONS[slot]?.icon || 'charm';

// Presentation only: values come from the same calculation as combat and equipment.
export function characterStatGroups(p) {
  const st = stats(p);
  return [
    { title: tr('character.core'), rows: [
      [tr('ui.health'), `${Math.ceil(p.hp)} / ${st.maxHp}`, tr('character.health_help')],
      [tr('ui.experience'), p.level === 20 ? tr('ui.max_level') : `${p.xp} / ${xpForLevel(p.level)}`, tr('character.xp_help')],
      [tr('ui.gold'), p.gold, tr('character.gold_help')]
    ] },
    { title: tr('character.combat'), rows: [
      [tr('ui-panels.strike_damage'), Math.round(st.attack * st.meleeMultiplier), tr('character.strike_help')],
      [tr('ui-panels.defense_2'), st.defense, tr('character.defense_help')],
      [tr('ui.critical_chance'), `${Math.round(st.critChance * 100)}%`, tr('character.crit_help')],
      [tr('ui-panels.strikes_second'), (1 / st.attackCooldown).toFixed(2), tr('character.speed_help')]
    ] },
    { title: tr('character.movement_magic'), rows: [
      [tr('ui-panels.movement_speed_2'), `${Math.round(st.speed / 158 * 100)}%`, tr('character.move_help')],
      [tr('ui-panels.dodge'), `${st.dodgeCooldown.toFixed(2)} s`, tr('character.dodge_help')],
      [tr('ui-panels.lantern_burst'), Math.round(st.attack * st.burstMultiplier), tr('character.burst_help')]
    ] }
  ];
}

export function characterItemDetail(p, selection) {
  const equipped = selection.side === 'equipment', slot = equipped ? selection.id : null;
  const id = equipped ? p.equipment[slot] : selection.id, item = resolveItem(p, id);
  if (!item || (!equipped && !p.inventory[id])) {
    return `<div class="character-detail-empty">${itemIcon(equipped ? slotIcon(slot) : 'sword')}<h3>${equipped ? tr('character.empty_slot', equipmentLabel(slot)) : tr('character.inspect_gear')}</h3><p>${equipped ? tr('character.empty_help') : tr('character.inspect_help')}</p></div>`;
  }
  let html = `<div class="character-item-title"><span class="character-detail-icon ${item.rarity}">${itemIcon(item.icon)}</span><div><span class="item-rarity ${item.rarity}">${RARITIES[item.rarity]}${item.questItem ? tr('ui-panels.quest_bound') : ''}</span><h3>${escapeHTML(item.name)}</h3><small>${equipped ? tr('character.worn_in', equipmentLabel(slot)) : tr('character.bag_copies', p.inventory[id])}</small></div></div><p>${escapeHTML(item.description)}</p><p class="character-item-stats">${itemStats(item)}</p>`;
  if (equipped) {
    html += `<button class="primary" data-action="unequip" data-slot="${slot}" data-id="${id}">${tr('ui-panels.unequip', escapeHTML(item.name))}</button><p class="detail-note">${tr('character.unequip_help')}</p>`;
  } else if (item.slot) {
    const targets = compatibleSlots(templateId(p, id));
    if (targets.length > 1) html += `<p class="detail-note">${tr('equipment.ring_help')}</p>`;
    for (const target of targets) {
      html += `<section class="equipment-target">${targets.length > 1 ? `<h4>${tr('equipment.compare_slot', equipmentLabel(target))}</h4>` : ''}${compareEquipment(p, id, target)}<button class="primary" data-action="equip" data-slot="${target}" data-id="${id}">${targets.length > 1 ? tr('equipment.equip_slot', equipmentLabel(target)) : tr('character.equip_named', escapeHTML(item.name))}</button></section>`;
    }
  } else if (id === 'potion') {
    const st = stats(p);
    html += `<button data-action="potion" ${p.hp >= st.maxHp || p.cooldowns.potion > 0 ? 'disabled' : ''}>${tr('ui.drink_healing_potion_health', st.potionHealing)}</button>`;
  }
  html += `<p class="detail-note">${item.questItem ? tr('ui.cannot_be_sold') : tr('ui.sell_value_gold_each_at_ivos_shop', item.value)}</p>`;
  return html;
}

export function characterPanel(s, selection = { side: 'equipment', id: 'weapon' }) {
  const p = s.player;
  const equipmentSlot = slot => {
    const id = p.equipment[slot], item = resolveItem(p, id), selected = selection.side === 'equipment' && selection.id === slot;
    const name = item ? item.name : tr('ui.nothing_equipped');
    return `<button class="character-slot ${item?.rarity || 'empty'}${selected ? ' selected' : ''}" data-equipment="${slot}" aria-pressed="${selected}" aria-label="${escapeHTML(tr('character.slot_label', equipmentLabel(slot), name))}" title="${escapeHTML(item ? `${item.name} · ${itemStats(item)}` : tr('character.empty_slot', equipmentLabel(slot)))}"><span class="character-slot-icon">${itemIcon(item?.icon || slotIcon(slot))}</span><span class="character-slot-copy"><small>${equipmentLabel(slot)}</small><strong>${escapeHTML(name)}</strong><span>${item ? RARITIES[item.rarity] : tr('character.empty')}</span></span></button>`;
  };
  const left = ['head', 'shoulders', 'armor', 'hands', 'weapon'].map(equipmentSlot).join('');
  const right = ['charm', 'ring1', 'ring2', 'legs', 'feet'].map(equipmentSlot).join('');
  const groups = characterStatGroups(p).map(group => `<section><h4>${group.title}</h4><dl>${group.rows.map(([label, value, help]) => `<dt tabindex="0" title="${escapeHTML(help)}" aria-label="${escapeHTML(label + '. ' + help)}">${label}<span aria-hidden="true"> ⓘ</span></dt><dd>${value}</dd>`).join('')}</dl></section>`).join('');
  const bag = Object.entries(p.inventory).filter(([, count]) => count > 0).map(([id]) => bagButton(p, id, selection.side === 'bag' && selection.id === id)).join('');
  return `<div class="character-overview"><section class="character-loadout" aria-label="${tr('character.equipment')}"><h3 class="character-section-title">${tr('character.equipment')}</h3><div class="character-equipment character-equipment-left" role="group" aria-label="${tr('equipment.left_slots')}">${left}</div><section class="character-portrait" aria-label="${tr('character.preview')}"><div class="character-identity"><span>${tr('simulation.level', p.level)} · ${tr('character.lantern_wanderer')}</span><h3>${escapeHTML(p.name)}</h3></div><div class="character-stage"><canvas id="character-preview" width="240" height="280" role="img" aria-label="${escapeHTML(tr('character.preview_label', p.name))}">${tr('character.preview_fallback')}</canvas><span class="character-stage-mark" aria-hidden="true">◆</span></div><p class="character-appearance-note">${tr('character.base_appearance')}</p><button class="character-talents" data-action="talents">${tr('ui.open_talents')}<kbd>N</kbd><small>${tr('ui.unspent_points_spent', availableTalentPoints(p), spentTalentPoints(p))}</small></button></section><div class="character-equipment character-equipment-right" role="group" aria-label="${tr('equipment.right_slots')}">${right}</div><p class="character-slot-hint">${tr('character.slot_hint')}</p></section><section class="character-statistics" aria-label="${tr('character.statistics')}"><h3 class="character-section-title">${tr('character.statistics')}</h3>${groups}</section></div><div class="character-belongings"><section class="character-bag" aria-label="${tr('ui-panels.your_bag')}"><div class="bag-heading"><h3 class="character-section-title">${tr('ui-panels.your_bag')}</h3><span>${tr('ui-panels.slots', occupiedSlots(p), BAG_SLOTS)}</span></div><p>${tr('ui.select_an_item_for_details_identical_items_share_a_slot')}</p><div class="inventory-grid">${bag || `<p>${tr('ui-panels.your_bag_is_empty')}</p>`}</div></section><section class="character-item-detail" aria-label="${tr('character.item_details')}" aria-live="polite">${characterItemDetail(p, selection)}</section></div>`;
}
