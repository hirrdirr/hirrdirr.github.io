import { tr } from './i18n.js';
// Content IDs are stable: saves and a future server refer to IDs, never UI labels.
export const VERSION = '0.3.1';
export const ITEMS = Object.freeze({
  trainingSword: { value: 1, name: tr("data.wanderers_sword"), slot: 'weapon', rarity: 'common', attack: 2, icon: 'sword', description: tr("data.a_worn_blade_a_new_chapter") },
  linenCoat: { value: 1, name: tr("data.travel_coat"), slot: 'armor', rarity: 'common', defense: 1, icon: 'armor', description: tr("data.light_enough_for_a_long_journey") },
  keeperBlade: { value: 14, name: tr("data.lanternkeeper_blade"), slot: 'weapon', rarity: 'uncommon', attack: 7, icon: 'sword', description: tr("data.forged_to_keep_the_darkness_at_bay") },
  forestCoat: { value: 14, name: tr("data.forestkeeper_cloak"), slot: 'armor', rarity: 'uncommon', defense: 4, hp: 12, icon: 'armor', description: tr("data.soft_moss_sturdy_stitching") },
  moonBlade: { value: 24, name: tr("data.moonshard"), slot: 'weapon', rarity: 'rare', attack: 10, icon: 'sword', description: tr("data.an_ancient_blade_with_a_cool_glow") },
  beaconCharm: { questItem: true, name: tr("data.beacons_heart"), slot: 'charm', rarity: 'rare', attack: 3, hp: 24, icon: 'charm', description: tr("data.a_little_light_that_never_fades") },
  potion: { value: 4, name: tr("data.healing_potion"), rarity: 'common', icon: 'potion', description: tr("data.restores_55_health_8_second_cooldown") },
  amber: { name: tr("data.forest_amber"), rarity: 'common', icon: 'amber', value: 4, description: tr("data.ivo_buys_these_for_4_gold_each") },
  swiftBlade: { name: tr("data.wolfs_fang"), slot: 'weapon', rarity: 'uncommon', attack: 7, haste: .20, value: 16, icon: 'sword', description: tr("data.a_light_blade_for_swift_flowing_strikes") },
  trailCharm: { name: tr("data.wanderers_wind"), slot: 'charm', rarity: 'uncommon', speed: 12, recovery: .5, value: 14, icon: 'charm', description: tr("data.move_faster_and_dodge_more_often") },
  barkCoat: { name: tr("data.barkwoven_jacket"), slot: 'armor', rarity: 'uncommon', defense: 3, hp: 24, value: 14, icon: 'armor', description: tr("data.more_vitality_a_little_less_protection_than_the_forestkeeper_cloa") },
  marshCoat: { name: tr("data.emberfen_warden_cloak"), slot: 'armor', rarity: 'rare', defense: 6, hp: 24, value: 24, icon: 'armor', description: tr("data.signes_runes_ward_off_the_heat_of_the_fen") },
  emberCharm: { name: tr("data.emberwing_sigil"), slot: 'charm', rarity: 'rare', attack: 2, haste: .12, value: 24, icon: 'charm', description: tr("data.a_warm_stone_that_lends_your_strikes_a_lighter_rhythm") },
  emberBlade: { name: tr("data.ashdawn"), slot: 'weapon', rarity: 'rare', attack: 14, value: 30, icon: 'sword', description: tr("data.forged_from_the_last_embers_of_the_fen_another_journey_begins") },
  ironCharm: { name: tr("data.ironroot"), slot: 'charm', rarity: 'uncommon', defense: 2, hp: 12, value: 18, icon: 'shield', description: tr("data.a_steady_anchor_when_battle_closes_in") },
  runnerWrap: { name: tr("data.duskweave"), slot: 'armor', rarity: 'uncommon', defense: 2, haste: .06, speed: 6, value: 20, icon: 'armor', description: tr("data.woven_for_swift_movement_with_less_protection_than_a_heavy_cloak") },
  runeFocus: { name: tr("data.runeweaver_prism"), slot: 'charm', rarity: 'uncommon', spellPower: .12, value: 22, icon: 'crystal', description: tr("data.adds_12_of_base_damage_to_lantern_burst_and_glimmerbolt") },
  emberShard: { name: tr("data.ember_shard"), rarity: 'uncommon', icon: 'amber', value: 7, description: tr("data.a_cooling_emberstone_ivo_buys_it_for_7_gold") }
});
export const ENEMIES = Object.freeze({
  sprout: { name: tr("data.thornroot"), behavior: 'melee', level: 1, hp: 36, attack: 6, speed: 48, xp: 16, gold: 3, aggro: 135, leash: 200, radius: 12, cooldown: 1.6 },
  wolf: { name: tr("data.dusk_wolf"), behavior: 'pounce', level: 2, hp: 68, attack: 12, speed: 65, xp: 26, gold: 5, aggro: 165, leash: 240, radius: 13, cooldown: 2.2 },
  warden: { name: tr("data.rootbound_warden"), behavior: 'melee', level: 4, hp: 300, attack: 21, speed: 40, xp: 95, gold: 28, aggro: 185, leash: 280, radius: 23, cooldown: 2.8, boss: true, flag: 'wardenDefeated' },
  wisp: { name: tr("data.emberwing"), behavior: 'ranged', level: 4, hp: 92, attack: 17, speed: 49, xp: 34, gold: 7, aggro: 225, leash: 260, radius: 12, cooldown: 2.1 },
  ancient: { name: tr("data.fenheart"), behavior: 'eruption', level: 6, hp: 1350, attack: 44, speed: 30, xp: 145, gold: 40, aggro: 220, leash: 270, radius: 24, cooldown: 2.4, boss: true, flag: 'ancientDefeated' }
});
// One weighted drop per kill. Copies stay in the bag for individual trading.
export const LOOT_TABLES = Object.freeze({
  sprout: [['amber', 68], ['potion', 25], ['barkCoat', 7]],
  wolf: [['amber', 60], ['potion', 22], ['swiftBlade', 10], ['trailCharm', 8]],
  warden: [['moonBlade', 100]],
  wisp: [['emberShard', 68], ['potion', 22], ['emberCharm', 10]],
  ancient: [['emberCharm', 100]]
});
export const QUESTS = Object.freeze({
  roots: { name: tr("data.light_along_the_trail"), npc: 'elin', text: tr("data.thornroots_have_overrun_the_trail_east_of_the_village_defeat_five"),
    objectives: [{ type: 'kill', target: 'sprout', count: 5, label: tr("data.defeat_thornroots") }], rewards: { xp: 60, gold: 18, items: { keeperBlade: 1 } } },
  herbs: { name: tr("data.a_glimmer_of_life"), npc: 'mira', text: tr("data.three_glimmerherbs_grow_along_the_forest_trail_one_at_the_eastern"),
    objectives: [{ type: 'gather', target: 'glimmer', count: 3, label: tr("data.gather_glimmerherbs") }], rewards: { xp: 45, gold: 10, items: { forestCoat: 1, potion: 2 } } },
  beacon: { name: tr("data.the_silent_beacon"), npc: 'elin', requires: 'roots', text: tr("data.the_old_beacon_stands_beyond_the_bridge_to_the_northeast_defeat_t"),
    objectives: [{ type: 'kill', target: 'warden', count: 1, label: tr("data.defeat_the_warden") }, { type: 'beacon', target: 'beacon', count: 1, label: tr("data.relight_the_beacon") }],
    rewards: { xp: 100, gold: 40, items: { beaconCharm: 1 } } },
  embers: { name: tr("data.writing_in_the_ashes"), npc: 'signe', requires: 'beacon', text: tr("data.the_beacons_light_awakened_the_runes_in_emberfen_south_of_the_for"),
    objectives: [{ type: 'rune', target: 'ember', count: 3, label: tr("data.read_the_fen_runestones") }, { type: 'kill', target: 'wisp', count: 4, label: tr("data.defeat_emberwings") }],
    rewards: { xp: 110, gold: 36, items: { marshCoat: 1, potion: 2 } } },
  heart: { name: tr("data.a_heart_of_embers"), npc: 'signe', requires: 'embers', text: tr("data.the_runes_point_to_fenheart_at_the_old_sluice_in_the_southeast_it"),
    objectives: [{ type: 'kill', target: 'ancient', count: 1, label: tr("data.defeat_fenheart") }, { type: 'seal', target: 'seal', count: 1, label: tr("data.restore_the_fen_seal") }],
    rewards: { xp: 160, gold: 60, items: { emberBlade: 1 } } }
});
export const NPCS = Object.freeze([
  { id: 'elin', name: tr("data.elin"), role: tr("data.lanternkeeper"), x: 528, y: 832, color: 'gold', greeting: tr("data.welcome_to_lantern_vale_as_long_as_the_village_lantern_burns_ther") },
  { id: 'mira', name: tr("data.mira"), role: tr("data.herbalist_mentor"), x: 352, y: 768, color: 'rose', greeting: tr("data.the_forest_holds_both_wounds_and_remedies_rest_here_a_while_i_wil") },
  { id: 'ivo', name: tr("data.ivo"), role: tr("data.merchant"), x: 640, y: 784, color: 'blue', greeting: tr("data.a_potion_in_your_bag_is_worth_two_on_the_shelf_show_me_what_you_w") },
  { id: 'signe', name: tr("data.signe"), role: tr("data.runewalker"), x: 1264, y: 768, color: 'rose', greeting: tr("data.i_saw_the_beacon_light_now_something_beneath_the_fen_is_answering") }
]);
export const SPAWN = Object.freeze({ x: 448, y: 880 });
export const CHECKPOINTS = Object.freeze({ village: SPAWN, camp: { x: 1232, y: 784 } });
export const xpForLevel = level => 60 + (level - 1) * 35;
export const RARITIES = { common: tr("data.common"), uncommon: tr("data.uncommon"), rare: tr("data.rare") };
