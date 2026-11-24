# v0.5.0 verification — 2026-11-23

The baseline at `e2e3646` passed 139 tests. The release adds 12 checks for
kill XP, cap feedback, all five respawn timers, spawn clearance across the map,
repeat boss mechanics and rewards, reloading timers and a previous-version save.
The fixture was written by 0.4.4 with rolled gear, buyback, uncollected boss loot
and completed story flags. The test checks the complete serialized player/world
payload and repurchases the same rolled item.

In Chromium, a level-5 character killed a Thornroot from a prepared save. The bag
panel showed 34/200 XP (starting at 30) and the HUD showed 3 gold. In a separate
save with two seconds remaining on the Warden timer, the player resumed on the
boss's home. After its return, a strike showed 271/300 HP and the journal listed
The Silent Beacon as completed. Automated tests run the full boss intervals.

In a local Node simulation comparison with 36,000 fixed ticks per sample, warm-up
and five alternating samples per version, median step times were 0.0258 ms on
0.4.4 and 0.0256 ms on 0.5.0. This measures simulation CPU time only.

# v0.4.4 verification — 2026-11-23

Baseline: merged 0.4.3 at `3402c58` (130 passing tests). The 0.4.4 suite
passes 139 tests, including every authored gear profile, tier bounds, repeated
swaps with talents, both ring slots, blocked ground pickup, trading, buyback,
malformed rolls, import and backup recovery. The schema-5 fixture was generated
by the actual 0.4.3 serializer from the existing QA journey with ten worn items,
duplicates, pending drops and buyback entries. The migrated save's complete data
matches that fixture. The static English page matches its template.

Chromium smoke test with an isolated test save: selected two merchant-generated
Hearthcopper Bands with the keyboard. One gave +6 max health, the other +3 max
health and +1% movement speed. Wearing the first produced 106 max health;
the second previewed 103 as its replacement or 109 in the empty ring slot.
Equipping it in Ring 2 produced 109 max health and 101% movement speed as shown.
Save migration and merchant sale/buyback were exercised by automated tests.

# v0.4.3 verification — 2026-11-18

## Automated verification

`node --test games/realm/tests/*.test.mjs`: **130 passed, 0 failed**.
The 115 earlier checks were adapted to explicit equipment identities and the
intentionally replaced stacking/schema behavior. Test fixture helpers mint real
instances; commands still exercise the production rule layer. Fifteen additional
identity-focused checks cover:

- Separate IDs and bag slots for identical equipment; exact references through
  equip, swap, sale, buyback and repeated reloads. Template-only equip/sell is
  rejected rather than selecting an arbitrary copy.
- An actual schema-4 fixture serialized with the 0.4.2 modules at `626dd18`, with
  ten worn slots, duplicate rings and swords, buyback and outstanding loot.
  Projection back to template/count ownership preserves all persisted progress.
- v0–v4 migration, twenty repeated reloads, deterministic legacy replacement,
  untouched v4/import backups, backup failures and recovery of a corrupt graph.
- Twenty-six malformed ownership variants: duplicate owners, wrong slots,
  missing/orphan records, mismatched/unknown IDs, injected modifiers, invalid
  counters, stacked equipment, conflicting buyback/drop references and invalid
  current drop locations. These reject the whole save, preserving the original.
- Maximum legacy quantities (999 of every template), exceeding the former
  256 KiB limit after migration, successfully round-trip under the shared 8 MiB
  import/validation bound without losing copies.
- Full-bag equipment purchases, blocked buyback, bundle preflight, quantity
  validation, consumable stacks, one-time quest rewards and exact loot pickup.
- Buyback eviction, drop expiry and the 64-drop cap retire only their own records;
  later acquisitions never reuse retired IDs.
- Separate UI selections, hidden technical identifiers and read-only merchant
  comparisons that do not allocate instances or consume sequence numbers.

The existing all-item/all-ten-slot matrix, actual enemy-drop tests, combat,
quests, talents, migration/recovery and preview lifecycle checks pass.
A direct comparison against 0.4.2 confirmed identical item definitions, loot
tables, quests, NPCs, enemy data, merchant prices and full-loadout computed stats.
JavaScript syntax, generated HTML freshness and `git diff --check` pass.
Changes are confined to `games/realm/`.

## Actual Chromium smoke test

Continued the existing disposable 0.4.2 QA journey in the local preview:

- The migration notice appeared. Eight worn slots, both rings, level 20, talent
  allocation, quest progress and 237 gold survived. Two Wolf's Fang copies became
  separate bag buttons; occupancy changed from five stacks to six slots.
- Selected the second sword by its actual DOM action ID, equipped it and then
  unequipped it. The same reference returned selected to the bag. Displayed
  damage changed 58 → 55 and attack rate 2.67 → 3.14 while worn.
