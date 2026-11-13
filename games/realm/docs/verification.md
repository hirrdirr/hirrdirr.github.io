# v0.3.0 verification — 2026-11-13

## Automated

`node --test games/realm/tests/*.test.mjs`: **63 passed, 0 failed**.
The earlier 38 checks remain, with obsolete specialization, duplicate-loot and
sell-all expectations updated for the explicitly replaced behavior. The 25
new checks exercise:

- Merchant prices/stock/proximity, explicit quantities, gold limits, full bags,
  full stacks, insufficient funds and failure without partial transfers.
- One-copy sale, equipped/quest protection, rare confirmation, bounded buyback,
  replay rejection, round-trip persistence and sold starter gear staying sold.
- Atomic quest/chest item rewards and blocked loot remaining collectible.
- Level-derived point budgets, rank caps, branch thresholds, dependencies,
  combat/death gates, cross-branch builds and all 24 reachable talents.
- Real damage, defense, health, haste, movement, cooldown, healing, critical,
  combo, retaliation, rush, range and piercing effects.
- Mira proximity, free first respec, subsequent fees, refunds and preserved
  cooldowns; equipment/stat recomputation without stacking or free healing.
- Offensive abilities outside safe areas and ranged hits provoking idle enemies.
- v2 specialization migration, original backup preservation, malformed/excessive
  allocations, over-capacity old bags and repaired buyback prices/IDs.
- Shared item comparisons, visible prices, protected item actions and tree markup.

Production JS syntax, SVG symbol references and `git diff --check` passed.
The repository's existing Core Defense suite also passed: **93/93**.

## Browser verification

Chromium, 2026-11-12–13, using the supported import UI with a disposable QA save:

- Opened Ivo's two-column shop, sold one of three amber, bought it back at the
  same price, bought Runvävarens prisma, and saw immediate gold/item feedback.
- Verified equipped weapon sale was disabled, unequipped and sold it, and saw
  the quest-bound charm rejected with an explanation.
- Opened the talent panel, learned multiple ranks in each branch, unlocked all
  three active abilities and saw their buttons appear on the HUD.
- Walked through the village and opened Mira's mentoring dialogue.
- Confirmed a free reset returning 12 invested points, then a second reset
  charging exactly 10 gold. Learned another rank and reloaded: gold, allocation,
  free points and the future reset fee all remained correct.
- Checked dark and light panels and a 390 × 820 iframe viewport. Fixed a narrow
  canvas/aspect-ratio overflow and replaced stacked mobile trees with branch
  tabs. Panel width fits without horizontal overflow; all seven ability buttons
  fit within the 353-pixel game viewport. Branch switching and learning work.
- No `/games/realm` JavaScript errors were captured in the final browser pass.

The later safe-area/idle-aggro rule adjustments are covered by simulation tests.
A full unassisted campaign clear, independent listening test, Firefox/Safari and
low-powered Windows hardware have not been tested for this release.

## Performance sample

36,000 fixed ticks (10 simulated minutes), 17 enemies, a legal mixed talent
build, movement and repeated attacks/abilities: **0.027 ms/tick** mean and
**0.038 ms/tick** for the slowest 3,600-tick block on the test host. Events were
drained each tick. The existing ranged-swarm/bounded-effects tests still pass.
These are simulation CPU timings, not browser FPS or GPU guarantees.

---

# v0.2.0 verification — 2026-11-11

