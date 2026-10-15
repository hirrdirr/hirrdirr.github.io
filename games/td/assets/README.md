# Core Defense assets

This directory is the canonical home for visual and audio-ready game assets used by `games/td`.

## Directory structure

- `environment/vegetation/` — bushes, grass, trees and other foliage
- `environment/rocks/` — stones, cliffs and rock props
- `environment/lights/` — lamps, torches and other light-source sprites
- `environment/props/` — crates, barrels, pipes, fences and miscellaneous map props
- `towers/` — tower sprites and tower-specific visual assets
- `enemies/` — enemy and boss sprites
- `projectiles/` — bullets, missiles, beams and other projectile sprites
- `effects/` — explosions, hit effects, particles and temporary visual effects
- `maps/` — map-specific backgrounds, tiles, overlays and decorative layers
- `ui/` — icons and game UI artwork

## Naming convention

Use lowercase snake_case names and keep related variants numbered consistently.

Examples:

- `bush_01.png`
- `bush_02.png`
- `rock_large_01.png`
- `lamp_warm_01.png`
- `tower_sniper_01.png`
- `enemy_tank_01.png`
- `projectile_plasma_01.png`
- `effect_explosion_01.png`

Avoid filenames such as `final.png`, `new2.png` or `bush-final-final.png`.

## Asset workflow

1. New TD graphics should be placed in this directory rather than beside the game code.
2. Reuse an existing asset when it fits before introducing a near-duplicate.
3. Keep assets from the same visual set/style together so maps remain visually coherent.
4. Prefer transparent PNG/WebP/SVG where appropriate. Pixel-art sprites should keep hard edges and should not be unintentionally smoothed when rendered.
5. Map-specific art belongs in `maps/`; reusable scenery belongs in `environment/`.
6. When adding third-party assets, verify the license and keep attribution/license notes alongside the relevant asset pack when required.
7. Do not move or rename existing runtime files solely for organization unless their imports/references are updated and tested in the same change.

## Future graphics work

When changing the game's visuals, treat this folder as the default asset library. New bushes, lights, animated props, towers, enemies, map decorations and UI graphics should be added here and referenced from the renderer/game code as needed.

The folder structure itself does not change current game behavior; it is intentionally safe to introduce before new graphical assets are added.

## Start menu artwork

`ui/core_defense_menu_01.png` is the original 1672 × 941 Core Defense menu artwork
provided by the repository owner on 2026-10-08 as `Core Defense_ Meadow Path.png`.
The supplied PNG is used unchanged; no third-party assets were fetched for this menu.

`ui/MainMenu.png` is the repository owner's replacement 1672 × 941 menu artwork.
It is used unchanged, with its exact filename and case preserved. The earlier
`core_defense_menu_01.png` is retained but no longer used by the menu.

The title and lower decorative frame belong to the image. Start Game, Options,
Back to Site, and the labeled Map/Difficulty dropdowns are real HTML controls.
`../menu.css` positions them in percentages of the artwork, with container units
for sizing. Small screens crop the outer scenery while keeping the central logo
and controls visible. All menu styles are scoped to `.td-menu`.

`../menu.js` lists playable maps in `MAPS` and reads difficulty choices directly
from `../js/difficulty.js`. Difficulty is saved in the existing `tdDifficulty`
session setting used by game startup. Options shares the same selection and
explains its starting resources. The game still initializes only on Start Game.
No third-party assets were downloaded for the replacement menu.

`ui/relay_station_preview.svg` is original project artwork: a small overhead
preview of the existing Relay Station route and core, drawn in SVG. Each `MAPS`
entry supplies its preview path. The lower frame pairs that thumbnail with
stacked labels, gold map text and green difficulty text with an original inline
SVG skull; the controls remain native HTML dropdowns.

## Tower sprites

The repository owner's seven uploaded PNGs are used unchanged. Runtime paths
match each existing tower display name, preserving filename case and accents:

| File | Existing tower kind | Draw size, world pixels |
| --- | --- | --- |
| `towers/Repeater_4f.png` | `repeater` | 34.5 × 46 |
| `towers/Långskott_4f.png` | `sniper` | 36 × 48 |
| `towers/Bastion_4f.png` | `cannon` | 37.5 × 50 |
| `towers/Nova_4f.png` | `mortar` | 36 × 48 |
| `towers/Frostlänk_4f.png` | `cryo` | 36 × 48 |
| `towers/Gatling_4f.png` | `gatling` | 36 × 48 |
| `towers/Relä_4f.png` | `relay` | 36 × 48 |

Each sheet is 2172 × 724, containing four 543 × 724 frames in one row.
`../js/tower-sprites.js` maps names to files, validates dimensions and controls
presentation. Scaling is uniform and nearest-neighbor, centered on the existing
placement position. Combat and placement geometry are unchanged.

The idle frame is 0. Existing recoil selects firing frame 2, recovery frame 3,
then frame 1 before returning to idle; pause and speed need no new animation clock.
Shop and inspector icons use the intact idle frame and repaint after loading.
Placement previews share the battlefield renderer. Loaded sprites completely
bypass the original procedural tower art; loading failures retain that fallback.

The stone bases remain upright. `AIM_PARTS` defines source regions and pivots for
the moving weapon or crystal, and a source-facing angle to align with the existing
engine aim. Repeater and Långskott face left, Bastion up-left, Gatling right, and
the Nova/Frostlänk crystals up. Only these source pixels rotate and recoil;
Relä remains stationary. The source image is never edited. Upgrade statistics,
selection outlines and range overlays still use the existing game systems.
No third-party assets were downloaded for this integration.

## Spike Trap