- Sold the other sword: only its button disappeared and gold became 253.
  Buyback restored that same ID and 237 gold. A purchased ring received a new
  ID, with the previous spare still present; gold became 209.
- Cancelled a rare Moonshard sale and retained the item; confirmed the sale,
  received 24 gold, then bought back the exact original instance for 24 gold.
- Re-equipped Moonshard and swapped the newly purchased ring into Ring 2.
  The preceding ring returned to the bag as its original instance.
- Reloaded: the selected ring's ID, separate sword/spare-ring IDs, seven occupied
  bag slots, 209 gold, 450 maximum HP, 58 strike damage and 14 spent/four unspent
  talent points persisted. The migration notice did not recur.
- Checked dark/light desktop presentation and a 390 × 820 iframe. The narrow
  panel measured 330 px client width and scroll width; bag selections and details
  remained accessible through vertical scrolling. No layout/CSS redesign.
- No Realm console errors/warnings in the final filtered check. Browser-extension
  metadata errors were present and unrelated to the game.

No full campaign replay, physical mobile, Firefox/Safari or GPU/FPS benchmark was
performed. Full bags, maximum migrations, pending-loot integrity, import recovery
and malformed graphs were automated checks, not all repeated in the browser.
Publication awaits explicit merge authorization for the 0.4.3 PR.

---

# v0.4.2 verification — 2026-11-16

## Automated verification

`node --test games/realm/tests/*.test.mjs`: **115 passed, 0 failed**.
The 100 prior checks remain, with slot-count, version and authored-loot
expectations updated. Fifteen new checks cover:

- Every authored equipment item against all ten slots, category validation,
  invalid explicit targets, two-ring ownership, repeated swaps and conservation.
- Full bags/full stacks, failure without partial transfer, correct talent-aware
  stats, health clamping and no healing or accumulating bonuses.
- An actual v0.4.1 save fixture generated using modules at `4712fe5`: the original
  three slots and persisted progress survive, with seven new slots empty.
  All-ten-slot saves, duplicate rings, pending loot and malformed slot references
  are checked alongside the existing v0–v3 migration/recovery tests.
- Buying, selling and buying back spare rings while both worn copies stay
  protected; all twelve new items' icons, prices and acquisition sources.
- Actual simulated kills obtaining every new enemy-drop item, including blocked
  loot remaining available when the bag is full.
- Slot-specific ring comparisons, ten panel buttons, actual UI command targets
  and selection/focus. A queued close event cannot clear an already reopened view.

Generated HTML freshness, JavaScript syntax and `git diff --check` pass.
All changes are confined to `games/realm/`.

## Actual Chromium verification

- Continued the existing v0.4.1 QA journey: old equipment, bag, level, talents
  and quest progress retained; new slots empty, without another migration notice.
- Checked all ten labeled slots in dark/light desktop layouts, 800 × 650 and
  390 × 820 iframe viewports. Narrow panel widths matched scroll widths; vertical
  scrolling exposed details and actions without horizontal overflow.
- Bought three Hearthcopper Bands; equipped Ring 2 first, then Ring 1. Each
  command consumed exactly one copy and increased maximum HP by four without
  granting current HP. Comparisons used the selected ring slot.
- Unequipped/re-equipped Ring 2, sold and bought back the spare ring while both
  worn copies remained intact. Bought/equipped a cap, gloves and trousers;
  displayed maximum HP and damage updated immediately.
- Reloaded with eight occupied slots, five bag stacks, 237 gold and unchanged
  talents/quest progress. Both ring copies remained equipped.
- Verified actual idle portrait pixel changes in a focused window. The existing
  preview lifecycle/reduced-motion tests also pass; preview code is unchanged.
- Fast Character → Ivo switching exposed a queued native close event clearing
  the merchant view. After the narrow guard fix, selling the spare ring changed
  gold immediately from 237 to 243 and showed buyback; buying back restored 237.
- No Realm console warnings/errors in the final check.

Every slot/item combination, full-bag edges and legacy recovery are automated
checks, not all manually repeated. No full campaign replay, Firefox/Safari,
physical mobile or low-powered Windows/GPU benchmark was performed. Narrow
menus do not add touch gameplay. Deployment verification awaits merge approval.

## Balance and performance samples

See [equipment-expansion.md](equipment-expansion.md) for the level-5 boss sample:
secondary gear provides modest gains and avoiding attacks still saves potions.

Five warmed-up alternating samples per version, each 36,000 ticks with 17
enemies, level 6, mixed talents, circular movement, melee/Burst and invulnerability
to sustain the run; events were drained each tick. v0.4.1 wore its three primary
items; v0.4.2 wore all ten slots:

- Baseline median: **0.026623 ms/tick**.
- Expanded median: **0.032942 ms/tick**.

