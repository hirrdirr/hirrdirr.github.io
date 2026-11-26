# Project Realm — Lantern Vale, v0.5.4

An original, single-player, top-down fantasy RPG for Hirrdirr.se.
Play at [/games/realm/](https://hirrdirr.se/games/realm/).

## 0.5.4 — Immersive HUD

The world fills the game window. Level and XP sit at the top center. The target frame shows exact health and attack intent, while the smaller plate above the enemy shows its name, level and remaining health. Click the zone name or **Quests** to fold either overlay. Press **J** for the full journal.

Open **Menu → Edit HUD** to move the player frame, target frame, minimap, tracker or ability bar. Drag a frame or use the position and scale fields with the keyboard. The world pauses while you edit. **Save layout** keeps the settings in this browser. **Reset HUD Layout** restores the defaults when saved. A clear band across the world keeps the character visible during combat. If the saved layout cannot fit a smaller window, the game uses its responsive defaults.

## 0.5.3 — World Content Expansion

After **The Last Casting**, speak to **Orin Pike** at the eastern edge of Cinder Reach. The causeway leads to **Linn Vale** at the Sounding House on Tideglass Shelf. Rest at its lantern before exploring the shell roads, tidal pools, Drowned Post Yard and Moon Dial.

| Area | New quests | Where to start |
| --- | ---: | --- |
| Lantern Vale and Mossglade | 4 | Speak to Mira, Elin and Nell at the west bridge landing. |
| Duskwood and Emberfen | 4 | After relighting the beacon, visit Signe and return to Nell. Look for the dry toll arch west of the beacon. |
| Cinder Reach | 2 | Orin knows what happened to the last shift and how to silence the return pipe. |
| Tideglass Shelf | 5 | Pick up **The Blue Road** from Orin. Four linked quests restore the Moon Dial. An optional delivery connects the packet yard with the old ferry. |

The journal groups quests by status, identifies the giver and recipient, and keeps field notes for re-reading. Finding an inscription before meeting its quest giver counts. Repairs need instructions, and the twin sluice gates respond to the pool readings. The tracker shows two active quests at a time.

Four regular enemies join the world. Knell fires three diverging shots at the forest toll arch. The Ebbwright alternates a ring with a safe centre and a targeted surge. They return after 90 and 160 seconds of active play respectively. The two hidden caches and quest rewards can each be claimed once.

## 0.5.2.1 — Floating abilities and viewport HUD

Level and XP share the upper HUD with health, target, zone and pause. The floating ability buttons keep their shortcuts and cooldowns. Near the southern edge the camera reveals a shaded strip of scenery below the playable map, leaving room for both the player and the interaction prompt.

## 0.5.2 — Cinder Reach

After restoring Emberfen’s seal and turning in **A Heart of Embers** to Signe, walk east through the southeast sluice. Ada Flint waits on the far bank. Follow her three quests along a broken cooling flume to the casting ring. The Slag Runner lunges, the Flue Watcher fires from range, and the Hollow Striker signals its hammer blow with a ground marker.

The Reach uses the same map, character and save slot as the Vale. World discoveries, inspections and quest completion persist. Ordinary enemies return after 28 seconds and the Striker after 150 seconds of active simulation. The chapter reward can be claimed once.

## 0.5.1 — Combat HUD

The XP strip above the abilities shows your level and progress to the next level. At level 20 it reads MAX LEVEL. Select an enemy with Tab or click it to see its level and exact health above its sprite. The target frame also shows its attack intent.

## 0.5.0 — XP Scaling & World Respawn

Enemy XP depends on the player's level **when the enemy falls**. A Thornroot
awards 16 XP at level 1, 10 at level 3, 4 at level 5 and zero from level 7.
The kill event and floating number use the XP actually credited. Quests and
exploration still use their authored rewards.

| Enemy level minus player level | ≤ −6 | −5 | −4 | −3 | −2 | −1 | 0 | +1 | ≥ +2 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Base kill XP | 0% | 10% | 25% | 45% | 65% | 85% | 100% | 110% | 125% |

Rewards round to the nearest whole XP, rounding halves up. Each open-world
enemy now returns with full health. Ordinary enemies take 28 seconds of active
world time, the Rootbound Warden takes 120 and Fenheart takes 180. The longer
Fenheart interval fits its role as the final encounter. Pausing or closing the
game pauses the countdown. Camping a spawn moves the returning enemy to a
clear nearby spot. Repeat victories award combat loot, gold and scaled XP.
The beacon, seal, quest completion and one-time quest rewards persist.

## Previous release: 0.4.4 — Randomized Gear Stats

Compare individual copies before equipping them. For example, a new Moonshard
can give 11 attack, the base 10 attack, or 9 attack and 6 maximum health. The
selected copy keeps its stats through equipment changes, sale, buyback and reload.
Ivo shows base stats before purchase. Bag and buyback details show the actual copy.

Enemy drops, caches and shop purchases can vary. Starter gear, quest rewards
and every item already in a save retain their authored values. The original
0.4.3 save is backed up before autosave upgrades it to schema 6.
See [roll rules and save compatibility](docs/item-identity.md#permanent-gear-stats-in-044).

## Previous release: 0.4.3 — Item Identity System

Every equipment copy now has a persistent identity. Identical swords and rings
appear separately in the bag and can be selected independently. Equip, swap,
unequip, sell and buyback move the exact selected copy; buying back gear restores
its original identity. Consumables and materials still stack. Each equipment
copy occupies one of the bag's 16 slots.

All ten equipment slots, item stats, prices, loot tables and the character-panel
layout are retained. Save schema **5** migrates v0–v4 journeys, including worn
rings, spare copies, buyback and outstanding ground loot. Original legacy files
are backed up before autosaving. If expanded legacy gear exceeds bag capacity,
every copy remains available; sell or equip items to make room.

See [item-identity.md](docs/item-identity.md) for the ownership and migration
contracts and [verification.md](docs/verification.md) for actual checks.


## Previous release: 0.4.2 — Equipment Expansion

Character & bag now has ten functional slots: Weapon, Armor, Charm, Head,
Shoulders, Hands, Legs, Feet, Ring 1 and Ring 2. Five slots sit on each side
of the existing animated portrait. Select bag gear to compare, equip or swap;
rings offer an explicit comparison and button for each ring slot. Wearing two
identical rings consumes two owned copies.

Twelve new items are available through Ivo and existing respawning enemies.
Their modest health, defense, attack, haste, movement and magic bonuses reuse
the existing combat calculations. No new world content or talent rules are
introduced. See [equipment-expansion.md](docs/equipment-expansion.md) for the
item catalog, sources and balance review.

Existing schema-4 journeys keep their three old equipped items, bag and progress;
the seven additional slots start empty. Legacy migration and backups remain
intact. A queued dialog-close event can no longer clear a newly opened merchant
view, keeping fast menu switches and trading feedback consistent.

## Previous release: 0.4.1 — Character Panel

Character & bag now puts the three equipment slots beside an animated pixel
portrait and grouped attributes, with the bag and selected item details below.
Select a worn item to inspect or remove it; select bag gear to compare and equip
it. Successful transfers select the moved copy, update stats immediately and
preserve keyboard focus and scroll position. Failed transfers retain selection
and show the existing rule-layer feedback.

The portrait reuses the actual cached player sprite, with subtle idle movement.
It draws at most 30 times per second and suspends when closed, offscreen or in
an inactive tab/window. Reduced motion displays a still portrait. The current
base appearance does not change with gear; the renderer has a separate extension
point for future equipment layers. No new artwork or dependencies are required.

Dark/light themes and scrolling desktop/narrow layouts share the existing game
styles. Only Weapon, Armor and Charm are functional. Equipment transactions,
combat, talents, trading and save schema **4** are unchanged. See
[character-panel.md](docs/character-panel.md) for the presentation boundaries and
[verification.md](docs/verification.md) for automated and actual browser checks.

## Previous release: 0.4.0 — Equipment Foundation

Weapon, armor and charm slots now own their equipped copies independently.
Equipping moves exactly one copy out of the bag; unequipping returns it. A swap
returns the old equipment only after checking the final bag contents, allowing
full-bag swaps when removing the incoming item frees the needed slot. A failed
transfer leaves equipment, bag and stats unchanged.

The bag and Ivo show only unequipped copies. Spare copies of the same item as
worn equipment can be sold normally; the worn copy is protected. Comparisons,
rare-sale confirmation, buyback and immediate equipment saves remain intact.
New characters carry three potions and wear one starter sword and coat.

Save schema 4 migrates v0–v3 ownership once, retaining the original before
autosave. See [equipment.md](docs/equipment.md) for invariants and recovery.
This release keeps the three existing slots, content, prices, stats, talents,
combat and character-panel layout. All player-facing copy remains English.

## Previous release: 0.3.1 — English Localization & Final Polish

All Realm player-facing copy is English, including HUD, controls, NPC dialogue,
quests, items, talents, world interactions, trade confirmations and save errors.
English copy lives in `js/locales/en.js`; `js/i18n.js` formats numbered placeholders
with a fallback for future locale dictionaries. Gameplay IDs stay unchanged.

Static HTML comes from `templates/index.html`. After changing its text or markup,
run `node games/realm/scripts/localize-html.mjs` and commit the generated
`index.html`. Tests reject stale output. GitHub Pages needs no build step.
See [localization.md](docs/localization.md) for terminology and authoring rules.

The live combat countdown in the talent panel and in-game rare-sale confirmation
remain intact. Narrow navigation now uses an accessible localized Bag label instead
of CSS-generated Swedish text. The welcome heading keeps word spacing on narrow
screens. Opening another NPC clears old panel feedback. No gameplay content,
balance, persistent IDs or save schema changed.

## Trading and talent systems

**Ivo** opens a dedicated trading window: his stock on the left, your bag
on the right. Select an item, inspect its rarity, stats, equipment comparison
and price, then buy or sell exactly one copy. The window stays open. The last
eight sales can be bought back at their original sale price, including after
reloading. There is no sell-all command or automatic conversion of equipment.

- Eleven offers: a potion and ten equipment choices, including Ironroot,
  Duskweave, Runeweaver Prism and four new common secondary-slot items. Protection, movement/attack rate and spell
  damage are distinct choices; purchase prices always exceed sale prices.
- Equipped items must be taken off first. The bound quest reward Beacon’s Heart
  cannot be sold. Rare sales require confirmation.
- The bag holds 16 slots. Equipment copies each occupy one slot; consumables
  and materials stack up to 999. Existing overflowing saves retain their
  possessions. Buying an existing stackable item remains possible in a full bag. Quest/chest rewards remain unclaimed
  if the complete reward cannot fit; nearby blocked loot stays on the ground.
- Transaction validation checks item ownership, stock, quantity, proximity,
  gold and capacity before moving either money or items. Stable buyback IDs
  prevent replaying a completed buyback. Trades save immediately.

Press **N** to open three visual talent trees, with eight talents each and
four tiers. Icons, prerequisite lines, rank badges, tooltips and the selected
node's current/next effect explain every investment. Desktop shows all trees;
small screens offer branch tabs. Every talent has an implemented game effect.

| Branch | Play style | Active ability |
| --- | --- | --- |
| Lantern Guardian | Health, defense, melee damage, potions, guarded retaliation | **1 — Lantern Ward:** temporary damage reduction |
| Dusk Hunter | Attack rate, movement, critical hits, combos, kill healing | **2 — Shadow Rush:** a collision-aware rush and strike |
| Runeweaver | Area damage, recovery, healing, range, piercing projectiles | **3 — Glimmerbolt:** a travelling light projectile |

- Earn one point per level from level 3: at most 18 points at level 20.
  A complete branch costs 15. Mix branches or specialize.
- Deeper tiers require 3, 6 or 10 points in their own branch, alongside the
  named prerequisite ranks. Investment is blocked during combat or death.
- **Mira**, west of the village lantern, restores all invested points. The
  first reset is free, subsequent resets cost 10 gold and require confirmation.
  Resets cancel talent buffs/projectiles without refreshing cooldowns or healing.
- The old two-choice specialization is retired. v0/v1/v2 journeys keep their
  progress and receive their level's points unspent, with an untouched backup.
- New abilities appear on the action bar only when learned. Guard status,
  critical-hit feedback, projectile/rush effects and synthesized cues accompany
  the systems. Offensive talent abilities require leaving the safe village/camp.
- Equipment comparisons and character stats include talent effects. Unequipping
  health gear clamps current health; equipping it again does not grant free healing.

## Explore Lantern Vale, Emberfen, Cinder Reach and Tideglass Shelf

The connected 3456 × 1280 world includes a safe village, forest, river crossing,
ancient beacon, camp, marsh and a salt coast beyond the Ashlands. Start with **Elin** and **Mira**, follow the
beacon quest, then meet **Signe** east of the bridge. Read the three marsh
runestones, face **Fenheart** and restore the sluice seal. Report back to Signe
before crossing the southeast spillway to meet **Ada Flint**.

- Twenty-three quests, six exploration caches, persistent field notes and regional discoveries.
- Fourteen enemy types with melee, pounce, projectile and ground attacks. All enemies
  respawn, including the Warden, Fenheart and the Hollow Striker.
- Every third connected sword hit deals 35% extra base damage. Lantern Burst
  interrupts ordinary enemy attacks; boss telegraphs still require avoidance.
- Select a target, read its intent and move or dodge away from warnings.
- Death returns you to the last rested lantern with items, XP and quests intact.
- Volume control, dark/light theme, reduced motion, minimap and 30/60 FPS options.

This is a keyboard-equipped PC release. Menus adapt to narrow screens, but
there is no touch movement or controller support. There are no online players,
accounts, shared economy, interiors or backend.

## Controls

| Input | Action |
| --- | --- |
| WASD / arrow keys | Move |
| Space / left click on world | Sword attack; hold Space for a combo |
| Tab with world focused / click enemy | Select target |
| Q | Lantern Burst |
| Shift | Dodge in movement/facing direction |
| R | Healing potion |
| 1 / 2 / 3 | Learned talent abilities |
| E | Speak, gather, open, rest or activate a landmark |
| I / C | Character and inventory |
| N | Talent trees |
| J | Quest journal |
| Esc / P | Pause/settings, or close a menu |

Most menus pause the world. The **talent panel keeps the world running**, including
enemy attacks and the combat countdown. You can learn talents anywhere outside
combat, without closing the panel when the countdown ends. Mira is still required
for respecialization. Inactive tabs and focus loss pause; the focus overlay requires
an explicit resume. Use one active game tab per browser profile.

## Run and test

Production requires no build or installation. GitHub Pages serves standalone
HTML/CSS, native ES modules and WebP assets. From the repository root, run any
static server, for example `python3 -m http.server 8000`, and open
http://localhost:8000/games/realm/ (ES modules require HTTP).

Run `npm run test:realm`, or `node --test games/realm/tests/*.test.mjs`.
The dedicated GitHub Actions workflow runs the tests and JS syntax checks.
See [verification.md](docs/verification.md) for coverage and observed limitations.

## Source map

| Module | Responsibility |
| --- | --- |
| js/i18n.js / js/locales/en.js | Plain-text English catalog and locale fallback |
| templates/index.html / scripts/localize-html.mjs | Static HTML source and generation |
| js/data.js / js/tideglass.js | Stable items, enemies, NPCs, loot, quest objectives and fieldwork |
| js/talents.js | Talent definitions, effects, point budgets and rank validation |
| js/item-instances.js | Persistent equipment identities and template resolution |
| js/inventory.js | Equipment slot definitions, atomic transfers, bag capacity and reward preflight |
| js/trading.js | Merchant stock, quotes, individual transactions and buyback |
| js/world.js | Terrain, placements, safe areas and indexed collision queries |
| js/simulation.js | Commands, player combat, progression and fixed ticks |
| js/enemy-ai.js | Enemy intents, pounces, projectiles and eruptions |
| js/save.js | Save DTO, validation, migrations and persistence adapter |
| js/art.js / js/tideglass-art.js | Original pixel sprites, rasterized once |
| js/renderer.js | Cached ground, culled sprites, camera, effects and minimap |
| js/ui-panels.js | Trading/talent markup and shared item comparisons |
| js/ui.js | DOM dialogs, interaction, inventory, quests and HUD |
| js/audio.js | Short on-demand Web Audio cues |
| js/main.js | Input, lifecycle, fixed-step loop, events and adapter wiring |

The rule/content modules have no browser dependencies and run unchanged in
Node. See [architecture.md](docs/architecture.md) for future networking and
desktop boundaries. No networking layer or credentials are included.

## Saves

The key remains **hirrdirr.realm.save**, with schema version **6**. The DTO
contains character progression, inventory/equipment, talent ranks, respec count,
quests, permanent flags, discoveries, opened caches, herbs, runes, checkpoint,
cooldowns, uncollected loot, buyback, elapsed time and the simulation RNG seed.
Unspent points are derived from level and validated ranks, never trusted from JSON.

An optional schema-6 `respawns` map stores remaining seconds for defeated
enemies, keyed by type and authored home coordinates. Reloading resumes that time.
The loader checks known spawns, clamps excessive timers to the configured delay,
and treats missing or invalid timers as ready. Older journeys without the field
can encounter previously defeated bosses immediately and keep their story flags.
Living enemies restart healthy at home. Projectiles, guard/retaliation buffs,
eruption markers, combos and particles are transient.
This release does not promise exact encounter continuation or protection from
intentional offline save editing.

Autosave runs every 15 seconds, on progression, every successful trade/talent
change/respec/equipment change, and on visibility loss/page exit. Progression
events within one batch share a write. The UI warns if storage fails; export a
JSON backup through the menu before clearing site data or changing computers.

The previous readable save is retained as `.backup`; corrupted input is kept
as `.recovery`. Future-version saves and unrecoverable corruption block automatic
overwriting. Imports/new journeys require confirmation. Files above 8 MiB are
rejected; the larger limit accommodates expanded legacy equipment stacks. IDs
and ownership references are validated. Old v0–v5 saves
get an untouched `.vN` backup before autosave. Imported legacy files
are also retained as `.import.vN` (the latest import for that schema version). If that backup cannot be
written, the old original stays protected and the temporary journey can be exported.

Schema 6 stores equipment records once, with one reference in the bag, a worn
slot, buyback or a ground drop. IDs persist through transfers and reloads. Invalid
or conflicting references reject the save as a whole and use the existing
backup/recovery path. v4 migration treats bag copies and worn copies separately;
v0–v3 first deduct their valid shared equipped copies exactly once. Migration
never invents missing starter gear. See [item-identity.md](docs/item-identity.md).

## Performance

Simulation runs at a fixed 60 Hz independently of render rate. Long frames are
clamped to 100 ms, movement/projectiles are substepped, and the canvas is capped
at 960 × 720 regardless of device pixel ratio. Static terrain and sprites are
cached; offscreen sprites are culled. Player shots (6), enemy shots (32), hazards
(12), effects (70), drops (64), events (100) and buyback (8) are bounded.
HUD updates at most 10 times/second. Pausing menus and background tabs cancel the
animation loop; the talent panel intentionally continues simulation. The 30 FPS setting reduces drawing work without changing game rules.