`towers/spiketrap-sprite-sheet.png` is the repository owner's unchanged RGBA PNG,
2172 × 724 pixels. It contains four separate drawings in a single horizontal row,
from intact raised spikes to a low, spent/worn base. It is **not** four clean
543-pixel-wide cells: the first drawing extends past that boundary. There is no
separate attack row. No replacement artwork is generated.

`../js/trap-sprites.js` uses these measured source rectangles (zero-based pixels):

| Frame | x | y | Width | Height | Draw size in world pixels |
| --- | --- | --- | --- | --- | --- |
| 0 · intact / raised | 55 | 127 | 534 | 485 | 38 × 34.51 |
| 1 · partly spent | 609 | 178 | 489 | 429 | 34.80 × 30.53 |
| 2 · low spikes | 1129 | 267 | 497 | 344 | 35.37 × 24.48 |
| 3 · low base | 1646 | 382 | 507 | 227 | 36.08 × 16.15 |

Alpha > 16/255 gives exclusive artwork bounds (57,129)–(587,610),
(611,180)–(1096,605), (1131,269)–(1624,609), (1648,384)–(2151,607).
Each crop adds two pixels around those bounds; almost invisible alpha specks
elsewhere are omitted so they cannot shrink the visible object or bleed between
drawings. Source pixels, resolution and file bytes remain unchanged.

All frames use the **same uniform scale**, 38/534. Each crop is horizontally
centered and vertically registered to source ground y=525, so its base does not
jump when the artwork height changes. No frame is stretched to match another.
The maximum visible size is 38 × 34.51 world pixels; the base sits about 6 pixels
below the placement point, inside the road. A subtle ground shadow and a small
remaining-HP bar are presentation overlays. Sampling is nearest-neighbor, consistent
with the supplied pixel-styled art and current tower/enemy rendering, and is
restored after each draw.

| Gameplay state | Frame mapping |
| --- | --- |
| Retracted/idle and placement preview | 3 (lowest supplied pose) |
| During paid overlap and first 0–0.12 s after it | 0 (raised) |
| Retraction, 0.12–0.20 s after contact | 1 |
| Retraction, 0.20–0.24 s after contact | 2 |
| Idle 0.24 s after contact | 3 |
| Static shop/inspector icon | 0 (most legible intact frame) |
| Final paid contact at 0 unspent HP | Stay raised during paid overlap, then retract and remove |

These are state poses made from the supplied wear/spent drawings, not a claim
that the sheet contains a purpose-authored retracting-spike animation. The lowest
pose represents the retracted trap; overlap holds the intact raised pose, then
steps down after contact ends. The original PNG, crops, ground anchor and scale
are unchanged. Each damage tick refreshes the pose; **animation is not a
cooldown** and does not gate combat. The 0.24-second retraction and final
removal use simulation time, so pause/speed/restart remain synchronized. The
small ground bar and inspector meter show remaining HP, not elapsed time.

The asset loads once, validates exact dimensions and retries one network failure.
No procedural substitute flashes while it is loading. Only a confirmed failure
or wrong-sized image enables a minimal emergency base/spike fallback, with a
console warning; shop icons repaint when loading finishes. The map, shop,
inspector and placement preview all share this loader and artwork.

## Enemy walk sprites

The repository owner's supplied sheets are used unchanged:

| File | Existing enemy kind | Frame size (four in one row) | Draw size, world pixels | Stride, pixels/frame |
| --- | --- | --- | --- | --- |
| `enemies/goblin_walk_4f.png` | `normal` (basic) | 192 × 192 | 36 × 36 | 8 |
| `enemies/fast_goblin_runner_4f.png` | `fast` | 543 × 724 | ≈47 × 34 | 10 |
| `enemies/swift_goblin_scout_4f.png` | `swift` | 543 × 724 | ≈40 × 30 | 12 |
| `enemies/ogre_walk_4f.png` | `tank` (brute) | 256 × 256 | 52 × 52 | 7 |
| `enemies/armored_orc_4f.png` | `armored` | 543 × 724 | ≈50 × 44 | 9 |
| `enemies/regen_goblin_shaman_4f.png` | `regen` | 543 × 724 | ≈46 × 38 | 9 |
| `enemies/elite_orc_brute_4f.png` | `elite` | 543 × 724 | ≈54 × 58 | 9 |
| `enemies/boss_ogre_warlord_4f.png` | `boss` | 543 × 724 | ≈71 × 78 | 7 |

`../js/enemy-sprites.js` owns asset paths, frame geometry, draw sizes and stride.
The six newer sheets are each 2172 × 724 pixels. Their per-kind `crop` removes
excess transparent padding while keeping a fixed source rectangle across all
four frames: fast y=192/h=392, swift y=184/h=408, armored y=144/h=480,
regen y=144/h=448, elite y=96/h=584 and boss y=72/h=600. All use the full
543-pixel frame width. Cropping and scaling happen only in Canvas; PNGs are
not edited. `size` is the cropped frame's draw height; width preserves its
aspect ratio. The original square goblin/ogre draws remain unchanged.

At base speeds, normal/fast/swift/tank/armored/regen/elite/boss animate at about
7.3/9.6/12.3/5.3/6.0/7.2/5.8/4.0 frames per second. Movement-driven cycles respond
automatically to pause, speed controls and slow effects. Sprites remain upright,
flip horizontally when moving left, and keep their facing on vertical segments.
Canvas smoothing is disabled only for the sprite draw; source PNGs and gameplay
hitboxes are unchanged. Health, armor and status indicators remain in the
existing renderer and surround the scaled sprites.

To add another compatible horizontal sheet, add an entry keyed by the existing
enemy kind in `ENEMY_SPRITES`; optionally supply a `crop` with x/y/width/height
to trim frame padding without changing the image. Omitted crop fields use the
full frame. Images load once, validate their dimensions and
fall back to procedural art if loading fails. No third-party art was downloaded
for this integration.
