# Project Realm — Lyktdalen, v0.1.0

An original, single-player, top-down fantasy RPG for Hirrdirr.se.
Play at [/games/realm/](https://hirrdirr.se/games/realm/).

## First chapter

- A connected 1920 × 1280 world: safe village, mossy trail, river crossing,
  forest and ancient beacon.
- Three villagers: Elin gives a two-part quest chain, Mira heals and offers an
  herb quest, and Ivo buys amber and sells healing potions.
- Three enemy types, including the Rootbound Warden. Enemies wander, pursue,
  telegraph attacks, return home and respawn when the player is far away.
  The defeated boss stays defeated.
- Sword attack, Lantern Strike, dodge and potions. Attacks face the nearest
  target within melee range; the area attack hits all nearby enemies.
- XP, levels (cap 20), three equipment slots, item information, loot and gold.
  Eight item definitions with stable IDs and three rarities.
- Three one-time exploration caches. Herbs collected before accepting Mira's
  quest still count; early boss exploration cannot strand the final quest.
- Death returns the player to the village without losing progression.
- Synthesized effects, volume control, 30/60 FPS selection, pause,
  reduced-motion support and a minimap.
- Local autosave, backup recovery and JSON export/import.

This release is for a keyboard-equipped PC. The UI rearranges on narrow screens,
but touch movement and controller input are not implemented. There are no online
players, accounts, shared economy, interiors, character classes or backend.

## Controls

| Input | Action |
| --- | --- |
| WASD / arrow keys | Move |
| Space / left click on world | Sword attack |
| Q | Lantern Strike; 5-second cooldown |
| Shift | Dodge in the current movement/facing direction |
| R | Healing potion; 8-second cooldown |
| E | Speak, gather, open, rest or light the beacon |
| I / C | Character and inventory |
| J | Quest journal |
| Esc / P | Pause and settings |

Talk to **both Elin and Mira** before leaving the village. Follow the road east.
The beacon is northeast, across the bridge. Enemy attack markers give time to
move or dodge. Walk close to loot to collect it. Menus and inactive tabs pause
the game. A pause overlay requires an explicit resume after focus loss.

## Run and test

No build or installation is required for production. GitHub Pages serves the
standalone HTML, CSS, native ES modules and WebP assets directly.

From the repository root, use any static HTTP server, for example:

    python3 -m http.server 8000

Open http://localhost:8000/games/realm/ (ES modules require HTTP).

Run the dependency-free Node tests:

    node --test games/realm/tests/*.test.mjs

The dedicated GitHub Actions workflow runs these tests and syntax checks.
See [verification.md](docs/verification.md) for the verification record.

## Why Canvas and native JavaScript?

This is a small 2D game on a static site. Canvas 2D, ES modules and standard DOM
menus keep its download and deployment simple, fit the site's existing games,
and require no runtime packages. Game rules have no browser dependencies and
run unchanged in Node tests. A larger content scope can justify adopting a
rendering engine later without rewriting the content and rule modules.

## Source map

| Module | Responsibility |
| --- | --- |
| js/data.js | Stable item, enemy, NPC and quest definitions |
| js/world.js | Terrain, placements, safe zone, collision and world queries |
| js/simulation.js | State, actions, combat, AI, progression and fixed ticks |
| js/save.js | Save DTO, validation, v0 migration and persistence adapter |
| js/art.js | Original pixel sprites, rasterized once |
| js/renderer.js | Cached ground, culled sprites, camera, effects and minimap |
| js/ui.js | DOM dialogs, inventory, quests and HUD |
| js/audio.js | On-demand Web Audio effects |
| js/main.js | Input, lifecycle, fixed-step loop and adapter wiring |

## Saves

The primary key is **hirrdirr.realm.save**, with version **1**. The JSON envelope
has version, savedAt and data fields. The DTO contains the player, equipment,
inventory, quests, permanent world flags, discoveries, collected herbs, opened
caches, play time and the simulation RNG seed.

Transient enemies, drops, particles and cooldowns are intentionally not saved.
Normal enemies reset on load; permanent boss defeat persists. This first release
does not promise exact encounter continuation or resistance to offline save editing.

Autosave runs every 15 seconds during play, on important progression events,
on visibility loss and page exit. Browser crashes or termination can still lose
recent actions; export a JSON backup before clearing site data or switching PCs.
Use one active game tab per browser profile.

Before a successful write, the last readable save is kept under the .backup
suffix. Unreadable raw data is retained under .recovery. A valid backup is loaded
when possible. Future versions and unrecoverable corruption block automatic
overwriting and show a visible warning. The player can export the temporary
journey or explicitly confirm a new journey/import. Files above 256 KiB are
rejected, IDs are whitelisted, values are bounded, and invalid positions fall
back to the village. The recognized v0 envelope is migrated.

## Performance

The 60 Hz fixed simulation is independent of the selected render rate. Long
frames are clamped to 100 ms; substepped movement prevents collider tunneling.
The browser canvas is capped at 960 × 720 regardless of device pixel ratio.
Static terrain uses an approximately 9.4 MiB cached canvas; sprites are cached
at startup, offscreen objects are culled, and enemies/effects are bounded.
HUD updates are limited to 10 Hz. Menus and focus/background pause cancel the
animation loop. Audio only creates short-lived oscillators after user input.
The 30 FPS setting lowers rendering work without changing the simulation.

See [architecture.md](docs/architecture.md) for the multiplayer and desktop path.
No networking layer or credentials are included in this release.