The full-loadout sample adds about **0.00632 ms/tick** (24% relative). These are
host CPU timings, not browser FPS/GPU measurements. No additional rendering loop
or dependency is introduced; the existing bounded world and cached preview remain.

---

# v0.4.1 verification — 2026-11-15

## Automated verification

`node --test games/realm/tests/*.test.mjs`: **100 passed, 0 failed**.
All 91 prior checks remain. Nine new focused checks cover:

- Presentation without state mutation or save-schema changes; escaped names,
  the three real equipment slots, bag-only copies and duplicate quantities.
- Item details, rarity, empty slots, named actions and equipment comparisons.
- Grouped values from actual stats and accurate combat explanations.
- Actual UI click handlers with DOM doubles: successful equip/unequip selection,
  complete action identity, keyboard focus, scroll preservation and view cleanup.
- Full-bag rejection preserving state, selection and action focus.
- Cached sprite drawing, time-based idle motion and the 30-draw/second ceiling.
- Offscreen/hidden/unfocused/disconnected preview suspension and cleanup.
- Reduced motion, repeated mount/unmount without leaked callbacks/listeners,
  and missing-context/sprite fallback.

Existing save migration, capacity, trading/buyback, talent/combat and quest tests
remain green. JavaScript syntax, generated HTML freshness and `git diff --check`
pass. All changes are confined to `games/realm/`; save schema remains **4**.

## Actual browser verification

Chromium, using the existing disposable v4 QA character:

- Loaded level 20, 403 gold, four potions and 14 spent/four free talent points
  without a migration notice. Checked light and dark desktop presentation.
- Unequipped Wolf’s Fang: the weapon slot became empty and its bag stack grew
  to two. Equipping it moved one copy back. Selection, keyboard focus, item
  details and actual strike/attack-speed values followed both transfers.
- Equipped Moonshard from the bag: it disappeared from the bag, Wolf’s Fang
  returned to its stack of two, and the equipment slot/detail showed Moonshard.
- Compared successive portrait screenshots with no intervening state mutation:
  pixels changed, confirming the visible idle animation.
- Reloaded and retained Moonshard, Travel Coat, Runeweaver Prism, the correct
  four bag stacks, 403 gold and the talent allocation.
- Inspected 800 × 650 and 390 × 820 iframe viewports. The dialog had no horizontal
  overflow (740/740 and 330/330 client/scroll widths). Scrolling exposed the bag,
  grouped stats and action button without clipping.
- Reopened Ivo after using the panel, sold one Forest Amber (403 → 407 gold,
  four → three copies), then bought it back (403 gold, four copies).
- Reopened Character & bag and captured the final dark-theme view. No Realm
  warnings/errors were captured in the final console check.

Full-bag edge cases, hidden/reduced-motion lifecycle and talent/combat/quest
regressions were verified by automated tests, not a new manual campaign run.
No Firefox/Safari, physical mobile, low-powered Windows hardware or browser
FPS/GPU benchmark was performed. The narrow layout does not add touch gameplay.
Equipment appearance changes are intentionally deferred; the portrait shows the
existing base sprite. Deployment verification awaits merge authorization.

---

# v0.4.0 verification — 2026-11-14

## Automated verification

`node --test games/realm/tests/*.test.mjs`: **91 passed, 0 failed**.
The 73 prior checks remain with obsolete shared-ownership expectations updated.
The 18 new equipment checks cover:

- Starter ownership; weapon, armor and charm transfers; duplicate copies and
  same-item swaps; invalid/unowned items, malformed IDs and slot validation.
- Full-bag unequip rejection, swaps that free a slot, swaps that cannot free a
  slot, stacking into a full bag and full-stack rejection with no partial changes.
- Exact item conservation, no healing or permanent stat stacking, and unchanged
  talents/cooldowns during repeated gear changes.
- A fixture generated by the actual v0.3.1 modules at commit `0da30f1`: all
  persisted data remains identical except the intended three bag deductions.
  Ten save/load cycles keep those deductions stable and preserve stats.
- Every supported old schema (v0–v3), malformed/missing references, independent
  v4 equipment, over-capacity bags and no resurrection of starter items.
- Untouched migration backups, backup-write failure protection, corruption
  recovery, legacy imports and failed import writes preserving the current save.
- Selling bag duplicates while protecting worn copies, rare confirmation,
  purchases, buyback replay prevention and 20 repeated trading/equipment cycles.
- Bag-only capacity, equipment drops, duplicate presentation and comparisons.

Existing quest/chest/loot-capacity, combat, talent countdown, respec and custom
rare-sale UI regression tests also pass. JavaScript syntax, generated HTML
freshness and `git diff --check` pass. Changes are confined to `games/realm/`.

## Actual browser smoke test

