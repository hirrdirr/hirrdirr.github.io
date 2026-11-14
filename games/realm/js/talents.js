import { tr } from './i18n.js';
// Content and allocation rules are shared by simulation, save validation and UI.
export const TALENT_TREES = Object.freeze({
  guardian: { name: tr("talents.lantern_guardian"), subtitle: tr("talents.stand_firm_strike_back"), color: '#dbbd7c', icon: 'shield' },
  hunter: { name: tr("talents.dusk_hunter"), subtitle: tr("talents.movement_precision_and_combos"), color: '#bdafd9', icon: 'fang' },
  weaver: { name: tr("talents.runeweaver"), subtitle: tr("talents.light_healing_and_runic_magic"), color: '#8dcfc1', icon: 'rune' }
});
const node = (tree, tier, column, name, maxRank, icon, description, effects, requires = []) =>
  ({ tree, tier, column, name, maxRank, icon, description, effects, requires });
export const TALENTS = Object.freeze({
  vigor: node('guardian', 0, 0, tr("talents.deep_roots"), 3, 'heart', r => tr("talents.max_health", r * 8), r => ({ hp: r * 8 })),
  steel: node('guardian', 0, 1, tr("talents.barkskin"), 3, 'armor', r => tr("talents.defense_against_all_hits", r), r => ({ defense: r })),
  guard: node('guardian', 1, 0, tr("talents.lantern_ward"), 1, 'shield', () => tr("talents.active_1_reduce_incoming_damage_by_40_for_4_s_14_s_cooldown"), () => ({}), [['vigor', 2]]),
  edge: node('guardian', 1, 1, tr("talents.steady_blade"), 2, 'sword', r => tr("talents.damage_with_strikes_and_shadow_rush", r * 6), r => ({ meleeBonus: r * .06 }), [['steel', 2]]),
  resolve: node('guardian', 2, 0, tr("talents.warm_light"), 2, 'lantern', r => tr("talents.lantern_ward_lasts_s_longer_and_reduces_damage_by_an_additional_p", r, r * 5), r => ({ guardDuration: r, guardReduction: r * .05 }), [['guard', 1]]),
  remedy: node('guardian', 2, 1, tr("talents.field_medic"), 2, 'potion', r => tr("talents.healing_potions_restore_extra_health", r * 10), r => ({ potionHealing: r * 10 }), [['edge', 1]]),
  bastion: node('guardian', 3, 0, tr("talents.unyielding"), 1, 'bastion', () => tr("talents.lantern_ward_has_a_3_s_shorter_cooldown_and_reduces_damage_by_an"), () => ({ guardRecovery: 3, guardReduction: .15 }), [['resolve', 2]]),
  retaliation: node('guardian', 3, 1, tr("talents.afterglow"), 1, 'counter', () => tr("talents.taking_a_hit_during_lantern_ward_empowers_your_next_basic_strike"), () => ({ retaliation: 1 }), [['guard', 1], ['edge', 2]]),
  tempo: node('hunter', 0, 0, tr("talents.light_hands"), 3, 'tempo', r => tr("talents.attack_speed", r * 4), r => ({ haste: r * .04 })),
  precision: node('hunter', 0, 1, tr("talents.keen_eye"), 3, 'eye', r => tr("talents.critical_strike_chance_with_strikes_shadow_rush_and_glimmerbolt_c", r * 3), r => ({ critChance: r * .03 })),
  rush: node('hunter', 1, 0, tr("talents.shadow_rush"), 1, 'fang', () => tr("talents.active_2_rush_at_a_target_within_210_units_and_deal_140_of_attack"), () => ({}), [['tempo', 2]]),
  footwork: node('hunter', 1, 1, tr("talents.forest_stride"), 2, 'boots', r => tr("talents.movement_speed_and_a_s_shorter_dodge_cooldown", r * 6, (r * .15).toFixed(2)), r => ({ speed: r * 6, recovery: r * .15 }), [['precision', 2]]),
  momentum: node('hunter', 2, 0, tr("talents.rhythm_of_the_hunt"), 2, 'combo', r => tr("talents.the_third_strike_in_a_combo_deals_an_additional_of_attack_as_dama", r * 8), r => ({ comboBonus: r * .08 }), [['rush', 1]]),
  exposed: node('hunter', 2, 1, tr("talents.weak_spot"), 2, 'critical', r => tr("talents.critical_hits_deal_damage", 150 + r * 15), r => ({ critPower: r * .15 }), [['precision', 3]]),
  dance: node('hunter', 3, 0, tr("talents.shadow_dance"), 1, 'dodge', () => tr("talents.landing_the_third_strike_reduces_shadow_rushs_cooldown_by_2_s_and"), () => ({ dance: 1 }), [['momentum', 2]]),
  hunter: node('hunter', 3, 1, tr("talents.second_wind"), 1, 'heart', () => tr("talents.each_enemy_defeated_restores_6_health"), () => ({ killHealing: 6 }), [['exposed', 2]]),
  embers: node('weaver', 0, 0, tr("talents.ember_power"), 3, 'burst', r => tr("talents.damage_with_lantern_burst", r * 8), r => ({ burstBonus: r * .08 })),
  focus: node('weaver', 0, 1, tr("talents.clarity"), 3, 'rune', r => tr("talents.cooldown_recovery_speed_for_lantern_burst_and_glimmerbolt", r * 6), r => ({ magicHaste: r * .06 })),
  bolt: node('weaver', 1, 0, tr("talents.glimmerbolt"), 1, 'bolt', () => tr("talents.active_3_fire_a_rune_of_light_dealing_150_of_attack_as_damage_to"), () => ({}), [['focus', 2]]),
  bloom: node('weaver', 1, 1, tr("talents.lightbloom"), 2, 'leaf', r => tr("talents.lantern_burst_restores_health_when_it_hits_at_least_one_enemy", r * 4), r => ({ burstHealing: r * 4 }), [['embers', 2]]),
  reach: node('weaver', 2, 0, tr("talents.ring_of_light"), 2, 'ring', r => tr("talents.lantern_bursts_radius_increases_by_units", r * 10), r => ({ burstRadius: r * 10 }), [['embers', 3]]),
  resonance: node('weaver', 2, 1, tr("talents.runic_resonance"), 2, 'crystal', r => tr("talents.damage_with_glimmerbolt", r * 10), r => ({ boltBonus: r * .10 }), [['bolt', 1]]),
  piercing: node('weaver', 3, 0, tr("talents.piercing_light"), 1, 'pierce', () => tr("talents.glimmerbolt_pierces_the_first_enemy_and_can_hit_one_more_each_ene"), () => ({ boltPierce: 1 }), [['resonance', 2]]),
  renewal: node('weaver', 3, 1, tr("talents.springs_return"), 1, 'bloom', () => tr("talents.lantern_burst_restores_an_additional_8_of_your_maximum_health_whe"), () => ({ burstHealPercent: .08 }), [['bloom', 2]])
});
export const TIER_POINTS = Object.freeze([0, 3, 6, 10]);
export const earnedTalentPoints = level => Number.isFinite(level) ? Math.max(0, Math.min(20, Math.floor(level)) - 2) : 0;
export const talentRank = (p, id) => Object.hasOwn(TALENTS, id) ? Math.max(0, Math.min(TALENTS[id].maxRank, Math.floor(Number(p.talents?.[id]) || 0))) : 0;
export const spentTalentPoints = (p, tree) => Object.entries(TALENTS).reduce((n, [id, t]) => n + (!tree || t.tree === tree ? talentRank(p, id) : 0), 0);
export const availableTalentPoints = p => Math.max(0, earnedTalentPoints(p.level) - spentTalentPoints(p));
export function talentRequirement(p, id) {
  if (!Object.hasOwn(TALENTS, id)) return tr("talents.unknown_talent");
  const t = TALENTS[id];
  if (talentRank(p, id) >= t.maxRank) return tr("talents.maximum_rank_reached");
  if (p.level < 3) return tr("talents.your_first_talent_point_unlocks_at_level_3");
  if (spentTalentPoints(p, t.tree) < TIER_POINTS[t.tier]) return tr("talents.requires_points_spent_in", TIER_POINTS[t.tier], TALENT_TREES[t.tree].name);
  for (const [parent, rank] of t.requires) if (talentRank(p, parent) < rank) return tr("talents.requires_rank", TALENTS[parent].name, rank);
  if (!availableTalentPoints(p)) return p.level >= 20 ? tr("talents.all_points_are_spent_visit_mira_to_respecialize_and_choose_a_new") : tr("talents.no_unspent_talent_points_gain_another_point_at_the_next_level");
  if (p.combat > 0) return tr("talents.leave_combat_before_learning_a_talent");
  if (p.dead) return tr("talents.return_to_your_lantern_first");
  return '';
}
export function learnTalent(p, id) {
  if (talentRequirement(p, id)) return false;
  p.talents[id] = talentRank(p, id) + 1;
  return true;
}
export function talentEffects(p) {
  const total = {};
  for (const [id, t] of Object.entries(TALENTS)) {
    const rank = talentRank(p, id);
    if (rank) for (const [key, value] of Object.entries(t.effects(rank))) total[key] = (total[key] || 0) + value;
  }
  return total;
}
export function sanitizeTalents(raw, level) {
  const p = { level, talents: {}, combat: 0, dead: false };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return p.talents;
  // Dependencies only point to lower tiers. Reconstruct, never trust saved totals.
  for (const tier of [0, 1, 2, 3]) for (const [id, t] of Object.entries(TALENTS)) {
    if (t.tier !== tier || !Number.isFinite(raw[id])) continue;
    const desired = Math.max(0, Math.min(t.maxRank, Math.floor(raw[id])));
    while (talentRank(p, id) < desired && learnTalent(p, id)) { /* All normal allocation checks apply. */ }
  }
  return p.talents;
}
export const respecCost = p => p.respecCount ? 10 : 0;
