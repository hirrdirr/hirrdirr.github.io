# Core Defense · v2

A 30-wave tower defense campaign at `/games/td/`, built with native JavaScript modules, Canvas and CSS. Production remains a static Jekyll page; no bundler, npm dependencies or server are required to play.

## Play

Click **Start Game** on the artwork menu to open the game. Choose Normal or Easy
before starting; the existing Relay Station is currently the only playable map.
Reloading the page returns to the menu; restarting an ongoing game works as before.

Build towers beside the road and Spike Traps on it, protect the core and survive wave 30. Select a placed tower to inspect, upgrade, change targeting or sell it; select a trap to inspect its remaining HP, damage and kills or sell it. Mouse placement is immediate; touch placement uses a separate **Bygg här** confirmation. Keyboard: 1–3 selects game speed, arrows on the focused board move the cursor, Enter builds/selects, Escape cancels, Space pauses, R toggles ranges. Shift allows repeated placement. Number keys do not select towers or traps.

Pause freezes combat but permits planning and purchases. Opening help/restart pauses and closing restores the previous pause state. Hiding the tab pauses the game. Speed controls affect simulation time, not damage rules. Restart clears the entire session; there is no saved campaign yet.

## Content and rules

| Tower     | Main role                                      | Upgrade specializations                     |
| --------- | ---------------------------------------------- | ------------------------------------------- |
| Repeater  | Affordable general defense                     | Damage / rapid fire                         |
| Långskott | Long-range armor penetration                   | Heavy precision / faster follow-up shots    |
| Bastion   | Heavy direct damage and small splash           | Armor breaking / larger splash              |
| Nova      | Artillery with a minimum range                 | Blast area / burning ground impact          |
| Frostlänk | Slow and group control                         | Stronger control / damage and vulnerability |
| Gatling   | Short-range sustained fire, weak against armor | Fire rate / armor penetration               |
| Relä      | Nearby tower support                           | Attack support / range support              |

Each tower has two paths with three upgrades each. Both first tiers may be bought. Buying tier two commits to that path; the other path's tier two and three become unavailable. A sale refunds 70% of the complete investment, rounded down. Statistics count actual damage and credited kills, including lingering damage after selling a tower.

Target modes: First/Last use progress along the full path; Strong/Weak use current HP; Closest uses distance. Ties resolve deterministically. Support bonuses use the strongest applicable value rather than stacking. Weaker slow, burn and vulnerability applications do not extend a stronger effect.

Enemies include normal, fast, very fast, tank, armored, regenerating, elite and boss variants. Bosses have slow resistance and a periodic armor pulse. Waves 10, 20 and 30 introduce bosses. Authored combinations, spacing, reinforcements and act-based scaling vary pressure without an endless linear HP ramp. The next-wave preview shows the composition before committing.

An early wave can start once the previous wave has sent all enemies, with at most two active waves. The 8–25 credit bonus is paid once per accepted start. Completion rewards are separate. Escaped enemies never grant kill rewards; heavy enemies inflict more core damage. Wave 30 ends in victory after all active encounters clear.

## Spike Trap

| Rule | Value |
| --- | --- |
| Cost | 50 credits |
| Damage | 32 physical damage per enemy passage |
| HP | 10; each distinct enemy contact consumes 1 HP |
| Cooldown / regeneration | None; animation never blocks another contact |
| Depletion | Last hit still deals damage; remove after its 0.24-second strike animation |
| Sale refund | 70% of the remaining HP value, rounded down (35 unused, 31 at 9 HP) |
| Contact | 28 world-pixel interval along the route, centered on the trap |
| Placement | Road only, snapped to its center; clicks up to 26 pixels from it |
| Separation | At least 44 pixels both along the route and in world space |
| Entrance/core clearance | 48 route pixels from either end |
| Upgrades / targeting / relay bonuses | None |

The trap starts retracted. Contact raises the spikes immediately; they retract
again over 0.24 simulation seconds. Every distinct passing enemy can be hit,
even during that animation or on the same simulation step, while HP remains.
A normal enemy, armored enemy or boss each consumes exactly 1 trap HP. The same
enemy cannot take another hit or consume another HP while standing on the trap.

Contact uses swept route distance, so swift enemies and bends cannot skip it.
Contacts are processed in arrival order, with stable enemy IDs resolving ties.
A stack of 100 enemies can use only the ten available hits; HP cannot become
negative. At 0 HP the final strike stays visible briefly, then the trap is
removed, its road space is freed and its selection cleared. No automatic refund
or refill occurs. Pause freezes HP, animation and removal; 1×/2×/3× share the
fixed simulation clock. Restart clears all traps and contact history.