Chromium, with the existing disposable v0.3.1 QA character:

- Startup displayed the equipment migration notice. Moonshard and Travel Coat
  remained equipped but no longer appeared in the bag; occupied stacks fell
  from seven to five. The character retained level 20, 403 gold and talents.
- Equipped one of two Wolf’s Fang copies: one remained in the bag and Moonshard
  returned to it. Strike damage changed 57 → 54 and strikes/second 2.67 → 3.14,
  matching the comparison. A same-item swap preserved quantity; unequip returned
  both copies to the bag and removed the weapon bonus.
- Sold the spare Wolf’s Fang while wearing the other (403 → 419 gold). The worn
  copy stayed protected and another sale was disabled. Buyback restored the
  spare and returned gold to 403.
- Equipped Runeweaver Prism, unequipped Travel Coat and equipped it again.
  Charm/armor moved in and out of bag entries and the displayed stats updated.
- Reloaded: all three equipped items, the spare sword, five occupied bag stacks,
  four potions, 403 gold and the talent allocation persisted. No migration notice
  appeared again. The existing light-theme panel fit the desktop viewport.
- No `/games/realm` errors were captured in the final console check.

Full-bag edge cases, import/recovery failures and the other legacy schemas were
verified by automated tests, not this browser smoke test. No new Firefox/Safari,
mobile, full-campaign or hardware performance pass was performed. No gameplay
content or visual redesign was added. Deployment verification awaits merge.

---

# v0.3.1 verification — 2026-11-14

## Automated verification

`node --test games/realm/tests/*.test.mjs`: **73 passed, 0 failed**.
The 64 baseline checks remain; nine additional checks cover:

- Translation interpolation, English fallback, missing keys/arguments, HTML
  escaping and literal user text.
- Catalog references, placeholder counts, remaining Swedish source copy, and
  generated HTML freshness, language, metadata and accessible navigation.
- Exact persisted-data round-trip of a Swedish v0.3.0 fixture generated with
  the pre-localization code: name, equipment, inventory, talents, reset history,
  quests, discoveries, checkpoint and buyback. Save schema remains version 3;
  the original backup remains unchanged.
- Transactions, quest completion and paid respecialization using that fixture.
- Every rank of all 24 talents and correct next-rank descriptions.
- Actual UI handlers for rare-sale cancel/confirm and merchant-distance
  revalidation, talent-panel combat countdown/unlocking, and stale NPC feedback.
  These handler tests use DOM doubles; they are separate from browser QA below.

An independent comparison with the pre-localization baseline confirmed unchanged
gameplay IDs, item/enemy/quest numerical data, rewards, checkpoints, talent
structures and every talent rank's effects, excluding display text.

`node games/realm/scripts/localize-html.mjs --check`, JavaScript syntax checks
and `git diff --check` pass. Changes are confined to `games/realm/`.

## Actual browser verification

Chromium, 2026-11-13–14, with a disposable QA character:

- Loaded an existing character and checked English welcome, HUD, menus,
  tooltips, NPC dialogue, quest objectives and rewards.
- Accepted Light Along the Trail, gathered a glimmerherb and killed a Thornroot
  with Glimmerbolt; the quest tracker and gold updated correctly.
- Opened Talents during combat: the visible countdown ran while the panel
  stayed open, learning was disabled, then became available automatically.
  Learned Barkskin ranks 1 and 2 successfully.
- At Ivo, bought a healing potion (415 → 403 gold), cancelled a rare Moonshard
  sale without losing the item, confirmed it through the custom in-game dialog
  (403 → 427), then bought it back (427 → 403).
- Equipped Moonshard and observed the corresponding stat changes. Reloaded
  and retained the QA character, equipment, four potions, 403 gold and talent
  allocation (14 spent, four unspent).
- Checked dark/light panels and a 390 × 820 iframe viewport. All seven ability
  buttons fit; talent branch tabs work and the 330-pixel panel has no horizontal
  overflow. Verified the localized narrow “Bag” label and welcome-heading
  spacing after fixing them.

Respecialization is covered by automated tests in this release, not a new manual
browser run. No full five-quest campaign replay, Firefox/Safari run or physical
low-powered Windows hardware test was performed. Narrow-layout checks do not
add touch gameplay; the game remains designed for desktop keyboard controls.
Deployment verification is pending merge.

## Performance comparison

Five alternating warmed-up samples per version, each with 36,000 fixed ticks,
17 enemies, movement, attacks and abilities using a mixed talent build:

- Pre-localization baseline median: **0.021424 ms/tick**.
- v0.3.1 median: **0.021410 ms/tick**.
- Talent-panel HTML generation: **0.161429 ms/render** over 1,000 renders.

No measurable simulation regression in this sample. These are host CPU timings,
not browser FPS or GPU measurements.

---

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
