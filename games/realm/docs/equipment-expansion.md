# Equipment Expansion — 0.4.2

Historical itemization/balance record. In 0.4.3, equipment copies become individual
instances; see [item-identity.md](item-identity.md). The immediate next milestone
is now 0.4.4 Randomized Gear Stats, before 0.5.x world expansion.

Seven additional slots extend the 0.4.0 ownership system and 0.4.1 character
panel. Weapon, Armor and Charm keep their existing identities and items.
Head, Shoulders, Hands, Legs, Feet and two Ring slots use the same atomic
bag/equipment transfers. The portrait remains the actual cached base sprite.

## New items and acquisition

Bonuses use existing stats; speed is world units/second, haste and spell power
are additive fractions, and recovery reduces dodge cooldown in seconds. Spell
power affects Lantern Burst and Glimmerbolt. Prices below are gold.

| Item (stable ID) | Category | Rarity | Bonuses | Source | Sale |
| --- | --- | --- | --- | --- | --- |
| Trailkeeper Cap (`trailCap`) | Head | Common | +6 HP | Ivo, 24 | 6 |
| Cowl of Quiet Embers (`fenCowl`) | Head | Rare | +4 HP, +4% spell power | Emberwing, 3% | 22 |
| Mosswoven Shoulders (`mossMantle`) | Shoulders | Common | +4 HP | Thornroot, 6% | 5 |
| Briarbound Pauldrons (`briarPads`) | Shoulders | Uncommon | +1 defense | Dusk Wolf, 6% | 14 |
| Trailworker Gloves (`workGloves`) | Hands | Common | +1 attack | Ivo, 28 | 6 |
| Duskthread Grips (`duskGrips`) | Hands | Uncommon | +3% haste | Emberwing, 8% | 16 |
| Wayfarer Trousers (`linenLegs`) | Legs | Common | +8 HP | Ivo, 30 | 7 |
| Reedrunner Leggings (`reedLegs`) | Legs | Uncommon | +12 HP, 0.1 recovery | Dusk Wolf, 6% | 16 |
| Softstep Boots (`trailBoots`) | Feet | Common | +3 speed | Thornroot, 6% | 6 |
| Fenstrider Boots (`fenBoots`) | Feet | Uncommon | +5 speed, 0.1 recovery | Emberwing, 6% | 17 |
| Hearthcopper Band (`copperBand`) | Ring | Common | +4 HP | Ivo, 28 | 6 |
| Emberglass Band (`emberBand`) | Ring | Rare | +1 attack, +3% spell power | Emberwing, 2% | 24 |

Each normal enemy still rolls one drop from a 100-weight table. New equipment
replaces material-drop weight: Thornroot amber 56%, Dusk Wolf amber 48%,
Emberwing ember shard 49%. Existing potion and equipment chances are unchanged;
boss drops, quests, caches, enemy rewards and merchant prices are unchanged.
Ivo adds four common offers, making eleven total. All other new gear comes from
respawning enemies, so completed saves can obtain it without resetting quests.

There are six common, four uncommon and two rare additions. Early health and
small movement bonuses provide inexpensive upgrades; later gear offers defense,
attack-rate, dodge and spell options. Duplicate items retain authored stats and
stack in the bag. Two worn identical rings consume two copies. No per-instance
random affixes, new stat formulas, active effects or new rarity rules are added.

## Balance review

The new slots intentionally carry smaller bonuses than primary gear. An offense
set adds 16 HP, 3 attack, 1 defense, 5 speed, 0.2 recovery and 10% spell power.
A defense/utility alternative adds 26 HP, 1 defense, 3% haste, 5 speed and
0.2 recovery. The alternatives exchange attack/magic for health/attack rate;
the existing weapon, armor, charm and talents continue to matter.

A level-5 Fenheart simulation used Moonshard, Emberfen Warden Cloak and Beacon's Heart,
three potions, no talents, repeated melee/Burst and approach to 60 pixels.
One policy traded hits; the other avoided hazard centers. Secondary sets were:

- Offense: fenCowl, briarPads, workGloves, reedLegs, fenBoots, emberBand ×2.
- Defense/utility: trailCap, briarPads, duskGrips, reedLegs, fenBoots, copperBand ×2.

| Secondary gear | Trade hits: kill time | Hits / potions used | Avoid: kill time | Hits / potions used |
| --- | --- | --- | --- | --- |
| None | 15.07 s | 4 / 2 | 20.08 s | 0 / 0 |
| Offense | 13.45 s | 4 / 2 | 19.95 s | 0 / 0 |
| Defense/utility | 14.60 s | 4 / 2 | 20.08 s | 0 / 0 |

All runs survived. The offense set shortened direct damage time by about 11%,
but did not remove the potion cost of ignoring attacks. This is a deterministic
simulation sample, not a complete difficulty study or manual campaign clear.
Enemy health/damage, combat calculations and talent formulas were not retuned.

## Compatibility and scope

Save schema stays 4. Older three-slot v4 saves keep their equipment and bag;
seven new slots start empty. The v0–v3 copy-ownership migration, original backups,
corruption recovery, buyback and pending loot retain their existing contracts.
Use 0.4.2 or newer to retain newly added item IDs and slots when loading saves.
See [equipment.md](equipment.md) and [verification.md](verification.md).

Next: **0.5.x — World & Quest Expansion**. Deferred requests include level-relative
XP rewards, target health/level labels, randomized non-stacking item instances,
a separate XP bar above the action bar, outdoor boss respawns and future dungeon
resets. These require their own implementation and verification; none is changed
by this release. Visual armor layers and new talents are also outside this scope.