Cost and per-hit damage are unchanged. The finite ten-hit capacity caps total
raw damage at 320, making the trap a consumable road support option. A fresh
Normal drone has 38 HP, so one trap cannot kill it. Armor, boss armor pulses,
vulnerability, regen delay, kill rewards and damage statistics still use the
existing damage pipeline. Selling remains available during pause, with the
refund scaled to remaining HP so spent hits cannot be resold as a fresh trap.

Spacing, all seven towers, upgrades, waves, enemies, difficulty settings and map
art remain unchanged. Sprite crops, animation states and draw sizes are in
[`assets/README.md`](assets/README.md#spike-trap).

## Structure

- `menu.js` / `menu.css`: responsive artwork menu and percentage-based button overlays. Start Game reveals the game, then imports `td.js` once; no game loop or game controls run before that click.
- `assets/ui/core_defense_menu_01.png`: owner-provided start menu artwork; see `assets/README.md` for conventions.
- `td.js`: game entry point, pointer/keyboard input, resize/visibility handling and animation scheduling.
- `js/data.js`: tower/enemy definitions, upgrade prices and stat calculation.
- `js/map.js`: grid, blocked cells and distance-based path geometry.
- `js/waves.js`: authored wave schedule, previews and scaling.
- `js/engine.js`: DOM-independent simulation, validated game commands and events. Stable IDs identify towers/enemies; selection never relies on array indices.
- `js/traps.js`: separate trap definitions, road placement, contact selection and consumable HP; traps have their own collection and stable IDs.
- `js/trap-sprites.js`: measured owner-supplied sheet crops, loading/retry/failure fallback, icons and simulation-driven trap frames.
- `js/renderer.js`: Canvas art, cached terrain, indicators and bounded visual effects.
- `js/enemy-sprites.js`: presentation-only walk sheets for all eight enemy kinds, fixed frame crops, aspect-preserving pixel-sharp scaling and horizontal facing.
- `js/ui.js`: HUD, shop, inspector, dialogs and accessible feedback. The inspector replaces the shop while inspecting a tower.
- `td.css`: scoped responsive styling with reduced-motion support.

The simulation advances at 60 fixed steps per simulated second. A clock accumulator preserves consistent results at 1×/2×/3× and different rendering rates, caps long frames and drops excess real time after stalls. Projectiles retain target IDs and source ownership; dead or escaped targets cannot pay rewards twice. Rendering uses device-pixel-ratio scaling, a cached background and capped effects; DOM statistics refresh at 10 Hz.

The entry page uses an import map to version **every** production JavaScript
module with the Jekyll build timestamp, including the delayed `td.js` import.
This prevents a returning browser from mixing a cached pre-trap engine with a new
renderer (which would stop the first frame before the map is drawn). Stylesheets
use the same build version. Add new modules to the import map in `index.html`;
the deployment tests check graph coverage and shared module identity. The local
Vite preview substitutes `td-dev` for the Jekyll timestamp.

Add content through the data/wave definitions. Add new combat mechanics to the engine and corresponding rule tests; keep presentation and particles in the renderer. Avoid adding browser dependencies to the engine.

## Development and checks

Use Node 24:

```sh
npm ci
npm run dev
npm test
npm run test:balance
npm run test:traps-balance
```

The development preview wraps the game with the repository's existing Jekyll layout. It is a preview adapter, not a complete Jekyll build. `/__td-qa` provides 320/390/768/1024px iframe widths for layout inspection. Development tools and tests are excluded from Jekyll output. CI runs the dependency-free tests and syntax checks on TD pull requests.

Automated tests cover placement validation, money, upgrades and path locks, all 42 upgrade tiers, five targeting modes, minimum range, armor/status/support rules, regen and bosses, escaped targets, exact kill rewards, stable selection, path movement, pause, restart, loss/victory, waves, early-start limits, firing cadence, speed equivalence across 20/60/120 FPS, production imports and static UI bindings. Sprite checks cover the supplied PNG dimensions/paths, four-frame crops, movement-driven cycles through pause/speed/slow, upright horizontal facing, local smoothing state and unavailable-asset fallback.

### Spike Trap HP verification (2026-10-15)

80 rule, integration, inspector and sprite tests pass, including road-only placement,
money/spacing/gate failures, all enemy types, 100 overlapping enemies, swept
crossings, HP consumption/depletion, sale, restart, pause and identical 1×/2×/3× results at
20/60/120 FPS. Sprite tests cover actual PNG dimensions, frame boundaries,
state selection, aspect ratio, anchors, icon selection, retry and fallback.
The four existing balance bots match the inspected `main` revision `4d951da`
exactly, excluding compute time, including lives, kills, spending and wave results.

Reproducible fixed-defense probes (no reinvestment):

| Defense | Cost | Normal waves cleared | Easy waves cleared |
| --- | --- | --- | --- |
| Four compact traps | 200 | 4 | 5 |
| Three Repeaters | 180 | 6 | 8 |
| Six compact traps | 300 | 4 | 6 |
| Five Repeaters | 300 | 8 | 9 |
| Two traps + two Repeaters | 220 | 6 | 6 |

The 300-credit cases deliberately exceed Normal's starting budget to compare
equal investments. Full mixed campaigns using earned credits, all seven tower
types, 36 upgrades and four supporting traps clear all 30 waves in both modes:
Normal retains 30 lives, Easy 40. Four traps purchased over the campaign
contribute about 962/928 actual damage and are all consumed; the probe retains
their statistics after removal.
These are fixed strategies, not proof of optimal balance or human playtesting.

Native Canvas renders of the actual renderer and original decoded PNG pixels
were inspected at 960/390/320-pixel **battlefield** widths, including
retracted/strike frames, the final hit at 0 HP, ground anchoring, selection,
depletion cleanup and restart. Existing map, river, bridge and ambience modules are unchanged.
This does **not** verify browser CSS, touch input or viewport layout. The available
browser could not access the local preview, so desktop (including 1366×768),
tablet and mobile shop/inspector layout and interactive gameplay still need a
browser pass before merge. No QA harness, screenshots or temporary assets are
included in the repository.

Browser checks performed: startup with the shared site layout, placement, selection, targeting, upgrade, sale while paused, wave start, speed controls, pause overlay and restart. Layout inspected at desktop and at 320/390/768px iframe widths; no horizontal page overflow at those narrow widths. No game JavaScript errors observed. Physical-device touch behavior and sustained mobile rendering performance still need device testing. The full Jekyll/GitHub Pages build remains a deployment-side check.

Start menu checks (2026-10-08): artwork and all five aligned buttons at desktop
and 320/390/768/1024px widths, no horizontal overflow, placeholder clicks, click
and Enter launch, and menu return after page reload. Gameplay was checked after
launch for placement, targeting, upgrades, enemy movement/combat, wave start,
1×/2×/3×, pause, sale and restart. No site JavaScript errors were observed.

Enemy sprite checks (2026-10-08): original goblins in wave 1 and ogres in wave 4,
all four frames drawn from both supplied sheets, nearest-neighbor sampling,
pause/resume, left-facing mirroring and upright vertical travel. The existing
game was checked for menu launch, placement, targeting, upgrades, combat, wave
progression, speed controls, sale and restart. Layout was inspected at desktop
and 320/390/768px iframe widths without horizontal overflow. No game JavaScript
errors or sprite-loading warnings were observed; both PNGs remain byte-for-byte
identical to the repository owner's uploads. Device testing and the production
GitHub Pages build remain deployment/device checks.

Remaining enemy sprite checks (2026-10-08): all eight original sheets loaded
and all four frames drawn through the current renderer, with nearest-neighbor
sampling and aspect-preserving crops. Checked pause/resume, speed controls,
slow effects, horizontal mirroring, upright vertical travel, health/armor/status
overlays and hit feedback. The existing game was checked for menu launch,
placement, targeting, upgrading, mixed-wave combat, selling while paused and
restart. Layout checked at 320/390/768/1024px iframe widths without horizontal
overflow. No game JavaScript errors or sheet-loading warnings were observed.
All eight enemy PNGs match their existing repository bytes; gameplay modules
and hitboxes are unchanged. The comparison fixture is local QA only and is
not part of the shipped game. Physical-device performance and the production
GitHub Pages build still need deployment/device verification.

Deterministic baseline bots use 12 fixed positions and simple spending rules:

| Strategy      | Result           | Core left |
| ------------- | ---------------- | --------- |
| Mixed defense | Clears 30 waves  | 30        |
| Repeater only | Loses on wave 25 | 0         |
| Sniper only   | Clears 30 waves  | 30        |
| Gatling only  | Loses on wave 14 | 0         |

These are regression baselines, not optimal strategies or proof of complete balance. Mixed play peaked at 39 enemies and 9 projectiles in that run. Pure sniper success deserves further playtesting; the bots do not compare all upgrade paths, early starts or placement strategies. Engine timings exclude Canvas rendering and are not browser FPS measurements.

## Art and next steps

In-game art combines procedural Canvas/CSS with the owner's supplied animated sheets for all eight enemy kinds. Mechanical towers, industrial terrain, energy core, muzzle flashes, arcing artillery, hit/death particles, floating rewards and range overlays retain their existing art. The enemy sheets and start menu artwork are documented in `assets/README.md`. No third-party game assets or external fonts were added. The website's existing shared icon integration is unchanged. Future external assets must record source URL, creator, license, attribution requirements and access date before inclusion.

Next useful work: human balance sessions across all specializations, physical mobile testing, more maps, authored sound with a mute setting, save/resume, difficulty options and additional accessibility beyond the current keyboard controls and DOM feedback.