## Automated

    node --test games/realm/tests/*.test.mjs

**38 passed, 0 failed.** The 19 first-chapter tests remain in place. The
19 additional checks cover:

- Connected-hit combos, attack rate, target cycling and target priority.
- Committed wolf pounces, travelling/colliding shots and sidestep avoidance.
- Normal-enemy interrupts versus uninterrupted boss telegraphs.
- Fixed eruption positions, the boss's second phase and attack cleanup on death.
- Safe-camp healing, checkpoints and death/save restoration.
- Level-3 specialization rules and their effect on actual combat statistics.
- Both chapter-two quests through final reward, prerequisites, early exploration
  and rejection of repeated rewards.
- Duplicate-loot conversion and enemy-specific reward distribution.
- A v1-shaped journey with completed chapter one, preserved original backup,
  backup-storage failure, new-field validation, pending loot and cooldowns.
- Collision-index equivalence to a full scan across the world.
- A 3,600-tick, 80-ranged-enemy stress scenario with bounded projectiles,
  eruption markers and visual effects.
- Dodge direction during auto-aimed attacks.
- A level-5 Myrhjärtat encounter with normal gear and potion cooldowns: multiple
  telegraphs occur; avoidance wins with fewer hits and potions than trading hits.

The original reachability check includes all added landmarks and enemy spawns.
Production JavaScript syntax checks and git diff --check are run before commit.

## Performance sample

A new Node run advanced **36,000 ticks / 10 simulated minutes** with all
**17 enemies**, repeated attacks, movement and invulnerability to keep the
scenario running. Mean simulation time was **0.025 ms/tick**; the slowest
3,600-tick block averaged **0.054 ms/tick** on this test host. Events were drained
as they are by the game loop. The separate 80-enemy stress test checks bounds.

These are CPU simulation measurements, not browser FPS or GPU guarantees.
Cached terrain/sprites, the canvas resolution cap, 30/60 FPS selection and
pausing while menus or background tabs are open remain in place.

## Browser verification

The phase-two Chromium pass on 2026-11-10 exercised a v0.1 journey through the
supported import UI, continued play in the new content and retained progress
after reload. It included rune discovery, new loot and leveling. It exposed an
interaction/combo overlay overlap and a cramped camp exit, both fixed before
this final pass. This supersedes the v0.1 reload limitation recorded below.

A fresh 2026-11-11 smoke check covers v0.2 startup, the character panel and local
save/reload. The complete chapter-two reward chain and boss balance are covered
by simulation tests; a full unassisted end-to-end browser clear, independent
listening test, Firefox and low-powered Windows hardware remain unverified.

---

# v0.1.0 verification — 2026-11-10

## Automated

    node --test games/realm/tests/*.test.mjs

**19 passed, 0 failed.** Coverage:

- Normalized movement, building/water/world collision and dodge tunneling.
- Flood-fill reachability of every NPC, herb, cache, beacon and enemy spawn.
- Attack cooldowns, one-time kills, XP, gold and loot pickup.
- Level healing, equipment ownership, enemy telegraphs and safe-zone protection.
- Dodge immunity, consumables and death/respawn progression retention.
- First quest acceptance, combat and claim; repeated claims denied.
- Herb collection before acceptance, one-time caches and early boss completion.
- Merchant proximity, costs and material sales.
- Save round trip, v0 migration, malformed/oversized files, unknown item IDs,
  bounded values, invalid position fallback and permanent boss defeat.
- Backup recovery, corruption preservation, future-version protection,
  denied storage and long-run bounds for transient collections.

Syntax checks cover every production JavaScript module. git diff --check passes.

## Performance sample

An executor Node run advanced **36,000 ticks / 10 simulated minutes**, with all
11 enemies and repeated player attacks. Average tick time was **0.053 ms**;
the slowest one-minute block averaged **0.064 ms/tick**. Effects stayed bounded
and the intentionally undrained event buffer stayed at its 100-event cap.

This is a CPU simulation measurement on the test host, not a promise of browser
FPS, GPU load or performance on the player's hardware. Average render duration
is available in the pause menu; a 30 FPS setting reduces rendering work.

## Browser playtest

Checked in Chromium through the actual UI:

- Character creation and welcome artwork.
- WASD/arrow movement, following camera and visible scene collision.
- Elin dialogue, quest acceptance and live objective tracking.
- Five taggrot kills using normal attacks and Lantern Strike.
- Enemy damage, loot pickup, XP and level 2/3 progression.
- Herb interaction, river bridge traversal and safe-zone return.
- Inventory details and weapon comparison.
- Selling amber, purchasing a potion and updated gold/item counts.
- Returning to Elin, receiving the sword and unlocking the beacon quest.
- Paused inventory/dialogue views and legible desktop layout.

The test environment blocked browser reload with a URL-policy error.
End-to-end browser reload persistence was **not verified**; serialization,
recovery and restored progression are covered by automated tests above.
Narrow-screen layouts and light-theme rules are implemented but still merit
manual testing on the user's Windows browser. Audio was checked by code paths
and runtime operation, not by an independent listening test.
