# Project Realm — Lantern Vale, v0.3.1

An original, single-player, top-down fantasy RPG for Hirrdirr.se.
Play at [/games/realm/](https://hirrdirr.se/games/realm/).

## 0.3.1 — English Localization & Final Polish

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

- Seven offers: a potion and six equipment choices, including Ironroot,
  Duskweave and Runeweaver Prism. Protection, movement/attack rate and spell
  damage are distinct choices; purchase prices always exceed sale prices.
- Equipped items must be taken off first. The bound quest reward Beacon’s Heart
  cannot be sold. Rare sales require confirmation.
- The bag holds 16 different item stacks, each capped at 999 copies. Existing
  overflowing saves retain their possessions. Buying existing stacks is still
  possible when all slots are occupied. Quest/chest rewards remain unclaimed
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

## Explore Lantern Vale and Emberfen

The connected 1920 × 1280 world includes a safe village, forest, river crossing,
ancient beacon, camp and marsh. Start with **Elin** and **Mira**, follow the
beacon quest, then meet **Signe** east of the bridge. Read the three marsh
runestones, face **Fenheart** and restore the sluice seal.

- Five linked quests, four exploration caches, local discoveries and loot.
- Five enemy types: ordinary melee, telegraphed wolf pounces, ranged Emberwings
  and two bosses. Boss defeat persists; ordinary enemies eventually respawn.
- Every third connected sword hit deals 35% extra base damage. Lantern Burst
  interrupts ordinary enemy attacks; boss telegraphs still require avoidance.
- Select a target, read its intent and move or dodge away from warnings.
- Death returns you to the last rested lantern with items, XP and quests intact.
- Volume control, dark/light theme, reduced motion, minimap and 30/60 FPS options.

This is a keyboard-equipped PC release. Menus adapt to narrow screens, but
there is no touch movement or controller support. There are no online players,
accounts, shared economy, interiors or backend. This phase expands RPG systems
and combat styles within the existing world, rather than adding another zone.

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
| js/data.js | Stable item, enemy, NPC, loot and quest content |
| js/talents.js | Talent definitions, effects, point budgets and rank validation |
| js/inventory.js | Slot/stack capacity and complete reward preflight |
| js/trading.js | Merchant stock, quotes, individual transactions and buyback |
| js/world.js | Terrain, placements, safe areas and indexed collision queries |
| js/simulation.js | Commands, player combat, progression and fixed ticks |
| js/enemy-ai.js | Enemy intents, pounces, projectiles and eruptions |
| js/save.js | Save DTO, validation, migrations and persistence adapter |
| js/art.js | Original pixel sprites, rasterized once |
| js/renderer.js | Cached ground, culled sprites, camera, effects and minimap |
| js/ui-panels.js | Trading/talent markup and shared item comparisons |
| js/ui.js | DOM dialogs, interaction, inventory, quests and HUD |
| js/audio.js | Short on-demand Web Audio cues |
| js/main.js | Input, lifecycle, fixed-step loop, events and adapter wiring |

The rule/content modules have no browser dependencies and run unchanged in
Node. See [architecture.md](docs/architecture.md) for future networking and
desktop boundaries. No networking layer or credentials are included.

## Saves

The key remains **hirrdirr.realm.save**, with unchanged schema version **3**. The DTO
contains character progression, inventory/equipment, talent ranks, respec count,
quests, permanent flags, discoveries, opened caches, herbs, runes, checkpoint,
cooldowns, uncollected loot, buyback, elapsed time and the simulation RNG seed.
Unspent points are derived from level and validated ranks, never trusted from JSON.

Enemies, projectiles, guard/retaliation buffs, eruption markers, combos and
particles are transient. Normal enemies reset on load; boss defeat persists.
This release does not promise exact encounter continuation or protection from
intentional offline save editing.

Autosave runs every 15 seconds, on progression, every successful trade/talent
change/respec/equipment change, and on visibility loss/page exit. Progression
events within one batch share a write. The UI warns if storage fails; export a
JSON backup through the menu before clearing site data or changing computers.

The previous readable save is retained as `.backup`; corrupted input is kept
as `.recovery`. Future-version saves and unrecoverable corruption block automatic
overwriting. Imports/new journeys require confirmation. Files above 256 KiB are
rejected, IDs are whitelisted and values/positions validated. Old v0/v1/v2 saves
get untouched `.v0`/`.v1`/`.v2` backups before autosave. If that backup cannot be
written, the old original stays protected and the temporary journey can be exported.

Version 3 never recreates sold starter equipment. Older over-capacity inventories
are retained, invalid talent allocations are reconstructed within legal budgets,
and saved buyback prices are validated against authored sale values.

## Performance

Simulation runs at a fixed 60 Hz independently of render rate. Long frames are
clamped to 100 ms, movement/projectiles are substepped, and the canvas is capped
at 960 × 720 regardless of device pixel ratio. Static terrain and sprites are
cached; offscreen sprites are culled. Player shots (6), enemy shots (32), hazards
(12), effects (70), drops (64), events (100) and buyback (8) are bounded.
HUD updates at most 10 times/second. Pausing menus and background tabs cancel the
animation loop; the talent panel intentionally continues simulation. The 30 FPS setting reduces drawing work without changing game rules.

## Next roadmap milestone

**0.4.0 — Equipment Foundation** will separate equipped items from inventory,
prepare additional equipment categories and safely migrate existing saves.
None of that milestone is implemented in this localization release.
