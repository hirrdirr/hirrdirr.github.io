# Core Defense · v2

A 30-wave tower defense campaign at `/games/td/`, built with native JavaScript modules, Canvas and CSS. Production remains a static Jekyll page; no bundler, npm dependencies or server are required to play.

## Play

Build beside the road, protect the core and survive wave 30. Select a placed tower to inspect, upgrade, change targeting or sell it. Mouse placement is immediate; touch placement uses a separate **Bygg här** confirmation. Keyboard: 1–7 selects a tower, arrows on the focused board move the cursor, Enter builds/selects, Escape cancels, Space pauses, R toggles ranges. Shift allows repeated placement.

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

## Structure

- `td.js`: browser entry point, pointer/keyboard input, resize/visibility handling and animation scheduling.
- `js/data.js`: tower/enemy definitions, upgrade prices and stat calculation.
- `js/map.js`: grid, blocked cells and distance-based path geometry.
- `js/waves.js`: authored wave schedule, previews and scaling.
- `js/engine.js`: DOM-independent simulation, validated game commands and events. Stable IDs identify towers/enemies; selection never relies on array indices.
- `js/renderer.js`: Canvas art, cached terrain, indicators and bounded visual effects.
- `js/ui.js`: HUD, shop, inspector, dialogs and accessible feedback. The inspector replaces the shop while inspecting a tower.
- `td.css`: scoped responsive styling with reduced-motion support.

The simulation advances at 60 fixed steps per simulated second. A clock accumulator preserves consistent results at 1×/2×/3× and different rendering rates, caps long frames and drops excess real time after stalls. Projectiles retain target IDs and source ownership; dead or escaped targets cannot pay rewards twice. Rendering uses device-pixel-ratio scaling, a cached background and capped effects; DOM statistics refresh at 10 Hz.

Add content through the data/wave definitions. Add new combat mechanics to the engine and corresponding rule tests; keep presentation and particles in the renderer. Avoid adding browser dependencies to the engine.

## Development and checks

Use Node 24:

```sh
npm ci
npm run dev
npm test
npm run test:balance
```

The development preview wraps the game with the repository's existing Jekyll layout. It is a preview adapter, not a complete Jekyll build. `/__td-qa` provides 320/390/768/1024px iframe widths for layout inspection. Development tools and tests are excluded from Jekyll output. CI runs the dependency-free tests and syntax checks on TD pull requests.

23 automated tests cover placement validation, money, upgrades and path locks, all 42 upgrade tiers, five targeting modes, minimum range, armor/status/support rules, regen and bosses, escaped targets, exact kill rewards, stable selection, path movement, pause, restart, loss/victory, waves, early-start limits, firing cadence, speed equivalence across 20/60/120 FPS, production imports and static UI bindings.

Browser checks performed: startup with the shared site layout, placement, selection, targeting, upgrade, sale while paused, wave start, speed controls, pause overlay and restart. Layout inspected at desktop and at 320/390/768px iframe widths; no horizontal page overflow at those narrow widths. No game JavaScript errors observed. Physical-device touch behavior and sustained mobile rendering performance still need device testing. The full Jekyll/GitHub Pages build remains a deployment-side check.

Deterministic baseline bots use 12 fixed positions and simple spending rules:

| Strategy      | Result           | Core left |
| ------------- | ---------------- | --------- |
| Mixed defense | Clears 30 waves  | 30        |
| Repeater only | Loses on wave 25 | 0         |
| Sniper only   | Clears 30 waves  | 30        |
| Gatling only  | Loses on wave 14 | 0         |

These are regression baselines, not optimal strategies or proof of complete balance. Mixed play peaked at 39 enemies and 9 projectiles in that run. Pure sniper success deserves further playtesting; the bots do not compare all upgrade paths, early starts or placement strategies. Engine timings exclude Canvas rendering and are not browser FPS measurements.

## Art and next steps

All new game art is original procedural Canvas/CSS: mechanical towers and attackers, industrial terrain, energy core, muzzle flashes, arcing artillery, hit/death particles, floating rewards and animated range overlays. No external game assets, copied sprites or external fonts were added. The website's existing shared icon integration is unchanged. Future external assets must record source URL, creator, license, attribution requirements and access date before inclusion.

Next useful work: human balance sessions across all specializations, physical mobile testing, more maps, authored sound with a mute setting, save/resume, difficulty options and additional accessibility beyond the current keyboard controls and DOM feedback.
