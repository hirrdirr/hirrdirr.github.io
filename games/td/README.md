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
| Cost | 20 credits (previously 50) |
| Damage | 12 physical damage/s **only during overlap**, replacing the 32-damage entry burst |
| Tick rate | Existing 60 Hz simulation; 0.2 raw damage for a full 1/60 s overlap, fractional entry/exit ticks |
| Slow | 10% only on the footprint; strongest slow wins and existing enemy slow resistance applies |
| HP | 5 (previously 10); each new passage spends 1 HP, buying up to 1 second of contact |
| Prolonged contact | Another HP per additional second; unused time is discarded on departure/death |
| Cooldown / refill | None |
| Depletion | Finish already-paid overlap at 0 unspent HP, then retract/remove after 0.24 s |
| Sale refund | 70% of unspent HP value, rounded down (14 unused, 11 at 4 HP) |
| Contact | Unchanged 28-world-pixel interval along the route, centered on the trap |
| Placement | Road only, snapped to its center; clicks up to 26 pixels from it |
| Separation | At least 44 pixels both along the route and in world space |
| Entrance/core clearance | 48 route pixels from either end |
| Upgrades / targeting / relay bonuses | None |

The trap is a disposable leak catcher. It starts retracted, stays raised while
it deals overlap damage, then uses the existing 0.24-second retraction poses.
Its source PNG, crops, scale, road footprint and spacing are unchanged.

Damage integrates the actual swept overlap fraction of each simulation step,
including fast crossings and bends. Slow is separate from tower status effects:
it does not overwrite Frostlink, multiply with other slows, or linger after
leaving/selling/depletion. Entry/exit movement is resolved at the existing 1/60 s
step precision; no timed slow grace is attached to the enemy.

Each contact reserves its own HP, with arrival order and enemy ID breaking ties.
Only five new enemies can receive damage simultaneously from a fresh trap.
A stalled enemy also consumes HP every second, limiting a trap to at most five
paid enemy-seconds / 60 raw damage before the usual armor/vulnerability rules.
The final paid contact continues even at 0 unspent HP; it cannot admit new
contacts. Spent HP is never refunded or regenerated. Pause freezes contact time,
HP and animation; restart clears the contact map and all traps.

The economy follows the cheapest tower: a 20-credit trap costs one third of a
60-credit Repeater. At 58 px/s, a normal enemy spends approximately
28 / (58 × 0.9) = 0.536 s on the trap, taking about 6.4 damage—less than one
7-damage Repeater shot. Five contacts normally deliver about 32 total damage;
a Repeater provides 19.6 sustained DPS across successive waves. Fast/swift
enemies take about 3.9/2.5 damage. Armor, boss pulses, vulnerability, regeneration,
kill rewards and damage attribution still use the existing combat pipeline.

Spacing, all seven towers, upgrades, waves, enemies, difficulties and map art
remain unchanged. Sprite state details are in
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

### Spike Trap utility verification (2026-10-15)

The old 32-damage, ten-contact trap killed all ten first-wave enemies on Easy
(31.16 HP each), and dealt 320 damage on Normal. Trials of **16 DPS** and then
**12 DPS** used the real engine, waves, enemies and live free-placement rules.
At 16 DPS, four traps could kill five fresh Easy drones; at 12 DPS the same
four traps kill none. The lower value still catches the tested weak leaks.

All 87 automated tests pass. Reproduce with `npm test`, `npm run test:balance` and
`npm run test:traps-balance`. Dedicated gameplay regressions verify:

- **Wave 1 alone:** one trap kills **0**, all **10 leak**, on Normal and Easy,
  at entrance/bend/exit placements and 1×/2×/3×. It damages five enemies for
  about **32.2 / 33.5** total and depletes. Lives end at 20 / 30; the wave ends
  because enemies escape, not because the defense succeeds.
- **Actual tower-damaged leaks:** on wave 2, Repeaters at (200,240) and (500,220)
  leak 4 enemies on Normal / 1 on Easy. Adding a trap 60 route pixels before
  the core catches one low-HP enemy: leaks become **3 / 0**, for 20 extra credits.
  No enemy HP is manually edited in this probe.
- **Three traps / 60 credits:** no fresh wave-1 kills in either difficulty.
  Duplicate/overlapping placements and corner spacing are rejected as before.
- All eight enemy kinds in all three campaign acts survive a full-health
  passage. Normal first-act damage is approximately 6.4 drone, 3.9 fast,
  2.5 swift, 9.1 tank, 3.1 armored, 5.5 regen and 4.5 elite. Boss damage depends
  on its normal armor-pulse phase (roughly 6.2–8.7), and its effective slow is 3.5%.
- 100 overlapping enemies, continuous stationary contact, depletion during
  contact, fractional swept damage, armor, vulnerability, regen recovery,
  stronger tower slows, refunds, pause/restart and exact speed equivalence at
  20/60/120 rendering FPS are covered. Spikes stay raised during paid contact.

Fixed-budget strategies, no reinvestment (nearest legal compact road positions):

| Credits | Defense | Normal waves ended before defeat | Easy waves ended before defeat |
| --- | --- | --- | --- |
| 60 | Three traps | 2 | 3 |
| 60 | One Repeater | 3 | 4 |
| 180 | Nine traps | 3 | 3 |
| 180 | Three Repeaters | 6 | 8 |
| 300 | Fifteen traps | 3 | 4 |
| 300 | Five Repeaters | 8 | 9 |

Wave counts include escaped enemies, so they are **not** perfect-defense counts.
All traps in these probes are consumed; even a large trap purchase does not
provide sustained defense. Enough consecutive traps can still kill healthy
enemies, but need continued repurchases and are inferior in these equal-budget
probes. These strategies do not prove optimal balance or rule out every exploit.

Full mixed campaigns with all seven tower kinds, 36 upgrades and four traps
clear all 30 waves with 30 / 40 lives. Traps contribute about 82 / 86 actual
damage. The four existing tower-only balance scenarios match baseline main
`22ccfcc` exactly, excluding compute time.

Gameplay snapshots use the actual native Canvas renderer and original PNG
pixels for solo wave 1 and rear-trap wave 2, including idle/contact/depletion,
pause/restart and battlefield widths 960/768/390/320. This is **not** browser
CSS, pointer/touch or viewport validation. Interactive local preview is blocked
by the cloud browser security policy, so an interactive browser pass remains
before merge. No QA harness, screenshots or temporary assets are committed.

Historical browser checks (before the Spike Trap utility rebalance): startup with the shared site layout, placement, selection, targeting, upgrade, sale while paused, wave start, speed controls, pause overlay and restart. Layout inspected at desktop and at 320/390/768px iframe widths; no horizontal page overflow at those narrow widths. No game JavaScript errors observed. Physical-device touch behavior and sustained mobile rendering performance still need device testing. The full Jekyll/GitHub Pages build remains a deployment-side check.

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
